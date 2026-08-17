import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "~/shopify.server";
import { ensureShop } from "~/lib/shop.server";
import { syncPlan } from "~/lib/billing.server";
import { PLANS, planByKey, type PlanKey } from "~/lib/plans";
import { checkQuota } from "~/lib/scratch-engine.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await ensureShop(session.shop);
  const quota = await checkQuota(shop.id);

  return {
    currentPlan: shop.plan as PlanKey,
    used: quota.used,
    limit: quota.limit === Number.MAX_SAFE_INTEGER ? null : quota.limit,
    plans: PLANS,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);
  const shop = await ensureShop(session.shop);

  const form = await request.formData();
  const target = String(form.get("plan") ?? "") as PlanKey;
  const definition = planByKey(target);

  if (definition.key === "free" || !definition.billingPlan) {
    // Ücretsiz plana dönüş: aktif abonelik iptal edilir.
    const { appSubscriptions } = await billing.check();
    for (const subscription of appSubscriptions ?? []) {
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: process.env.NODE_ENV !== "production",
        prorate: true,
      });
    }
    await syncPlan(shop.id, "free");
    return { ok: true };
  }

  // Onay ekranına yönlendirir; dönüşte app.tsx planı senkronlar.
  await billing.request({
    // shopify-app-remix v4'te billing yapılandırmasının tipi (`BillingConfig`)
    // yalnızca `[plan: string]` index imzası içeriyor, plan adlarını taşımıyor;
    // bu yüzden `plan` alanı `never`e düşüyor. Değer çalışma zamanında doğru:
    // `plans.ts`'deki adlar `shopify.server.ts`'deki billing anahtarlarıyla
    // birebir aynı ve testler bunu doğruluyor.
    plan: definition.billingPlan as unknown as never,
    isTest: process.env.NODE_ENV !== "production",
    returnUrl: `${process.env.SHOPIFY_APP_URL}/app/plans?shop=${session.shop}`,
  });

  return { ok: true };
}

export default function Plans() {
  const { currentPlan, plans, used, limit } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <Page>
      <TitleBar title="Plan" />
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Şu anki planınız: {planByKey(currentPlan).name}
            </Text>
            <Text as="p" tone="subdued">
              {limit === null
                ? `Bu ay ${used.toLocaleString("tr-TR")} bilet gösterdiniz. Sınır yok.`
                : `Bu ay ${used} / ${limit} gösterim kullanıldı.`}
            </Text>
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section>
            <Grid>
              {plans.map((plan) => {
                const active = plan.key === currentPlan;
                return (
                  <Grid.Cell
                    key={plan.key}
                    columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }}
                  >
                    <Card padding="400">
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h3" variant="headingMd">
                            {plan.name}
                          </Text>
                          {active && <Badge tone="success">Aktif</Badge>}
                        </InlineStack>

                        <InlineStack blockAlign="baseline" gap="100">
                          <Text as="p" variant="heading2xl" fontWeight="bold">
                            ${plan.price}
                          </Text>
                          <Text as="span" tone="subdued" variant="bodySm">
                            / ay
                          </Text>
                        </InlineStack>

                        {plan.trialDays > 0 && (
                          <Text as="p" variant="bodySm" tone="success">
                            {plan.trialDays} gün ücretsiz deneme
                          </Text>
                        )}

                        <Divider />

                        <BlockStack gap="150">
                          {plan.features.map((feature) => (
                            <InlineStack key={feature} gap="150" wrap={false}>
                              <Box>
                                <Text as="span" tone="subdued">
                                  ·
                                </Text>
                              </Box>
                              <Text as="span" variant="bodySm">
                                {feature}
                              </Text>
                            </InlineStack>
                          ))}
                        </BlockStack>

                        <Box paddingBlockStart="200">
                          <Form method="post">
                            <input type="hidden" name="plan" value={plan.key} />
                            <Button
                              submit
                              variant={active ? "secondary" : "primary"}
                              disabled={active || submitting}
                              fullWidth
                            >
                              {active
                                ? "Kullanımda"
                                : plan.key === "free"
                                  ? "Ücretsize dön"
                                  : "Bu plana geç"}
                            </Button>
                          </Form>
                        </Box>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                );
              })}
            </Grid>
          </Layout.Section>
        </Layout>

        <Card>
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              Ücretlendirme nasıl işliyor
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Abonelik Shopify faturanıza eklenir; kart bilgisi bizde tutulmaz.
              Plan değişikliği anında geçerli olur, iptal ettiğinizde dönem sonuna
              kadar mevcut planınızı kullanmaya devam edersiniz.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
