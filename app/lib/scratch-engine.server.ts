import crypto from "node:crypto";
import type { ShopSettings } from "@prisma/client";
import prisma from "~/db.server";
import {
  DEFAULT_TIER_VALUES,
  FREE_PLAN_TIERS,
  MAX_TIER_VALUE,
  MIN_TIER_VALUE,
  TIERS,
  tierLabel,
  tierValue,
  validateProbabilities,
  type Tier,
  type TierValues,
  type TierWeights,
} from "./tiers";

// Bu dosya sunucuya özeldir (prisma import eder). Saf/isomorphic tier
// yardımcıları `./tiers` dosyasından geliyor; admin bileşenleri onları
// doğrudan `~/lib/tiers`'dan almalı, bu dosyadan DEĞİL — aksi halde build
// "Server-only module referenced by client" hatası verir.
export {
  DEFAULT_TIER_VALUES,
  FREE_PLAN_TIERS,
  MAX_TIER_VALUE,
  MIN_TIER_VALUE,
  TIERS,
  tierLabel,
  tierValue,
  validateProbabilities,
  type Tier,
  type TierValues,
  type TierWeights,
};

/** Satıcının belirlediği indirim yüzdelerini ayarlardan okur. */
export function tierValues(settings: ShopSettings): TierValues {
  return {
    free_shipping: 0,
    "10_percent": settings.tier10PercentValue,
    "15_percent": settings.tier15PercentValue,
    "20_percent": settings.tier20PercentValue,
  };
}

export function tierWeights(settings: ShopSettings): TierWeights {
  return {
    free_shipping: settings.tierFreeShippingProb,
    "10_percent": settings.tier10PercentProb,
    "15_percent": settings.tier15PercentProb,
    "20_percent": settings.tier20PercentProb,
  };
}

/**
 * Kriptografik olarak güvenli, düzgün dağılmış ağırlıklı seçim.
 * Math.random() yerine randomInt kullanılır: modulo sapması yoktur ve
 * ödül dağılımı istemci tarafından tahmin edilemez.
 */
export function determineTier(
  settings: ShopSettings,
  allowedTiers: Tier[] = [...TIERS],
): Tier {
  const weights = tierWeights(settings);
  const pool = allowedTiers.filter((t) => (weights[t] ?? 0) > 0);

  if (pool.length === 0) return "free_shipping";

  const total = pool.reduce((sum, t) => sum + weights[t], 0);
  if (total <= 0) return pool[0];

  let ticket = crypto.randomInt(0, total);
  for (const tier of pool) {
    ticket -= weights[tier];
    if (ticket < 0) return tier;
  }
  return pool[pool.length - 1];
}

const PLAN_LIMITS: Record<string, number> = {
  free: 50,
  starter: Number.MAX_SAFE_INTEGER,
  growth: Number.MAX_SAFE_INTEGER,
  enterprise: Number.MAX_SAFE_INTEGER,
};

export function planLimit(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

/**
 * Aylık kotayı kontrol eder ve dönem bittiyse otomatik sıfırlar.
 * Kota dolu ise widget hiç gösterilmez.
 */
export async function checkQuota(shopId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: string;
}> {
  let quota = await prisma.usageQuota.findUnique({ where: { shopId } });

  if (!quota) {
    quota = await prisma.usageQuota.create({
      data: {
        shopId,
        periodStart: new Date(),
        periodEnd: addMonths(new Date(), 1),
      },
    });
  }

  if (quota.periodEnd && quota.periodEnd < new Date()) {
    quota = await prisma.usageQuota.update({
      where: { shopId },
      data: {
        scratchesUsed: 0,
        periodStart: new Date(),
        periodEnd: addMonths(new Date(), 1),
      },
    });
  }

  const limit = planLimit(quota.plan);
  return {
    allowed: quota.scratchesUsed < limit,
    used: quota.scratchesUsed,
    limit,
    plan: quota.plan,
  };
}

export async function consumeQuota(shopId: string) {
  await prisma.usageQuota.updateMany({
    where: { shopId },
    data: { scratchesUsed: { increment: 1 } },
  });
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Kod formatı: SC10-A7F3K2 — okunabilir, karışan karakterler (0/O, 1/I) çıkarılmış. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(tier: Tier): string {
  const prefixes: Record<Tier, string> = {
    free_shipping: "SCKG",
    "10_percent": "SC10",
    "15_percent": "SC15",
    "20_percent": "SC20",
  };
  let suffix = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${prefixes[tier]}-${suffix}`;
}

export function detectDevice(userAgent: string | null): string {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}
