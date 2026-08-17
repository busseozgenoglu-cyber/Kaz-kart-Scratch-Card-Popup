import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import {
  ENTERPRISE_PLAN,
  GROWTH_PLAN,
  STARTER_PLAN,
} from "./lib/billing.server";

const shopify = shopifyApp({
  // Anahtarlar `plans.ts`'deki BillingPlanName sabitleriyle birebir aynıdır.
  // Yapılandırma inline yazılır: ayrı bir sabite çıkarıldığında TypeScript
  // `currencyCode`/`interval` alanlarını genişletiyor ve tip uyuşmuyor.
  billing: {
    [STARTER_PLAN]: {
      lineItems: [
        {
          amount: 19,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
      trialDays: 7,
    },
    [GROWTH_PLAN]: {
      lineItems: [
        {
          amount: 39,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
      trialDays: 15,
    },
    [ENTERPRISE_PLAN]: {
      lineItems: [
        {
          amount: 79,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
      trialDays: 15,
    },
  },
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    // `removeRest` v4'te kaldırıldı: REST istemcisi artık hiç paketlenmiyor,
    // bayrağa gerek yok.
    // Shopify, 1 Nisan 2026'dan sonra public dağıtıma geçen uygulamalarda
    // süresiz offline access token kabul etmiyor. Bayrak kapalıyken tüm Admin
    // API çağrıları — basit okumalar dahil — gövdesiz 403 Forbidden alıyor.
    // Açıkken kütüphane 90 günlük refresh token ile erişim token'ını kendisi
    // yeniler (Session.refreshToken / refreshTokenExpires alanları).
    expiringOfflineAccessTokens: true,
  },
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
