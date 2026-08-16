import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  DataTable,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "~/shopify.server";
import { ensureShop } from "~/lib/shop.server";
import {
  daysAgo,
  getDailySeries,
  getMetrics,
  getTierBreakdown,
} from "~/lib/analytics.server";
import { TierBars, TrendChart } from "~/components/Charts";

const RANGES = [7, 14, 30, 90] as const;

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await ensureShop(session.shop);

  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("range") ?? 30);
  const range = (RANGES as readonly number[]).includes(requested) ? requested : 30;

  const to = new Date();
  const from = daysAgo(range - 1);
  const previousTo = daysAgo(range);
  const previousFrom = daysAgo(range * 2 - 1);

  const [current, previous, series, tiers] = await Promise.all([
    getMetrics(shop.id, from, to),
    getMetrics(shop.id, previousFrom, previousTo),
    getDailySeries(shop.id, from, to),
    getTierBreakdown(shop.id, from, to),
  ]);

  return { range, current, previous, series, tiers };
}

export default function Analytics() {
  const { range, current, previous, series, tiers } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  const rows = [
    ["Gösterim", current.displays, previous.displays, format.int],
    ["Kazınan bilet", current.scratches, previous.scratches, format.int],
    ["Kurtarılan sipariş", current.conversions, previous.conversions, format.int],
    ["Kurtarılan ciro", current.revenue, previous.revenue, format.money],
    ["Verilen indirim", current.discountGiven, previous.discountGiven, format.money],
    ["Dönüşüm oranı", current.conversionRate, previous.conversionRate, format.percent],
    ["Kazıma oranı", current.scratchRate, previous.scratchRate, format.percent],
    ["Kazımadan kapatma", current.abandonments, previous.abandonments, format.int],
  ] as const;

  return (
    <Page>
      <TitleBar title="Raporlar" />
      <BlockStack gap="400">
        <Card>
          <InlineStack align="space-between" blockAlign="center" gap="300">
            <Select
              label="Dönem"
              labelInline
              options={RANGES.map((days) => ({
                label: `Son ${days} gün`,
                value: String(days),
              }))}
              value={String(range)}
              onChange={(value) => setSearchParams({ range: value })}
            />
            <InlineStack gap="200">
              <Button url={`/app/analytics/export?range=${range}&type=daily`} download>
                Günlük özeti indir
              </Button>
              <Button
                url={`/app/analytics/export?range=${range}&type=scratches`}
                download
                variant="primary"
              >
                Kazıma kayıtlarını indir
              </Button>
            </InlineStack>
          </InlineStack>
        </Card>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Eğri
                </Text>
                <TrendChart series={series} height={240} />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Ödül dağılımı
                </Text>
                <TierBars data={tiers} />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Card padding="0">
          <DataTable
            columnContentTypes={["text", "numeric", "numeric", "numeric"]}
            headings={[
              "Ölçüt",
              `Son ${range} gün`,
              `Önceki ${range} gün`,
              "Değişim",
            ]}
            rows={rows.map(([label, now, before, formatter]) => [
              label,
              formatter(now),
              formatter(before),
              delta(now, before),
            ])}
          />
        </Card>
      </BlockStack>
    </Page>
  );
}

const format = {
  int: (value: number) => value.toLocaleString("tr-TR"),
  money: (value: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(value),
  percent: (value: number) => `%${value.toFixed(1)}`,
};

function delta(now: number, before: number) {
  if (!before) return now > 0 ? "yeni" : "—";
  const change = ((now - before) / before) * 100;
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(0)}%`;
}
