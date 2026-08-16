import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * GDPR — mağaza verisi silme talebi (zorunlu webhook).
 * Kaldırmadan 48 saat sonra Shopify bu isteği gönderir.
 * İlişkili tüm kayıtlar Prisma'daki onDelete: Cascade ile birlikte silinir.
 */
export async function action({ request }: ActionFunctionArgs) {
  const { shop, topic } = await authenticate.webhook(request);

  await prisma.session.deleteMany({ where: { shop } });
  const deleted = await prisma.shop.deleteMany({ where: { shopDomain: shop } });

  console.log(
    `[scratchcart] ${topic}`,
    JSON.stringify({ shop, shopsDeleted: deleted.count }),
  );

  return new Response();
}
