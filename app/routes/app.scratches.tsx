import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import type { Prisma } from "@prisma/client";
import {
  Badge,
  BlockStack,
  Card,
  ChoiceList,
  EmptyState,
  IndexFilters,
  IndexTable,
  Page,
  Text,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import { TitleBar, useNavigate } from "@shopify/app-bridge-react";
import { useState } from "react";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { ensureShop } from "~/lib/shop.server";
import { tierLabel, type Tier } from "~/lib/tiers";

const PAGE_SIZE = 50;

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await ensureShop(session.shop);

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const tier = url.searchParams.get("tier");
  const status = url.searchParams.get("status");
  const device = url.searchParams.get("device");

  const where: Prisma.ScratchWhereInput = { shopId: shop.id };
  if (tier) where.tierWon = tier;
  if (device) where.deviceType = device;
  if (status === "converted") where.convertedToOrder = true;
  if (status === "won") where.completedAt = { not: null };
  if (status === "abandoned") where.abandonedAt = { not: null };

  const [rows, total] = await Promise.all([
    prisma.scratch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.scratch.count({ where }),
  ]);

  return {
    page,
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    language: shop.settings.language,
    filters: { tier, status, device },
    rows: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      tier: row.tierWon,
      code: row.discountCode,
      cartValue: Number(row.cartValueBefore ?? 0),
      orderValue: Number(row.orderValue ?? 0),
      currency: row.currency,
      converted: row.convertedToOrder,
      abandoned: Boolean(row.abandonedAt),
      completed: Boolean(row.completedAt),
      device: row.deviceType,
    })),
  };
}

