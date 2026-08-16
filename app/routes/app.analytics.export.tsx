import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { ensureShop } from "~/lib/shop.server";
import { daysAgo, startOfDay, toCsv } from "~/lib/analytics.server";

/** GET /app/analytics/export?range=30&type=daily|scratches */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await ensureShop(session.shop);

  const url = new URL(request.url);
  const range = Math.min(365, Math.max(1, Number(url.searchParams.get("range") ?? 30)));
  const type = url.searchParams.get("type") === "scratches" ? "scratches" : "daily";
  const from = daysAgo(range - 1);

  let rows: Record<string, unknown>[];
  let filename: string;

  if (type === "daily") {
    const daily = await prisma.analytics.findMany({
      where: { shopId: shop.id, date: { gte: from } },
      orderBy: { date: "asc" },
    });
    rows = daily.map((row) => ({
      Tarih: row.date.toISOString().slice(0, 10),
      Gosterim: row.displays,
      Kazima: row.scratches,
      Tamamlanan: row.completions,
      Kurtarilan: row.conversions,
      Kapatilan: row.abandonments,
      "Kurtarilan ciro": Number(row.revenueTotal ?? 0).toFixed(2),
      "Verilen indirim": Number(row.discountTotal ?? 0).toFixed(2),
      "Kargo bedava": row.freeShippingCount,
      "Yuzde 10": row.percent10Count,
      "Yuzde 15": row.percent15Count,
      "Yuzde 20": row.percent20Count,
    }));
    filename = `scratchcart-gunluk-${range}gun.csv`;
  } else {
    const scratches = await prisma.scratch.findMany({
      where: { shopId: shop.id, createdAt: { gte: startOfDay(from) } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    rows = scratches.map((row) => ({
      Tarih: row.createdAt.toISOString(),
      Odul: row.tierWon ?? "",
      Kod: row.discountCode ?? "",
      "Sepet tutari": Number(row.cartValueBefore ?? 0).toFixed(2),
      "Siparise donustu": row.convertedToOrder ? "Evet" : "Hayir",
      "Siparis tutari": Number(row.orderValue ?? 0).toFixed(2),
      "Para birimi": row.currency,
      Cihaz: row.deviceType ?? "",
      Durum: row.abandonedAt ? "Kapatildi" : row.completedAt ? "Tamamlandi" : "Acildi",
    }));
    filename = `scratchcart-kazimalar-${range}gun.csv`;
  }

  if (!rows.length) {
    rows = [{ Bilgi: "Secilen donemde kayit bulunamadi" }];
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
