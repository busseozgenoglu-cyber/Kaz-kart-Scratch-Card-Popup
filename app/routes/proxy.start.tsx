import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { json, tooManyRequests } from "~/lib/cors.server";
import { clientKey, rateLimit } from "~/lib/rate-limit.server";
import { getShopByDomain } from "~/lib/shop.server";
import { recordEvent } from "~/lib/analytics.server";

/** POST /apps/scratchcart/start — bilet ekranda göründü. */
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session?.shop) return json({ ok: false }, { status: 401 });

  const limit = rateLimit(clientKey(request, session.shop, "start"), 20, 60_000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  const shop = await getShopByDomain(session.shop);
  if (!shop?.settings) return json({ ok: false }, { status: 404 });

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const sessionId = String(body.sessionId ?? "").slice(0, 64);
  if (!sessionId) return json({ ok: false, error: "missing_session" }, { status: 400 });

  await prisma.scratch.create({
    data: {
      shopId: shop.id,
      sessionId,
      cartToken: body.cartToken ? String(body.cartToken).slice(0, 128) : null,
      cartValueBefore: numberOrNull(body.cartValue),
      currency: body.currency ? String(body.currency).slice(0, 8) : shop.currency,
      deviceType: body.deviceType ? String(body.deviceType).slice(0, 16) : null,
      country: request.headers.get("cf-ipcountry")?.slice(0, 2) ?? null,
    },
  });

  await recordEvent(shop.id, {
    displays: 1,
    cartValueTotal: Number(body.cartValue ?? 0),
  });

  return json({ ok: true });
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