export default function Scratches() {
  const data = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mode, setMode } = useSetIndexFiltersMode();
  const [tier, setTier] = useState<string[]>(
    data.filters.tier ? [data.filters.tier] : [],
  );
  const [status, setStatus] = useState<string[]>(
    data.filters.status ? [data.filters.status] : [],
  );
  const [device, setDevice] = useState<string[]>(
    data.filters.device ? [data.filters.device] : [],
  );

  const applyFilter = (key: string, values: string[]) => {
    const next = new URLSearchParams(searchParams);
    if (values.length) next.set(key, values[0]);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  };

  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    navigate(`/app/scratches?${next.toString()}`);
  };

  if (data.total === 0 && !data.filters.tier && !data.filters.status) {
    return (
      <Page>
        <TitleBar title="Kazıma günlüğü" />
        <Card>
          <EmptyState
            heading="Henüz kazınan bilet yok"
            image=""
            action={{
              content: "Bilet ayarlarına git",
              onAction: () => navigate("/app/settings"),
            }}
          >
            <p>
              Bir müşteri bileti kazıdığında olay burada tüm ayrıntısıyla listelenir.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page fullWidth>
      <TitleBar title="Kazıma günlüğü" />
      <Card padding="0">
        <IndexFilters
          mode={mode}
          setMode={setMode}
          tabs={[]}
          selected={0}
          queryValue=""
          queryPlaceholder="Kayıtlarda ara"
          onQueryChange={() => {}}
          onQueryClear={() => {}}
          onClearAll={() => setSearchParams(new URLSearchParams())}
          cancelAction={{ onAction: () => {}, disabled: false, loading: false }}
          filters={[
            {
              key: "tier",
              label: "Ödül",
              filter: (
                <ChoiceList
                  title="Ödül"
                  titleHidden
                  choices={[
                    { label: "Kargo bedava", value: "free_shipping" },
                    { label: "%10 indirim", value: "10_percent" },
                    { label: "%15 indirim", value: "15_percent" },
                    { label: "%20 indirim", value: "20_percent" },
                  ]}
                  selected={tier}
                  onChange={(value) => {
                    setTier(value);
                    applyFilter("tier", value);
                  }}
                />
              ),
              shortcut: true,
            },
            {
              key: "status",
              label: "Durum",
              filter: (
                <ChoiceList
                  title="Durum"
                  titleHidden
                  choices={[
                    { label: "Siparişe dönüştü", value: "converted" },
                    { label: "Ödül kazandı", value: "won" },
                    { label: "Kazımadan kapattı", value: "abandoned" },
                  ]}
                  selected={status}
                  onChange={(value) => {
                    setStatus(value);
                    applyFilter("status", value);
                  }}
                />
              ),
              shortcut: true,
            },
            {
              key: "device",
              label: "Cihaz",
              filter: (
                <ChoiceList
                  title="Cihaz"
                  titleHidden
                  choices={[
                    { label: "Mobil", value: "mobile" },
                    { label: "Masaüstü", value: "desktop" },
                    { label: "Tablet", value: "tablet" },
                  ]}
                  selected={device}
                  onChange={(value) => {
                    setDevice(value);
                    applyFilter("device", value);
                  }}
                />
              ),
            },
          ]}
          appliedFilters={buildApplied(data.filters, (key) => {
            const next = new URLSearchParams(searchParams);
            next.delete(key);
            setSearchParams(next);
            if (key === "tier") setTier([]);
            if (key === "status") setStatus([]);
            if (key === "device") setDevice([]);
          })}
        />

        <IndexTable
          resourceName={{ singular: "kayıt", plural: "kayıt" }}
          itemCount={data.rows.length}
          selectable={false}
          headings={[
            { title: "Tarih" },
            { title: "Ödül" },
            { title: "Kod" },
            { title: "Sepet" },
            { title: "Sipariş" },
            { title: "Cihaz" },
            { title: "Durum" },
          ]}
          pagination={{
            hasPrevious: data.page > 1,
            hasNext: data.page < data.pageCount,
            onPrevious: () => goToPage(data.page - 1),
            onNext: () => goToPage(data.page + 1),
            label: `${data.page} / ${data.pageCount} · ${data.total} kayıt`,
          }}
        >
          {data.rows.map((row, index) => (
            <IndexTable.Row id={row.id} key={row.id} position={index}>
              <IndexTable.Cell>
                <Text as="span" variant="bodySm">
                  {new Date(row.createdAt).toLocaleString("tr-TR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                {row.tier ? tierLabel(row.tier as Tier, data.language) : "—"}
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="span" variant="bodySm" fontWeight="medium">
                  {row.code ?? "—"}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>{money(row.cartValue, row.currency)}</IndexTable.Cell>
              <IndexTable.Cell>
                {row.converted ? money(row.orderValue, row.currency) : "—"}
              </IndexTable.Cell>
              <IndexTable.Cell>{deviceLabel(row.device)}</IndexTable.Cell>
              <IndexTable.Cell>
                {row.converted ? (
                  <Badge tone="success">Kurtarıldı</Badge>
                ) : row.completed ? (
                  <Badge tone="attention">Ödül verildi</Badge>
                ) : row.abandoned ? (
                  <Badge>Kapatıldı</Badge>
                ) : (
                  <Badge tone="info">Açıldı</Badge>
                )}
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </Card>
      <BlockStack gap="200" />
    </Page>
  );
}

function buildApplied(
  filters: { tier: string | null; status: string | null; device: string | null },
  remove: (key: string) => void,
) {
  const labels: Record<string, Record<string, string>> = {
    tier: {
      free_shipping: "Kargo bedava",
      "10_percent": "%10 indirim",
      "15_percent": "%15 indirim",
      "20_percent": "%20 indirim",
    },
    status: {
      converted: "Siparişe dönüştü",
      won: "Ödül kazandı",
      abandoned: "Kazımadan kapattı",
    },
    device: { mobile: "Mobil", desktop: "Masaüstü", tablet: "Tablet" },
  };

  return Object.entries(filters)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({
      key,
      label: labels[key]?.[value as string] ?? String(value),
      onRemove: () => remove(key),
    }));
}

function money(value: number, currency: string) {
  if (!value) return "—";
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

function deviceLabel(device: string | null) {
  const map: Record<string, string> = {
    mobile: "Mobil",
    desktop: "Masaüstü",
    tablet: "Tablet",
  };
  return device ? (map[device] ?? device) : "—";
}
