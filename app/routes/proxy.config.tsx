import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { json } from "~/lib/cors.server";
import { getShopByDomain } from "~/lib/shop.server";
import {
  checkQuota,
  FREE_PLAN_TIERS,
  tierLabel,
  tierValues,
  TIERS,
} from "~/lib/scratch-engine.server";
import { widgetStrings } from "~/i18n/widget";

/**
 * GET /apps/scratchcart/config
 * Shopify app proxy imzayı doğrular; imzasız istek buraya ulaşamaz.
 * Yanıt hiçbir gizli veri içermez, yalnızca vitrinde gereken alanlar döner.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.public.appProxy(request);

  if (!session?.shop) {
    return json({ enabled: false });
  }

  const shop = await getShopByDomain(session.shop);
  if (!shop?.settings || !shop.isActive || !shop.settings.enabled) {
    return json({ enabled: false });
  }

  const quota = await checkQuota(shop.id);
  if (!quota.allowed) {
    return json({ enabled: false, reason: "quota_exceeded" });
  }

  const s = shop.settings;
  const availableTiers = quota.plan === "free" ? FREE_PLAN_TIERS : [...TIERS];

  return json({
    enabled: true,
    trigger: s.triggerType,
    inactivitySeconds: s.inactivitySeconds,
    maxDisplaysPerSession: s.maxDisplaysPerSession,
    cooldownMinutes: s.cooldownMinutes,
    title: s.title,
    subtitle: s.subtitle,
    scratchText: s.scratchText,
    fontFamily: s.fontFamily,
    colors: {
      background: s.backgroundColor,
      card: s.cardColor,
      reveal: s.revealColor,
      text: s.textColor,
    },
    // Olasılıklar bilinçli olarak paylaşılmaz: çekiliş yalnızca sunucuda yapılır.
    tiers: availableTiers.map((tier) => ({
      type: tier,
      label: tierLabel(tier, s.language, tierValues(s)),
    })),
    minCartValue: Number(s.minCartValue ?? 0),
    autoApply: s.autoApply,
    showConfetti: s.showConfetti,
    enableHaptic: s.enableHaptic,
    mobileFullScreen: s.mobileFullScreen,
    language: s.language,
    translations: widgetStrings(s.language),
  });
}
