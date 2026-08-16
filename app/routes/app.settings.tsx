import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  ChoiceList,
  Checkbox,
  Divider,
  InlineError,
  InlineStack,
  Layout,
  Page,
  RangeSlider,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { ensureShop, parseSettingsForm } from "~/lib/shop.server";
import { TicketPreview } from "~/components/TicketPreview";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await ensureShop(session.shop);

  return {
    plan: shop.plan,
    settings: {
      ...shop.settings,
      freeShippingThreshold: Number(shop.settings.freeShippingThreshold ?? 0),
      minCartValue: Number(shop.settings.minCartValue ?? 0),
      createdAt: shop.settings.createdAt.toISOString(),
      updatedAt: shop.settings.updatedAt.toISOString(),
    },
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await ensureShop(session.shop);

  const form = await request.formData();
  const { data, errors } = parseSettingsForm(form);

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  await prisma.shopSettings.update({
    where: { shopId: shop.id },
    data,
  });

  return { ok: true, errors: {} as Record<string, string> };
}

type FormState = ReturnType<typeof useLoaderData<typeof loader>>["settings"];

export default function Settings() {
  const { settings, plan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [form, setForm] = useState<FormState>(settings);
  const [toast, setToast] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(settings),
    [form, settings],
  );

  const saving = fetcher.state !== "idle";
  const errors = fetcher.data?.errors ?? {};

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      setToast("Ayarlar kaydedildi");
      const timer = setTimeout(() => setToast(null), 2600);
      return () => clearTimeout(timer);
    }
  }, [fetcher.state, fetcher.data]);

  const update = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const probabilityTotal =
    form.tierFreeShippingProb +
    form.tier10PercentProb +
    form.tier15PercentProb +
    form.tier20PercentProb;

  const save = () => {
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      payload.append(key, String(value));
    });
    fetcher.submit(payload, { method: "post" });
  };

  const discard = () => setForm(settings);
  const freePlan = plan === "free";

  return (
    <Page
      primaryAction={{
        content: "Değişiklikleri kaydet",
        onAction: save,
        loading: saving,
        disabled: !dirty || probabilityTotal !== 100,
      }}
      secondaryActions={
        dirty
          ? [{ content: "Vazgeç", onAction: discard, disabled: saving }]
          : undefined
      }
    >
      <TitleBar title="Bilet ayarları" />

      <BlockStack gap="400">
        {toast && (
          <Banner tone="success" onDismiss={() => setToast(null)}>
            {toast}
          </Banner>
        )}

        {freePlan && (
          <Banner tone="info" title="Ücretsiz planda iki ödül dağıtılır">
            <p>
              Kargo bedava ve %10 indirim aktif. %15 ve %20 kademeleri ücretli
              planlarda açılır — oranları şimdiden ayarlayabilirsiniz.
            </p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Yayın durumu
                    </Text>
                    <Badge tone={form.enabled ? "success" : "critical"}>
                      {form.enabled ? "Yayında" : "Kapalı"}
                    </Badge>
                  </InlineStack>
                  <Checkbox
                    label="Kazı kazan biletini müşterilere göster"
                    helpText="Kapattığınızda bilet hiçbir sayfada açılmaz; ayarlarınız korunur."
                    checked={form.enabled}
                    onChange={(value) => update("enabled", value)}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Bilet ne zaman açılsın
                  </Text>

                  <ChoiceList
                    title="Tetikleyici"
                    titleHidden
                    choices={[
                      {
                        label: "Sayfadan ayrılmaya çalıştığında",
                        value: "exit_intent",
                        helpText:
                          "Masaüstünde imleç sekmeye doğru çıkarken, mobilde geri tuşunda.",
                      },
                      {
                        label: "Belirli bir süre hareketsiz kalınca",
                        value: "inactivity",
                      },
                      { label: "Her ikisi de", value: "both" },
                    ]}
                    selected={[form.triggerType]}
                    onChange={(value) => update("triggerType", value[0])}
                  />

                  {form.triggerType !== "exit_intent" && (
                    <RangeSlider
                      label="Hareketsizlik süresi"
                      value={form.inactivitySeconds}
                      min={15}
                      max={300}
                      step={5}
                      suffix={<Suffix>{form.inactivitySeconds} sn</Suffix>}
                      onChange={(value) => update("inactivitySeconds", Number(value))}
                    />
                  )}

                  <InlineStack gap="400" wrap={false}>
                    <Box width="100%">
                      <TextField
                        label="Aynı ziyaretçiye günde en fazla"
                        type="number"
                        min={1}
                        max={5}
                        suffix="gösterim"
                        value={String(form.maxDisplaysPerSession)}
                        onChange={(value) =>
                          update("maxDisplaysPerSession", Number(value))
                        }
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="100%">
                      <TextField
                        label="İki gösterim arası bekleme"
                        type="number"
                        min={0}
                        suffix="dakika"
                        value={String(form.cooldownMinutes)}
                        onChange={(value) => update("cooldownMinutes", Number(value))}
                        autoComplete="off"
                      />
                    </Box>
                  </InlineStack>

                  <TextField
                    label="Bileti göstermek için gereken en düşük sepet tutarı"
                    type="number"
                    min={0}
                    prefix="₺"
                    helpText="Bu tutarın altındaki sepetlerde bilet açılmaz."
                    value={String(form.minCartValue)}
                    onChange={(value) => update("minCartValue", Number(value))}
                    autoComplete="off"
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Ödüller ve çıkma oranları
                  </Text>

                  <ProbabilityField
                    label="Kargo bedava"
                    value={form.tierFreeShippingProb}
                    onChange={(value) => update("tierFreeShippingProb", value)}
                  />
                  <ProbabilityField
                    label="%10 indirim"
                    value={form.tier10PercentProb}
                    onChange={(value) => update("tier10PercentProb", value)}
                  />
                  <ProbabilityField
                    label="%15 indirim"
                    value={form.tier15PercentProb}
                    onChange={(value) => update("tier15PercentProb", value)}
                    locked={freePlan}
                  />
                  <ProbabilityField
                    label="%20 indirim"
                    value={form.tier20PercentProb}
                    onChange={(value) => update("tier20PercentProb", value)}
                    locked={freePlan}
                  />

                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Toplam
                    </Text>
                    <Text
                      as="span"
                      variant="bodySm"
                      fontWeight="semibold"
                      tone={probabilityTotal === 100 ? "success" : "critical"}
                    >
                      %{probabilityTotal}
                    </Text>
                  </InlineStack>
                  {probabilityTotal !== 100 && (
                    <InlineError
                      message={`Oranların toplamı 100 olmalı. Şu an ${probabilityTotal}.`}
                      fieldID="probabilities"
                    />
                  )}
                  {errors.probabilities && (
                    <InlineError message={errors.probabilities} fieldID="probabilities" />
                  )}

                  <Divider />

                  <InlineStack gap="400" wrap={false}>
                    <Box width="100%">
                      <TextField
                        label="Kargo bedava alt sınırı"
                        type="number"
                        min={0}
                        prefix="₺"
                        helpText="Bu tutarın üzerindeki sepetlerde geçerli olur."
                        value={String(form.freeShippingThreshold)}
                        onChange={(value) =>
                          update("freeShippingThreshold", Number(value))
                        }
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="100%">
                      <TextField
                        label="Kodun geçerlilik süresi"
                        type="number"
                        min={5}
                        max={1440}
                        suffix="dakika"
                        helpText="Kısa süre aciliyet yaratır; 30 dakika iyi bir başlangıçtır."
                        value={String(form.discountValidMinutes)}
                        onChange={(value) =>
                          update("discountValidMinutes", Number(value))
                        }
                        autoComplete="off"
                      />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Bilet metinleri ve renkleri
                  </Text>

                  <TextField
                    label="Başlık"
                    value={form.title}
                    onChange={(value) => update("title", value)}
                    error={errors.title}
                    maxLength={60}
                    showCharacterCount
                    autoComplete="off"
                  />
                  <TextField
                    label="Alt başlık"
                    value={form.subtitle}
                    onChange={(value) => update("subtitle", value)}
                    maxLength={120}
                    showCharacterCount
                    autoComplete="off"
                  />
                  <TextField
                    label="Kaplamanın üzerindeki yazı"
                    value={form.scratchText}
                    onChange={(value) => update("scratchText", value)}
                    error={errors.scratchText}
                    maxLength={14}
                    autoComplete="off"
                  />

                  <InlineStack gap="300" wrap>
                    <ColorField
                      label="Perde"
                      value={form.backgroundColor}
                      error={errors.backgroundColor}
                      onChange={(value) => update("backgroundColor", value)}
                    />
                    <ColorField
                      label="Kaplama"
                      value={form.cardColor}
                      error={errors.cardColor}
                      onChange={(value) => update("cardColor", value)}
                    />
                    <ColorField
                      label="Vurgu rengi"
                      value={form.revealColor}
                      error={errors.revealColor}
                      onChange={(value) => update("revealColor", value)}
                    />
                    <ColorField
                      label="Kart yüzeyi"
                      value={form.textColor}
                      error={errors.textColor}
                      onChange={(value) => update("textColor", value)}
                    />
                  </InlineStack>

                  <Select
                    label="Yazı tipi"
                    options={[
                      { label: "Mağaza temasıyla aynı", value: "system" },
                      { label: "Inter", value: "Inter" },
                      { label: "Poppins", value: "Poppins" },
                      { label: "Montserrat", value: "Montserrat" },
                      { label: "Roboto", value: "Roboto" },
                    ]}
                    value={form.fontFamily}
                    onChange={(value) => update("fontFamily", value)}
                    helpText="Seçtiğiniz yazı tipi temanızda yüklü değilse tema yazı tipi kullanılır."
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Davranış
                  </Text>
                  <Checkbox
                    label="Kazanılan indirimi sepete kendiliğinden işle"
                    helpText="Kapalıyken müşteri kodu kendisi kopyalar."
                    checked={form.autoApply}
                    onChange={(value) => update("autoApply", value)}
                  />
                  <Checkbox
                    label="Kazandığında konfeti göster"
                    checked={form.showConfetti}
                    onChange={(value) => update("showConfetti", value)}
                  />
                  <Checkbox
                    label="Mobilde titreşim ver"
                    checked={form.enableHaptic}
                    onChange={(value) => update("enableHaptic", value)}
                  />
                  <Checkbox
                    label="Mobilde tam ekran aç"
                    checked={form.mobileFullScreen}
                    onChange={(value) => update("mobileFullScreen", value)}
                  />
                  <Select
                    label="Bilet dili"
                    options={[
                      { label: "Türkçe", value: "tr" },
                      { label: "English", value: "en" },
                      { label: "Español", value: "es" },
                    ]}
                    value={form.language}
                    onChange={(value) => update("language", value)}
                  />
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Box position="sticky" insetBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Önizleme
                    </Text>
                    <Text as="span" variant="bodyXs" tone="subdued">
                      Kazıyabilirsiniz
                    </Text>
                  </InlineStack>
                  <TicketPreview
                    settings={{
                      title: form.title,
                      subtitle: form.subtitle,
                      scratchText: form.scratchText,
                      backgroundColor: form.backgroundColor,
                      cardColor: form.cardColor,
                      revealColor: form.revealColor,
                      textColor: form.textColor,
                    }}
                  />
                  <Button
                    variant="primary"
                    onClick={save}
                    loading={saving}
                    disabled={!dirty || probabilityTotal !== 100}
                    fullWidth
                  >
                    Değişiklikleri kaydet
                  </Button>
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function Suffix({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 52, textAlign: "right" }}>
      <Text as="span" variant="bodySm" tone="subdued">
        {children}
      </Text>
    </div>
  );
}

function ProbabilityField({
  label,
  value,
  onChange,
  locked,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  locked?: boolean;
}) {
  return (
    <RangeSlider
      label={locked ? `${label} · ücretli planda dağıtılır` : label}
      value={value}
      min={0}
      max={100}
      step={1}
      suffix={<Suffix>%{value}</Suffix>}
      onChange={(next) => onChange(Number(next))}
    />
  );
}

function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <Box width="150px">
      <BlockStack gap="100">
        <Text as="span" variant="bodySm">
          {label}
        </Text>
        <InlineStack gap="200" blockAlign="center">
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={label}
            style={{
              width: 36,
              height: 36,
              border: "1px solid #d9d9d9",
              borderRadius: 8,
              padding: 2,
              background: "#fff",
              cursor: "pointer",
            }}
          />
          <Box width="90px">
            <TextField
              label={label}
              labelHidden
              value={value}
              onChange={onChange}
              autoComplete="off"
              error={Boolean(error)}
            />
          </Box>
        </InlineStack>
        {error && <InlineError message={error} fieldID={label} />}
      </BlockStack>
    </Box>
  );
}
