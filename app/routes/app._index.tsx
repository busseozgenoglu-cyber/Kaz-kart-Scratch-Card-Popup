import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Box,
  Banner,
  Card,
  Divider,
  EmptyState,
  Grid,
  InlineStack,
  Layout,
  Link,
  Page,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import { TitleBar, useNavigate } from "@shopify/app-bridge-react";
import { authenticate } from "~/shopify.server";
import { ensureShop } from "~/lib/shop.server";
import {
  daysAgo,
  getDailySeries,
  getMetrics,
  getRecentConversions,
  getTierBreakdown,
} from "~/lib/analytics.server";
import { checkQuota, planLimit } from "~/lib/scratch-engine.server";
import { planByKey } from "~/lib/plans";
import { TierBars, TrendChart } from "~/components/Charts";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await ensureShop(session.shop);

  const to = new Date();
  const from = daysAgo(29);

  const [metrics, series, tiers, recent, quota] = await Promise.all([
    getMetrics(shop.id, from, to),
    getDailySeries(shop.id, from, to),
    getTierBreakdown(shop.id, from, to),
    getRecentConversions(shop.id, 8),
    checkQuota(shop.id),
  ]);

  return {
    metrics,
    series,
    tiers,
    plan: shop.plan,
    widgetEnabled: shop.settings.enabled,
    shopDomain: shop.shopDomain,
    quota: {
      used: quota.used,
      limit: quota.limit === Number.MAX_SAFE_INTEGER ? null : quota.limit,
    },
    recent: recent.map((row) => ({
      id: row.id,
      code: row.discountCode,
      tier: row.tierWon,
      orderValue: Number(row.orderValue ?? 0),
      currency: row.currency,
      recoveredAt: row.recoveredAt?.toISOString() ?? null,
    })),
    unlimited: planLimit(shop.plan) === Number.MAX_SAFE_INTEGER,
  };
}

export default function Overview() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { metrics } = data;
  const themeEditorUrl = `https://${data.shopDomain}/admin/themes/current/editor?context=apps`;

  const hasData = metrics.displays > 0;

  return (
    <Page>
      <TitleBar title="Genel bakış" />
      <BlockStack gap="400">
        {!data.widgetEnabled && (
          <Banner tone="warning" title="Bilet şu anda kapalı">
            <p>
              Müşterileriniz kazı kazan biletini görmüyor.{" "}
              <Link onClick={() => navigate("/app/settings")} removeUnderline>
                Bilet ayarlarından
              </Link>{" "}
              açabilirsiniz.
            </p>
          </Banner>
        )}

        {data.quota.limit !== null && (
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingSm">
                  Bu ayki gösterim hakkınız
                </Text>
                <Badge tone={data.quota.used >= data.quota.limit ? "critical" : "info"}>
                  {`${data.quota.used} / ${data.quota.limit}`}
                </Badge>
              </InlineStack>
              <ProgressBar
                progress={Math.min(100, (data.quota.used / data.quota.limit) * 100)}
                tone={data.quota.used >= data.quota.limit ? "critical" : "primary"}
                size="small"
              />
              <Text as="p" tone="subdued" variant="bodySm">
                Ücretsiz planda ayda {data.quota.limit} gösterim var.{" "}
                <Link onClick={() => navigate("/app/plans")} removeUnderline>
                  Sınırsıza geçin
                </Link>
                .
              </Text>
            </BlockStack>
          </Card>
        )}

        <Layout>
          <Layout.Section>
            <Grid>
              <Metric
                title="Kurtarılan sepet"
                value={metrics.conversions.toLocaleString("tr-TR")}
                caption="Son 30 gün"
              />
              <Metric
                title="Kurtarılan ciro"
                value={formatMoney(metrics.revenue)}
                caption={`Ortalama ${formatMoney(metrics.averageOrderValue)} / sipariş`}
                emphasis
              />
              <Metric
                title="Dönüşüm oranı"
                value={`%${metrics.conversionRate.toFixed(1)}`}
                caption={`${metrics.displays.toLocaleString("tr-TR")} gösterimde`}
              />
              <Metric
                title="İndirim verimi"
                value={metrics.roi > 0 ? `${metrics.roi.toFixed(1)}x` : "—"}
                caption={`${formatMoney(metrics.discountGiven)} indirim verildi`}
              />
            </Grid>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">
                    Son 30 gün
                  </Text>
                  <InlineStack gap="300">
                    <Legend color="#d22b3f" label="Gösterim" />
                    <Legend color="#1fb980" label="Kurtarma" dashed />
                  </InlineStack>
                </InlineStack>
                {hasData ? (
                  <TrendChart series={data.series} />
                ) : (
                  <EmptyState
                    heading="Henüz gösterim yok"
                    image=""
                    action={{ content: "Tema düzenleyicide aç", url: themeEditorUrl, target: "_blank" }}
                    secondaryAction={{
                      content: "Bilet ayarları",
                      onAction: () => navigate("/app/settings"),
                    }}
                  >
                    <p>
                      Bileti yayına almak için tema düzenleyicide "Uygulama
                      yerleşimleri" bölümünden ScratchCart'ı açın.
                    </p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Hangi ödül çıktı
                  </Text>
                  <TierBars data={data.tiers} />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Son kurtarmalar
                  </Text>
                  {data.recent.length === 0 ? (
                    <Text as="p" tone="subdued" variant="bodySm">
                      Bir sipariş kazı kazan koduyla tamamlandığında burada listelenir.
                    </Text>
                  ) : (
                    <BlockStack gap="200">
                      {data.recent.map((row) => (
                        <Box key={row.id}>
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="050">
                              <Text as="span" variant="bodySm" fontWeight="medium">
                                {row.code}
                              </Text>
                              <Text as="span" variant="bodyXs" tone="subdued">
                                {row.recoveredAt
                                  ? new Date(row.recoveredAt).toLocaleDateString("tr-TR")
                                  : "—"}
                              </Text>
                            </BlockStack>
                            <Text as="span" variant="bodySm" fontWeight="semibold">
                              {formatMoney(row.orderValue, row.currency)}
                            </Text>
                          </InlineStack>
                          <Box paddingBlockStart="200">
                            <Divider />
                          </Box>
                        </Box>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Planınız
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {planByKey(data.plan).name}
                  </Text>
                  <Link onClick={() => navigate("/app/plans")}>
                    Planları karşılaştır
                  </Link>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function Metric({
  title,
  value,
  caption,
  emphasis,
}: {
  title: string;
  value: string;
  caption: string;
  emphasis?: boolean;
}) {
  return (
    <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
      <Card>
        <BlockStack gap="100">
          <Text as="h3" variant="bodySm" tone="subdued">
            {title}
          </Text>
          <Text as="p" variant={emphasis ? "heading2xl" : "headingXl"} fontWeight="bold">
            {value}
          </Text>
          <Text as="p" variant="bodyXs" tone="subdued">
            {caption}
          </Text>
        </BlockStack>
      </Card>
    </Grid.Cell>
  );
}

function Legend({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <InlineStack gap="100" blockAlign="center">
      <span
        style={{
          width: 16,
          height: 0,
          borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}`,
          display: "inline-block",
        }}
      />
      <Text as="span" variant="bodyXs" tone="subdued">
        {label}
      </Text>
    </InlineStack>
  );
}

function formatMoney(value: number, currency = "TRY") {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toFixed(0)} ${currency}`;
  }
}
