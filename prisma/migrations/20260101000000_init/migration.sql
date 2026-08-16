-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL DEFAULT 'both',
    "inactivitySeconds" INTEGER NOT NULL DEFAULT 90,
    "maxDisplaysPerSession" INTEGER NOT NULL DEFAULT 1,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "title" TEXT NOT NULL DEFAULT 'SİZE ÖZEL BİR HEDİYE',
    "subtitle" TEXT NOT NULL DEFAULT 'Kaplamayı kazıyın, hediyeniz sepete işlensin.',
    "scratchText" TEXT NOT NULL DEFAULT 'KAZI',
    "backgroundColor" TEXT NOT NULL DEFAULT '#0B0A12',
    "cardColor" TEXT NOT NULL DEFAULT '#D8BE8D',
    "revealColor" TEXT NOT NULL DEFAULT '#E8C88A',
    "textColor" TEXT NOT NULL DEFAULT '#141126',
    "fontFamily" TEXT NOT NULL DEFAULT 'system',
    "tierFreeShippingProb" INTEGER NOT NULL DEFAULT 50,
    "tier10PercentProb" INTEGER NOT NULL DEFAULT 30,
    "tier15PercentProb" INTEGER NOT NULL DEFAULT 15,
    "tier20PercentProb" INTEGER NOT NULL DEFAULT 5,
    "freeShippingThreshold" DECIMAL(10,2) DEFAULT 150.00,
    "minCartValue" DECIMAL(10,2) DEFAULT 50.00,
    "discountValidMinutes" INTEGER NOT NULL DEFAULT 30,
    "autoApply" BOOLEAN NOT NULL DEFAULT true,
    "showConfetti" BOOLEAN NOT NULL DEFAULT true,
    "enableHaptic" BOOLEAN NOT NULL DEFAULT true,
    "mobileFullScreen" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'tr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scratch" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "cartToken" TEXT,
    "displayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scratchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "tierWon" TEXT,
    "discountCode" TEXT,
    "discountValue" DECIMAL(10,2),
    "cartValueBefore" DECIMAL(10,2),
    "cartValueAfter" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "convertedToOrder" BOOLEAN NOT NULL DEFAULT false,
    "orderId" TEXT,
    "orderValue" DECIMAL(10,2),
    "recoveredAt" TIMESTAMP(3),
    "deviceType" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scratch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "shopifyDiscountId" TEXT,
    "shopifyGid" TEXT,
    "tier" TEXT NOT NULL,
    "value" DECIMAL(10,2),
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "scratchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "displays" INTEGER NOT NULL DEFAULT 0,
    "scratches" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "abandonments" INTEGER NOT NULL DEFAULT 0,
    "cartValueTotal" DECIMAL(12,2) DEFAULT 0,
    "discountTotal" DECIMAL(12,2) DEFAULT 0,
    "revenueTotal" DECIMAL(12,2) DEFAULT 0,
    "freeShippingCount" INTEGER NOT NULL DEFAULT 0,
    "percent10Count" INTEGER NOT NULL DEFAULT 0,
    "percent15Count" INTEGER NOT NULL DEFAULT 0,
    "percent20Count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageQuota" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "scratchesUsed" INTEGER NOT NULL DEFAULT 0,
    "scratchesLimit" INTEGER NOT NULL DEFAULT 50,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopDomain_key" ON "Shop"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shopId_key" ON "ShopSettings"("shopId");

-- CreateIndex
CREATE INDEX "Scratch_shopId_createdAt_idx" ON "Scratch"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "Scratch_shopId_discountCode_idx" ON "Scratch"("shopId", "discountCode");

-- CreateIndex
CREATE INDEX "Scratch_sessionId_idx" ON "Scratch"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_shopId_expiresAt_idx" ON "DiscountCode"("shopId", "expiresAt");

-- CreateIndex
CREATE INDEX "DiscountCode_shopId_isUsed_idx" ON "DiscountCode"("shopId", "isUsed");

-- CreateIndex
CREATE INDEX "Analytics_shopId_date_idx" ON "Analytics"("shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Analytics_shopId_date_key" ON "Analytics"("shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UsageQuota_shopId_key" ON "UsageQuota"("shopId");

-- AddForeignKey
ALTER TABLE "ShopSettings" ADD CONSTRAINT "ShopSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scratch" ADD CONSTRAINT "Scratch_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageQuota" ADD CONSTRAINT "UsageQuota_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
┌─────────────────────────────────────────────────────────┐
│  Update available 6.19.3 -> 7.9.1                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

