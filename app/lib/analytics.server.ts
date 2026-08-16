import prisma from "~/db.server";
import type { Tier } from "./scratch-engine.server";

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export function daysAgo(n: number) {
  return startOfDay(new Date(Date.now() - n * 86_400_000));
}

const TIER_COLUMN: Record<Tier, "freeShippingCount" | "percent10Count" | "percent15Count" | "percent20Count"> = {
  free_shipping: "freeShippingCount",
  "10_percent": "percent10Count",
  "15_percent": "percent15Count",
  "20_percent": "percent20Count",
};

type Increment = {
  displays?: number;
  scratches?: number;
  completions?: number;
  conversions?: number;
  abandonments?: number;
  cartValueTotal?: number;
  discountTotal?: number;
  revenueTotal?: number;
  tier?: Tier;
};

/**
 * Günlük satırı atomik olarak artırır. Aynı anda gelen çok sayıda istekte
 * yarış koşulu oluşmaması için upsert + increment kullanılır.
 */
export async function recordEvent(shopId: string, inc: Increment) {
  const date = startOfDay(new Date());
  const tierColumn = inc.tier ? TIER_COLUMN[inc.tier] : null;

  const increments = {
    displays: { increment: inc.displays ?? 0 },
    scratches: { increment: inc.scratches ?? 0 },
    completions: { increment: inc.completions ?? 0 },
    conversions: { increment: inc.conversions ?? 0 },
    abandonments: { increment: inc.abandonments ?? 0 },
    cartValueTotal: { increment: inc.cartValueTotal ?? 0 },
    discountTotal: { increment: inc.discountTotal ?? 0 },
    revenueTotal: { increment: inc.revenueTotal ?? 0 },
    ...(tierColumn ? { [tierColumn]: { increment: 1 } } : {}),
  };

  await prisma.analytics.upsert({
    where: { shopId_date: { shopId, date } },
    update: increments,
    create: {
      shopId,
      date,
      displays: inc.displays ?? 0,
      scratches: inc.scratches ?? 0,
      completions: inc.completions ?? 0,
      conversions: inc.conversions ?? 0,
      abandonments: inc.abandonments ?? 0,
      cartValueTotal: inc.cartValueTotal ?? 0,
      discountTotal: inc.discountTotal ?? 0,
      revenueTotal: inc.revenueTotal ?? 0,
      ...(tierColumn ? { [tierColumn]: 1 } : {}),
    },
  });
}

export type Metrics = {
  displays: number;
  scratches: number;
  completions: number;
  conversions: number;
  abandonments: number;
  revenue: number;
  discountGiven: number;
  conversionRate: number;
  scratchRate: number;
  roi: number;
  averageOrderValue: number;
};

export async function getMetrics(
  shopId: string,
  from: Date,
  to: Date,
): Promise<Metrics> {
  const rows = await prisma.analytics.aggregate({
    where: { shopId, date: { gte: startOfDay(from), lte: startOfDay(to) } },
    _sum: {
      displays: true,
      scratches: true,
      completions: true,
      conversions: true,
      abandonments: true,
      revenueTotal: true,
      discountTotal: true,
    },
  });

  const displays = rows._sum.displays ?? 0;
  const scratches = rows._sum.scratches ?? 0;
  const completions = rows._sum.completions ?? 0;
  const conversions = rows._sum.conversions ?? 0;
  const revenue = Number(rows._sum.revenueTotal ?? 0);
  const discountGiven = Number(rows._sum.discountTotal ?? 0);

  return {
    displays,
    scratches,
    completions,
    conversions,
    abandonments: rows._sum.abandonments ?? 0,
    revenue,
    discountGiven,
    conversionRate: displays ? (conversions / displays) * 100 : 0,
    scratchRate: displays ? (scratches / displays) * 100 : 0,
    // ROI: verilen indirim başına kurtarılan ciro.
    roi: discountGiven > 0 ? revenue / discountGiven : 0,
    averageOrderValue: conversions ? revenue / conversions : 0,
  };
}

export async function getDailySeries(shopId: string, from: Date, to: Date) {
  const rows = await prisma.analytics.findMany({
    where: { shopId, date: { gte: startOfDay(from), lte: startOfDay(to) } },
    orderBy: { date: "asc" },
  });

  // Veri olmayan günleri sıfırla doldur; grafik kopuk görünmesin.
  const byDate = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), r]));
  const series: Array<{
    date: string;
    displays: number;
    conversions: number;
    revenue: number;
  }> = [];

  for (
    let cursor = startOfDay(from);
    cursor <= startOfDay(to);
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    const key = cursor.toISOString().slice(0, 10);
    const row = byDate.get(key);
    series.push({
      date: key,
      displays: row?.displays ?? 0,
      conversions: row?.conversions ?? 0,
      revenue: Number(row?.revenueTotal ?? 0),
    });
  }

  return series;
}

export async function getTierBreakdown(shopId: string, from: Date, to: Date) {
  const sum = await prisma.analytics.aggregate({
    where: { shopId, date: { gte: startOfDay(from), lte: startOfDay(to) } },
    _sum: {
      freeShippingCount: true,
      percent10Count: true,
      percent15Count: true,
      percent20Count: true,
    },
  });

  return [
    { tier: "free_shipping" as Tier, label: "Kargo bedava", count: sum._sum.freeShippingCount ?? 0 },
    { tier: "10_percent" as Tier, label: "%10 indirim", count: sum._sum.percent10Count ?? 0 },
    { tier: "15_percent" as Tier, label: "%15 indirim", count: sum._sum.percent15Count ?? 0 },
    { tier: "20_percent" as Tier, label: "%20 indirim", count: sum._sum.percent20Count ?? 0 },
  ];
}

export async function getRecentConversions(shopId: string, take = 10) {
  return prisma.scratch.findMany({
    where: { shopId, convertedToOrder: true },
    orderBy: { recoveredAt: "desc" },
    take,
  });
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  // BOM: Excel'in Türkçe karakterleri doğru açması için.
  return "\uFEFF" + lines.join("\n");
}
