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

export function tierValue(tier: Tier): number {
  switch (tier) {
    case "10_percent":
      return 10;
    case "15_percent":
      return 15;
    case "20_percent":
      return 20;
    default:
      return 0;
  }
}

export function tierLabel(tier: Tier, language = "tr"): string {
  const labels: Record<string, Record<Tier, string>> = {
    tr: {
      free_shipping: "KARGO BEDAVA",
      "10_percent": "%10 İNDİRİM",
      "15_percent": "%15 İNDİRİM",
      "20_percent": "%20 İNDİRİM",
    },
    en: {
      free_shipping: "FREE SHIPPING",
      "10_percent": "10% OFF",
      "15_percent": "15% OFF",
      "20_percent": "20% OFF",
    },
    es: {
      free_shipping: "ENVÍO GRATIS",
      "10_percent": "10% DESC.",
      "15_percent": "15% DESC.",
      "20_percent": "20% DESC.",
    },
  };
  return (labels[language] ?? labels.tr)[tier];
}

/** Olasılıkların toplamı 100 mü? Admin formu ve API bunu birlikte kullanır. */
export function validateProbabilities(weights: TierWeights): {
  valid: boolean;
  total: number;
} {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  return { valid: total === 100, total };
}
