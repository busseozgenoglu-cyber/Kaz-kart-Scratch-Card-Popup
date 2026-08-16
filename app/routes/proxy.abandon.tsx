import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { json, tooManyRequests } from "~/lib/cors.server";
import { clientKey, rateLimit } from "~/lib/rate-limit.server";
import { getShopByDomain } from "~/lib/shop.server";
import { recordEvent } from "~/lib/analytics.server";

/** POST /apps/scratchcart/abandon — bilet kazınmadan kapatıldı. */
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session?.shop) return json({ ok: false }, { status: 401 });

  const limit = rateLimit(clientKey(request, session.shop, "abandon"), 20, 60_000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  const shop = await getShopByDomain(session.shop);
  if (!shop) return json({ ok: false }, { status: 404 });

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const sessionId = String(body.sessionId ?? "").slice(0, 64);
  if (!sessionId) return json({ ok: false }, { status: 400 });

  const scratch = await prisma.scratch.findFirst({
    where: { shopId: shop.id, sessionId, completedAt: null, abandonedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (scratch) {
    await prisma.scratch.update({
      where: { id: scratch.id },
      data: { abandonedAt: new Date() },
    });
    await recordEvent(shop.id, { abandonments: 1 });
  }

  return json({ ok: true });
}
