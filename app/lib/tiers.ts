/**
 * Ödül (tier) ile ilgili saf/isomorphic yardımcılar.
 *
 * ÖNEMLİ: Bu dosya `.server` eki TAŞIMAZ ve prisma import ETMEZ, çünkü
 * `tierLabel` gibi fonksiyonlar admin panelindeki React bileşenlerinden
 * (tarayıcı paketine dahil olur) doğrudan çağrılıyor. Sunucuya özel
 * mantık (kota kontrolü, kod üretimi, DB erişimi) `scratch-engine.server.ts`
 * içinde kalır ve bu dosyadaki tipleri/etiketleri buradan yeniden dışa aktarır.
 */

export const TIERS = [
  "free_shipping",
  "10_percent",
  "15_percent",
  "20_percent",
] as const;

export type Tier = (typeof TIERS)[number];

export type TierWeights = Record<Tier, number>;

/** Ücretsiz planda yalnızca ilk iki ödül dağıtılır (plan limiti). */
export const FREE_PLAN_TIERS: Tier[] = ["free_shipping", "10_percent"];

/**
 * Kademelerin indirim yüzdeleri. Satıcı bunları panelden belirler; tier
 * id'lerindeki 10/15/20 yalnızca slot adıdır, gerçek oran buradan gelir.
 */
export type TierValues = Record<Tier, number>;

/** Satıcı bir şey değiştirmediğinde kullanılan oranlar. */
export const DEFAULT_TIER_VALUES: TierValues = {
  free_shipping: 0,
  "10_percent": 10,
  "15_percent": 15,
  "20_percent": 20,
};

/** Yüzde alanları için kabul edilen aralık. */
export const MIN_TIER_VALUE = 1;
export const MAX_TIER_VALUE = 100;

export function tierValue(
  tier: Tier,
  values: TierValues = DEFAULT_TIER_VALUES,
): number {
  if (tier === "free_shipping") return 0;
  const value = values[tier];
  return Number.isFinite(value) ? value : DEFAULT_TIER_VALUES[tier];
}

export function tierLabel(
  tier: Tier,
  language = "tr",
  values: TierValues = DEFAULT_TIER_VALUES,
): string {
  const freeShipping: Record<string, string> = {
    tr: "KARGO BEDAVA",
    en: "FREE SHIPPING",
    es: "ENVÍO GRATIS",
  };
  const percentTemplate: Record<string, (percent: number) => string> = {
    tr: (percent) => `%${percent} İNDİRİM`,
    en: (percent) => `${percent}% OFF`,
    es: (percent) => `${percent}% DESC.`,
  };

  if (tier === "free_shipping") {
    return freeShipping[language] ?? freeShipping.tr;
  }
  const template = percentTemplate[language] ?? percentTemplate.tr;
  return template(tierValue(tier, values));
}

/** Olasılıkların toplamı 100 mü? Admin formu ve API bunu birlikte kullanır. */
export function validateProbabilities(weights: TierWeights): {
  valid: boolean;
  total: number;
} {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  return { valid: total === 100, total };
}
