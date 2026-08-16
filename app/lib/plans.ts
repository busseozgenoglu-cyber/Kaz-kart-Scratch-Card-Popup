/**
 * Fiyatlandırma planlarının saf/isomorphic tanımı.
 *
 * `.server` eki YOK ve prisma import ETMİYOR, çünkü `PLANS`/`planByKey`
 * `/app/plans` sayfasındaki React bileşeninde (tarayıcı paketi) doğrudan
 * render için kullanılıyor. Veritabanına yazan `syncPlan` fonksiyonu
 * `billing.server.ts` içinde kalır ve bu dosyadaki tanımları kullanır.
 */

export const FREE_PLAN = "free" as const;
export const STARTER_PLAN = "Starter" as const;
export const GROWTH_PLAN = "Growth" as const;
export const ENTERPRISE_PLAN = "Enterprise" as const;

export type PlanKey = "free" | "starter" | "growth" | "enterprise";

export type BillingPlanName =
  | typeof STARTER_PLAN
  | typeof GROWTH_PLAN
  | typeof ENTERPRISE_PLAN;

export type PlanDefinition = {
  key: PlanKey;
  /** Shopify Billing API'de tanımlı ad (shopify.server.ts içindeki billing anahtarı). */
  billingPlan: BillingPlanName | null;
  name: string;
  price: number;
  trialDays: number;
  scratchLimit: number | null;
  tierCount: string;
  support: string;
  features: string[];
};

export const PLANS: PlanDefinition[] = [
  {
    key: "free",
    billingPlan: null,
    name: "Ücretsiz",
    price: 0,
    trialDays: 0,
    scratchLimit: 50,
    tierCount: "2 ödül",
    support: "Topluluk",
    features: [
      "Ayda 50 kazı kazan gösterimi",
      "Kargo bedava ve %10 ödülleri",
      "Çıkış niyeti tetikleyicisi",
      "Temel panel",
    ],
  },
  {
    key: "starter",
    billingPlan: STARTER_PLAN,
    name: "Starter",
    price: 19,
    trialDays: 7,
    scratchLimit: null,
    tierCount: "4 ödül",
    support: "E-posta",
    features: [
      "Sınırsız gösterim",
      "Dört ödül kademesi",
      "Tüm tetikleyiciler ve bekleme süresi ayarı",
      "Kart tasarımını özelleştirme",
      "CSV dışa aktarım",
    ],
  },
  {
    key: "growth",
    billingPlan: GROWTH_PLAN,
    name: "Growth",
    price: 39,
    trialDays: 15,
    scratchLimit: null,
    tierCount: "4 ödül + kural motoru",
    support: "Öncelikli",
    features: [
      "Starter'daki her şey",
      "Sepet tutarına göre ödül kuralları",
      "Dönem karşılaştırmalı raporlar",
      "Gelişmiş kazıma günlüğü filtreleri",
      "15 gün ücretsiz deneme",
    ],
  },
  {
    key: "enterprise",
    billingPlan: ENTERPRISE_PLAN,
    name: "Enterprise",
    price: 79,
    trialDays: 15,
    scratchLimit: null,
    tierCount: "Özel ödül seti",
    support: "Özel yönetici",
    features: [
      "Growth'taki her şey",
      "Özel ödül kademeleri",
      "Çoklu mağaza raporlaması",
      "Özel hesap yöneticisi",
      "Öncelikli teknik destek",
    ],
  },
];

export function planByKey(key: string): PlanDefinition {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

export function planByBillingName(name: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.billingPlan === name);
}
