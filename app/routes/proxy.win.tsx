import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { json, tooManyRequests } from "~/lib/cors.server";
import { clientKey, rateLimit } from "~/lib/rate-limit.server";
import { getShopByDomain } from "~/lib/shop.server";
import { recordEvent } from "~/lib/analytics.server";
import { createDiscountForTier, DiscountError } from "~/lib/discount.server";
import {
  checkQuota,
  consumeQuota,
  determineTier,
  FREE_PLAN_TIERS,
  tierLabel,
  tierValues,
  TIERS,
  type Tier,
} from "~/lib/scratch-engine.server";

/**
 * POST /apps/scratchcart/win
 * Çekiliş yalnızca burada yapılır. İstemci hangi ödülün çıkacağını bilemez,
 * yönlendiremez ve aynı oturumda ikinci kez kod alamaz.
 */
export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session?.shop || !admin) {
    return json({ ok: false, error: "unknown" }, { status: 401 });
  }

  const limit = rateLimit(clientKey(request, session.shop, "win"), 8, 60_000);
  if (!limit.allowed) {
    return json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const shop = await getShopByDomain(session.shop);
  if (!shop?.settings) return json({ ok: false, error: "unknown" }, { status: 404 });

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const sessionId = String(body.sessionId ?? "").slice(0, 64);
  if (!sessionId) {
    return json({ ok: false, error: "unknown" }, { status: 400 });
  }

  const settings = shop.settings;

  // Sepet alt sınırı sunucuda yeniden doğrulanır; istemciye güvenilmez.
  const cartValue = Number(body.cartValue ?? 0);
  if (cartValue < Number(settings.minCartValue ?? 0)) {
    return json({ ok: false, error: "cart_too_small" }, { status: 422 });
  }

  // Aynı oturum daha önce kazandıysa aynı kodu geri döndür (tekrar üretme).
  const previousWin = await prisma.scratch.findFirst({
    where: { shopId: shop.id, sessionId, discountCode: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  if (previousWin?.discountCode && previousWin.tierWon) {
    return json({
      ok: true,
      code: previousWin.discountCode,
      tier: previousWin.tierWon,
      label: tierLabel(
        previousWin.tierWon as Tier,
        settings.language,
        tierValues(settings),
      ),
      validMinutes: settings.discountValidMinutes,
      replayed: true,
    });
  }

  const quota = await checkQuota(shop.id);
  if (!quota.allowed) {
    return json({ ok: false, error: "quota_exceeded" }, { status: 429 });
  }

  const allowed = quota.plan === "free" ? FREE_PLAN_TIERS : [...TIERS];
  const tier = determineTier(settings, allowed);

  let discount;
  try {
    discount = await createDiscountForTier({
      admin,
      shopId: shop.id,
      tier,
      settings,
    });
  } catch (error) {
    // Sessiz başarısızlık yok: hata loglanır ve müşteriye net bir mesaj döner.
    // Shopify HTTP hatalarında (ör. 403) gövde boş gelebiliyor; teşhis için
    // yanıtın durum kodu ve başlıkları da loglanır — asıl sebep genelde
    // `www-authenticate` / `x-request-id` başlıklarında görünür.
    const httpResponse = (error as { response?: Record<string, unknown> })
      ?.response;

    // GEÇİCİ TEŞHİS: aynı token'la basit bir OKUMA sorgusu dene. Bu da 403
    // alıyorsa sorun token/uygulama yetkisindedir; yalnızca mutation 403
    // alıyorsa sorun kapsam veya mutation'a özgüdür.
    let probe: string;
    try {
      const probeResponse = await admin.graphql("{ shop { name } }");
      const probeBody = await probeResponse.json();
      probe = `ok status=${probeResponse.status} shop=${
        (probeBody as { data?: { shop?: { name?: string } } })?.data?.shop?.name
      }`;
    } catch (probeError) {
      const probeHttp = (probeError as { response?: { code?: number } })
        ?.response;
      probe = `FAILED status=${probeHttp?.code} message=${
        probeError instanceof Error ? probeError.message : String(probeError)
      }`;
    }
    console.error("[scratchcart] teşhis: shop okuma sorgusu →", probe);
    console.error(
      "[scratchcart] indirim oluşturulamadı",
      JSON.stringify({
        shop: session.shop,
        tier,
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof DiscountError ? error.details : undefined,
        http: httpResponse
          ? {
              code: httpResponse.code ?? httpResponse.status,
              statusText: httpResponse.statusText,
              headers: httpResponse.headers,
              body: httpResponse.body,
            }
          : undefined,
      }),
    );
    return json({ ok: false, error: "discount_failed" }, { status: 502 });
  }

  const scratch = await prisma.scratch.findFirst({
    where: { shopId: shop.id, sessionId, discountCode: null },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  if (scratch) {
    await prisma.scratch.update({
      where: { id: scratch.id },
      data: {
        scratchedAt: scratch.scratchedAt ?? now,
        completedAt: now,
        tierWon: tier,
        discountCode: discount.code,
        discountValue: discount.value,
        cartValueBefore: scratch.cartValueBefore ?? cartValue,
      },
    });
  } else {
    await prisma.scratch.create({
      data: {
        shopId: shop.id,
        sessionId,
        cartToken: body.cartToken ? String(body.cartToken).slice(0, 128) : null,
        scratchedAt: now,
        completedAt: now,
        tierWon: tier,
        discountCode: discount.code,
        discountValue: discount.value,
        cartValueBefore: cartValue,
      },
    });
  }

  await prisma.discountCode.updateMany({
    where: { code: discount.code },
    data: { scratchId: scratch?.id ?? null },
  });

  await Promise.all([
    consumeQuota(shop.id),
    recordEvent(shop.id, { scratches: 1, completions: 1, tier }),
  ]);

  return json({
    ok: true,
    code: discount.code,
    tier,
    label: tierLabel(tier, settings.language, tierValues(settings)),
    validMinutes: settings.discountValidMinutes,
  });
}
