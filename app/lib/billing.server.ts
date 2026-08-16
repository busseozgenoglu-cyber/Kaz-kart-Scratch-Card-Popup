import prisma from "~/db.server";
import { planLimit } from "./scratch-engine.server";
import {
  ENTERPRISE_PLAN,
  FREE_PLAN,
  GROWTH_PLAN,
  PLANS,
  STARTER_PLAN,
  planByBillingName,
  planByKey,
  type BillingPlanName,
  type PlanDefinition,
  type PlanKey,
} from "./plans";

// Bu dosya sunucuya özeldir (prisma import eder). Saf plan tanımları
// `./plans` dosyasından geliyor; admin bileşenleri onları doğrudan
// `~/lib/plans`'dan almalı, bu dosyadan DEĞİL.
export {
  ENTERPRISE_PLAN,
  FREE_PLAN,
  GROWTH_PLAN,
  PLANS,
  STARTER_PLAN,
  planByBillingName,
  planByKey,
  type BillingPlanName,
  type PlanDefinition,
  type PlanKey,
};

/** Shopify'daki aktif aboneliği veritabanındaki plan ve kota ile eşitler. */
export async function syncPlan(shopId: string, planKey: PlanKey) {
  const definition = planByKey(planKey);

  await prisma.shop.update({
    where: { id: shopId },
    data: { plan: definition.key },
  });

  await prisma.usageQuota.upsert({
    where: { shopId },
    update: { plan: definition.key, scratchesLimit: planLimit(definition.key) },
    create: {
      shopId,
      plan: definition.key,
      scratchesLimit: planLimit(definition.key),
      periodStart: new Date(),
    },
  });

  return definition;
}
