import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * GDPR — müşteri veri talebi (zorunlu webhook).
 * ScratchCart yalnızca anonim oturum kimliği, sepet jetonu ve ödül kaydı tutar;
 * ad, e-posta veya adres saklamaz. Talep edilen müşteriye ait kayıtlar
 * loglanır ve satıcıya 30 gün içinde iletilmek üzere hazırlanır.
 */
export async function action({ request }: ActionFunctionArgs) {
  const { shop, payload, topic } = await authenticate.webhook(request);
  const body = payload as any;

  const shopRecord = await prisma.shop.findUnique({ where: { shopDomain: shop } });
  const customerId = body?.customer?.id ? String(body.customer.id) : null;

  const records = shopRecord && customerId
    ? await prisma.scratch.findMany({
        where: { shopId: shopRecord.id, customerId },
        select: {
          id: true,
          displayedAt: true,
          tierWon: true,
          discountCode: true,
          orderId: true,
          deviceType: true,
        },
      })
    : [];

  console.log(
    `[scratchcart] ${topic}`,
    JSON.stringify({
      shop,
      customerId,
      recordCount: records.length,
      dataRequestId: body?.data_request?.id ?? null,
      records,
    }),
  );

  return new Response();
}
