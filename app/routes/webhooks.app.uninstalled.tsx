import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

/**
 * Uygulama kaldırıldığında oturumlar hemen silinir, mağaza pasife alınır.
 * Analitik kayıtları 30 gün saklanır (yeniden kurulumda geçmiş kaybolmasın),
 * ardından shop/redact webhook'u ile tamamen temizlenir.
 */
export async function action({ request }: ActionFunctionArgs) {
  const { shop, session, topic } = await authenticate.webhook(request);
  console.log(`[scratchcart] ${topic} alındı: ${shop}`);

  if (session) {
    await prisma.session.deleteMany({ where: { shop } });
  }

  await prisma.shop.updateMany({
    where: { shopDomain: shop },
    data: { isActive: false, uninstalledAt: new Date() },
  });

  return new Response();
}
