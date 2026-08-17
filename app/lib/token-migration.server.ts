import { RequestedTokenType, Session } from "@shopify/shopify-api";
import { sessionStorage } from "~/shopify.server";

/**
 * Süresiz offline access token'ları süreli olanlara taşır.
 *
 * Shopify süresiz offline token'ları Admin API'de artık kabul etmiyor:
 *   "[API] Non-expiring access tokens are no longer accepted for the Admin API."
 * Yanıt gövdesiz 403 Forbidden olur ve normalde her Admin API yanıtında bulunan
 * `x-shopify-shop-api-call-limit` başlığı hiç gelmez — yani istek
 * yetkilendirmeyi geçemez ve hatanın sebebi yalnızca gövdede yazar.
 *
 * `future.expiringOfflineAccessTokens` bayrağı yalnızca YENİ kurulumları
 * etkiler; bayraktan önce kurulmuş mağazaların token'ı elle taşınmalıdır ve
 * kütüphane bunu kendiliğinden yapmaz. Taşıma merchant müdahalesi gerektirmez:
 * mevcut token bir token exchange ile yenisiyle takas edilir.
 *
 * Not: kütüphanenin `auth.migrateToExpiringToken` yardımcısı `shopifyApp`
 * nesnesinden erişilebilir değil (`api` alanı çalışma zamanında yok, `deriveApi`
 * de paketin genel arayüzünde dışa verilmiyor), bu yüzden aynı token exchange
 * burada doğrudan yapılıyor.
 */

const TOKEN_EXCHANGE_GRANT_TYPE =
  "urn:ietf:params:oauth:grant-type:token-exchange";

type AccessTokenResponse = {
  access_token: string;
  scope: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

/**
 * Taşıma mağaza başına tek seferliktir ve geri alınamaz, bu yüzden yalnızca
 * `refreshToken` yokken denenir. Başarısız olursa çağıran akış eski token'la
 * devam eder ve kendi hata yolunu izler; sebep loglanır.
 */
export async function ensureExpiringToken(session: Session): Promise<Session> {
  if (session.refreshToken || !session.accessToken || session.isOnline) {
    return session;
  }

  try {
    const response = await fetch(
      `https://${session.shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
          subject_token: session.accessToken,
          subject_token_type: RequestedTokenType.OfflineAccessToken,
          requested_token_type: RequestedTokenType.OfflineAccessToken,
          expiring: "1",
        }),
      },
    );

    const body = (await response.json()) as AccessTokenResponse & {
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !body.access_token) {
      throw new Error(
        `token exchange ${response.status}: ${
          body.error_description ?? body.error ?? "yanıt gövdesi boş"
        }`,
      );
    }

    const expiresAt = (seconds?: number) =>
      seconds ? new Date(Date.now() + seconds * 1000) : undefined;

    const migrated = new Session({
      // Offline oturum kimliği mağaza başına sabittir; mevcut kaydın üzerine
      // yazılır, böylece eski token geride kalmaz.
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: false,
      accessToken: body.access_token,
      scope: body.scope,
      expires: expiresAt(body.expires_in),
      ...(body.refresh_token && body.refresh_token_expires_in
        ? {
            refreshToken: body.refresh_token,
            refreshTokenExpires: expiresAt(body.refresh_token_expires_in),
          }
        : {}),
    });

    await sessionStorage.storeSession(migrated);
    console.info(
      "[scratchcart] süresiz token süreli token'a taşındı",
      JSON.stringify({
        shop: session.shop,
        expires: migrated.expires ?? null,
        hasRefreshToken: Boolean(migrated.refreshToken),
      }),
    );
    return migrated;
  } catch (error) {
    console.error(
      "[scratchcart] token taşınamadı",
      JSON.stringify({
        shop: session.shop,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return session;
  }
}
