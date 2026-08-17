-- Süreli (expiring) offline access token desteği.
-- Shopify, 1 Nisan 2026'dan sonra public dağıtıma geçen uygulamalarda süresiz
-- offline token'ları reddediyor; Admin API gövdesiz 403 Forbidden dönüyor.
-- Kütüphane token'ı bu iki alanla kendisi yeniler.
ALTER TABLE "Session" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "Session" ADD COLUMN "refreshTokenExpires" TIMESTAMP(3);
