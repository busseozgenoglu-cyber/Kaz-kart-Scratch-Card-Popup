import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { recordEvent } from "~/lib/analytics.server";

/**
 * Sipariş oluştuğunda ScratchCart kodu kullanılmış mı diye bakar.
 * Eşleşme iki yoldan aranır: indirim kodu ve sepete yazılan gizli öznitelik.
 * Böylece müşteri kodu elle girmiş olsa bile kurtarma doğru sayılır.
 */
export async function action({ request }: ActionFunctionArgs) {
  const { shop, payload, topic } = await authenticate.webhook(request);
  console.log(`[scratchcart] ${topic} alındı: ${shop}`);

  const order = payload as any;
  const shopRecord = await prisma.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) return new Response();

  const codes: string[] = (order.discount_codes ?? [])
    .map((entry: any) => String(entry?.code ?? "").toUpperCase())
    .filter((code: string) => code.startsWith("SC"));

  const attributeCode = (order.note_attributes ?? []).find(
    (attribute: any) => attribute?.name === "_scratchcart_code",
  )?.value;

  if (attributeCode) codes.push(String(attributeCode).toUpperCase());

  if (!codes.length) return new Response();

  const scratch = await prisma.scratch.findFirst({
    where: {
      shopId: shopRecord.id,
      discountCode: { in: codes },
      convertedToOrder: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!scratch) return new Response();

  const orderValue = Number(order.total_price ?? 0);
  const discountGiven = Number(order.total_discounts ?? 0);

  await prisma.scratch.update({
    where: { id: scratch.id },
    data: {
      convertedToOrder: true,
      orderId: String(order.id),
      orderValue,
      cartValueAfter: orderValue,
      recoveredAt: new Date(),
      currency: order.currency ?? scratch.currency,
    },
  });

  await prisma.discountCode.updateMany({
    where: { code: { in: codes }, shopId: shopRecord.id },
    data: { isUsed: true, usedAt: new Date() },
  });

  await recordEvent(shopRecord.id, {
    conversions: 1,
    revenueTotal: orderValue,
    discountTotal: discountGiven,
  });

  return new Response();
}
