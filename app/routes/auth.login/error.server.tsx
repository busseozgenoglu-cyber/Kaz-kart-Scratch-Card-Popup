import { LoginErrorType, type LoginError } from "@shopify/shopify-app-remix/server";

export function loginErrorMessage(loginErrors: LoginError): { shop?: string } {
  if (loginErrors?.shop === LoginErrorType.MissingShop) {
    return { shop: "Mağaza adresinizi girin." };
  }
  if (loginErrors?.shop === LoginErrorType.InvalidShop) {
    return { shop: "Adres magaza-adi.myshopify.com biçiminde olmalı." };
  }
  return {};
}
