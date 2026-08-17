-- Kademelerin indirim yüzdeleri artık satıcı tarafından belirlenir.
-- Varsayılanlar eski sabit değerlerle aynı, böylece mevcut mağazalarda
-- davranış değişmez.
ALTER TABLE "ShopSettings" ADD COLUMN "tier10PercentValue" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "ShopSettings" ADD COLUMN "tier15PercentValue" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "ShopSettings" ADD COLUMN "tier20PercentValue" INTEGER NOT NULL DEFAULT 20;
