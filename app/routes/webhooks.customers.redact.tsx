import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * GDPR — müşteri verisi silme talebi (zorunlu webhook).
 * Müşteriye bağlanabilecek tüm alanlar geri döndürülemez şekilde temizlenir.
 * Toplam sayılar (Analytics) kişisel veri içermediği için korunur.
 */
export async function action({ request }: ActionFunctionArgs) {
  const { shop, payload, topic } = await authenticate.webhook(request);
  const body = payload as any;
  const customerId = body?.customer?.id ? String(body.customer.id) : null;
  const orderIds: string[] = (body?.orders_to_redact ?? []).map(String);

  const shopRecord = await prisma.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) return new Response();

  const result = await prisma.scratch.updateMany({
    where: {
      shopId: shopRecord.id,
      OR: [
        ...(customerId ? [{ customerId }] : []),
        ...(orderIds.length ? [{ orderId: { in: orderIds } }] : []),
      ],
    },
    data: {
      customerId: null,
      cartToken: null,
      country: null,
      deviceType: null,
      sessionId: "redacted",
    },
  });

  console.log(
    `[scratchcart] ${topic}`,
    JSON.stringify({ shop, customerId, redacted: result.count }),
  );

  return new Response();
}
