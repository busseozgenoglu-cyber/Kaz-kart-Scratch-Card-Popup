import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "~/shopify.server";
import { ensureShop } from "~/lib/shop.server";
import { ensureExpiringToken } from "~/lib/token-migration.server";
import { purgeExpiredScratchesThrottled } from "~/lib/retention.server";
import { planByKey, syncPlan, type PlanKey } from "~/lib/billing.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, billing } = await authenticate.admin(request);

  // Süresiz offline token'lar Admin API'de reddediliyor. Merchant paneli
  // açtığında taşımayı burada da tetikliyoruz, böylece mağaza vitrinde ilk
  // kazıma denemesini beklemek zorunda kalmıyor. Bu yüklemedeki `billing`
  // istemcisi hâlâ eski token'ı taşır; bir sonraki yüklemede yenisi okunur.
  await ensureExpiringToken(session);

  const shop = await ensureShop(session.shop);

  // Saklama süresi dolan kişisel veriyi günde bir kez temizler.
  await purgeExpiredScratchesThrottled();

  // Aktif aboneliği her yüklemede Shopify'dan doğrula; panel ile fatura
  // durumu birbirinden ayrışmasın.
  let planKey: PlanKey = "free";
  try {
    const { appSubscriptions } = await billing.check();
    const active = appSubscriptions?.[0]?.name;
    if (active) {
      const match = active.toLowerCase() as PlanKey;
      if (["starter", "growth", "enterprise"].includes(match)) planKey = match;
    }
  } catch {
    planKey = "free";
  }

  if (shop.plan !== planKey) {
    await syncPlan(shop.id, planKey);
  }

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    plan: planByKey(planKey).name,
  };
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Genel bakış
        </Link>
        <Link to="/app/settings">Bilet ayarları</Link>
        <Link to="/app/analytics">Raporlar</Link>
        <Link to="/app/scratches">Kazıma günlüğü</Link>
        <Link to="/app/plans">Plan</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
