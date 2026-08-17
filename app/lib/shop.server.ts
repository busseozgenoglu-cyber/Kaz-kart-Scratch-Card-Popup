import { Prisma } from "@prisma/client";
import type { Shop, ShopSettings } from "@prisma/client";
import prisma from "~/db.server";
import { addMonths, planLimit } from "./scratch-engine.server";
import { MAX_TIER_VALUE, MIN_TIER_VALUE } from "./tiers";

export type ShopWithSettings = Shop & { settings: ShopSettings };

/**
 * Mağazayı ilk görüşte kurar. Kurulum, ayarlar ve kota tek transaction'da
 * oluşturulur; yarım kalmış kayıt bırakmaz.
 *
 * app.tsx ve alt route'ların loader'ları Remix tarafından paralel çalıştırılır,
 * bu yüzden ilk ziyarette iki istek aynı anda buraya girebilir. İkisi de
 * shopId üzerinde upsert dener; kaybeden P2002 (unique constraint) alır.
 * Bu durumda baştan tekrar denenir — kazanan taraf artık kaydı oluşturmuş
 * olacağından üstteki "existing" kontrolü bu sefer erken döner.
 */
export async function ensureShop(shopDomain: string): Promise<ShopWithSettings> {
  const existing = await prisma.shop.findUnique({
    where: { shopDomain },
    include: { settings: true },
  });

  if (existing?.settings) {
    if (!existing.isActive) {
      const revived = await prisma.shop.update({
        where: { id: existing.id },
        data: { isActive: true, uninstalledAt: null, installedAt: new Date() },
        include: { settings: true },
      });
      return revived as ShopWithSettings;
    }
    return existing as ShopWithSettings;
  }

  try {
    const shop = await prisma.shop.upsert({
      where: { shopDomain },
      update: { isActive: true, uninstalledAt: null },
      create: { shopDomain },
    });

    const settings = await prisma.shopSettings.upsert({
      where: { shopId: shop.id },
      update: {},
      create: { shopId: shop.id },
    });

    await prisma.usageQuota.upsert({
      where: { shopId: shop.id },
      update: {},
      create: {
        shopId: shop.id,
        plan: shop.plan,
        scratchesLimit: planLimit(shop.plan),
        periodStart: new Date(),
        periodEnd: addMonths(new Date(), 1),
      },
    });

    return { ...shop, settings };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return ensureShop(shopDomain);
    }
    throw error;
  }
}

export async function getShopByDomain(shopDomain: string) {
  return prisma.shop.findUnique({
    where: { shopDomain },
    include: { settings: true, quota: true },
  });
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type SettingsErrors = Record<string, string>;

/**
 * Formdan gelen değerleri temizler ve doğrular.
 * Hata varsa kaydetmez; hangi alanın neden reddedildiğini döndürür.
 */
export function parseSettingsForm(form: FormData): {
  data: Partial<ShopSettings>;
  errors: SettingsErrors;
} {
  const errors: SettingsErrors = {};
  const str = (key: string, fallback = "") =>
    (form.get(key)?.toString() ?? fallback).trim();
  const num = (key: string, fallback: number) => {
    const value = Number(form.get(key));
    return Number.isFinite(value) ? value : fallback;
  };
  const bool = (key: string) => form.get(key) === "true";
  /**
   * `num` eksik alanı 0 olarak okur (Number(null) === 0). Yüzde alanlarında bu
   * yanlış olur: alan hiç gönderilmediyse satıcının mevcut/varsayılan oranı
   * korunmalı, "0 girilmiş" sayılmamalı.
   */
  const numOrFallback = (key: string, fallback: number) => {
    const raw = form.get(key);
    if (raw === null || String(raw).trim() === "") return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  };

  const colors = {
    backgroundColor: str("backgroundColor", "#0B0A12"),
    cardColor: str("cardColor", "#D8BE8D"),
    revealColor: str("revealColor", "#E8C88A"),
    textColor: str("textColor", "#141126"),
  };

  for (const [key, value] of Object.entries(colors)) {
    if (!HEX.test(value)) {
      errors[key] = "Renk #RRGGBB biçiminde olmalı.";
    }
  }

  const probs = {
    tierFreeShippingProb: clamp(num("tierFreeShippingProb", 50), 0, 100),
    tier10PercentProb: clamp(num("tier10PercentProb", 30), 0, 100),
    tier15PercentProb: clamp(num("tier15PercentProb", 15), 0, 100),
    tier20PercentProb: clamp(num("tier20PercentProb", 5), 0, 100),
  };

  const probTotal = Object.values(probs).reduce((a, b) => a + b, 0);
  if (probTotal !== 100) {
    errors.probabilities = `Ödül oranlarının toplamı 100 olmalı, şu an ${probTotal}.`;
  }

  // İndirim yüzdeleri satıcıya bırakılmıştır; yalnızca makul aralık zorlanır.
  const tierValueFields = {
    tier10PercentValue: 10,
    tier15PercentValue: 15,
    tier20PercentValue: 20,
  } as const;

  const tierValueEntries: Record<string, number> = {};
  for (const [key, fallback] of Object.entries(tierValueFields)) {
    const raw = numOrFallback(key, fallback);
    if (raw < MIN_TIER_VALUE || raw > MAX_TIER_VALUE) {
      errors[key] = `İndirim oranı ${MIN_TIER_VALUE} ile ${MAX_TIER_VALUE} arasında olmalı.`;
    }
    tierValueEntries[key] = clamp(raw, MIN_TIER_VALUE, MAX_TIER_VALUE);
  }

  const title = str("title");
  if (!title) errors.title = "Başlık boş bırakılamaz.";
  if (title.length > 60) errors.title = "Başlık en fazla 60 karakter olabilir.";

  const scratchText = str("scratchText");
  if (scratchText.length > 14) {
    errors.scratchText = "Kazıma yazısı en fazla 14 karakter olabilir.";
  }

  const triggerType = str("triggerType", "both");
  if (!["exit_intent", "inactivity", "both"].includes(triggerType)) {
    errors.triggerType = "Geçersiz tetikleme türü.";
  }

  const language = str("language", "tr");
  if (!["tr", "en", "es"].includes(language)) {
    errors.language = "Desteklenmeyen dil.";
  }

  const data: Partial<ShopSettings> = {
    enabled: bool("enabled"),
    triggerType,
    inactivitySeconds: clamp(num("inactivitySeconds", 90), 15, 600),
    maxDisplaysPerSession: clamp(num("maxDisplaysPerSession", 1), 1, 5),
    cooldownMinutes: clamp(num("cooldownMinutes", 60), 0, 10080),
    title,
    subtitle: str("subtitle").slice(0, 120),
    scratchText,
    ...colors,
    fontFamily: str("fontFamily", "system"),
    ...probs,
    ...tierValueEntries,
    freeShippingThreshold: toDecimal(num("freeShippingThreshold", 150)),
    minCartValue: toDecimal(num("minCartValue", 50)),
    discountValidMinutes: clamp(num("discountValidMinutes", 30), 5, 1440),
    autoApply: bool("autoApply"),
    showConfetti: bool("showConfetti"),
    enableHaptic: bool("enableHaptic"),
    mobileFullScreen: bool("mobileFullScreen"),
    language,
  } as Partial<ShopSettings>;

  return { data, errors };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function toDecimal(value: number) {
  return Math.max(0, Math.round(value * 100) / 100) as unknown as ShopSettings["minCartValue"];
}
