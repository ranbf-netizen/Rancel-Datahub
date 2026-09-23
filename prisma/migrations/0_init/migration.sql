-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('NOT_STARTED', 'PROCESSING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "PinStatus" AS ENUM ('AVAILABLE', 'SOLD');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AgentTransactionType" AS ENUM ('TOPUP', 'SALE', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "AgentTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiCredits" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataBundle" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataSizeGb" DOUBLE PRECISION NOT NULL,
    "supplierPackageId" TEXT NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestEmail" TEXT,
    "bundleId" TEXT NOT NULL,
    "beneficiaryNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paystackReference" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "supplierOrderId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentCommission" DOUBLE PRECISION,
    "referredByAgentId" TEXT,

    CONSTRAINT "DataOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PinBatch" (
    "id" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pin" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "status" "PinStatus" NOT NULL DEFAULT 'AVAILABLE',
    "soldToUserId" TEXT,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "Pin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PinOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestPhone" TEXT,
    "guestEmail" TEXT,
    "pinId" TEXT,
    "examType" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paystackReference" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PinOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AfaOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT,
    "guestEmail" TEXT,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "cropProduce" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paystackReference" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "supplierId" TEXT,
    "supplierStatus" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AfaOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AfaSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 10,

    CONSTRAINT "AfaSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'PENDING',
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeMarkup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storeSlug" TEXT,

    CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTransaction" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" "AgentTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "paystackReference" TEXT,
    "status" "AgentTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSale" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "beneficiaryNumber" TEXT NOT NULL,
    "resellerCost" DOUBLE PRECISION NOT NULL,
    "customerPrice" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "supplierOrderId" TEXT,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalProduct" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "deliveryType" TEXT NOT NULL DEFAULT 'DOWNLOAD',
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "revealContent" TEXT,
    "coverUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryEstimate" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "instantDelivery" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "platform" TEXT,
    "productType" TEXT NOT NULL DEFAULT 'DIGITAL',
    "quantity" TEXT,
    "requirements" TEXT,
    "stock" INTEGER,
    "smmQuantity" INTEGER,
    "smmServiceId" INTEGER,
    "gmailLabel" TEXT,
    "gmailRevealSeconds" INTEGER NOT NULL DEFAULT 60,
    "deliveryMethods" TEXT NOT NULL DEFAULT 'DIGITAL',
    "optionsJson" TEXT,
    "requireWhatsapp" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DigitalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalPurchase" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "guestEmail" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paystackReference" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "smmOrderId" TEXT,
    "smmStatus" TEXT,
    "socialLink" TEXT,
    "revealStartedAt" TIMESTAMP(3),
    "revealedGmailText" TEXT,
    "chosenOption" TEXT,
    "deliveryMethod" TEXT,
    "whatsapp" TEXT,

    CONSTRAINT "DigitalPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCreditPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paystackReference" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "path" TEXT,
    "productId" TEXT,
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmmSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "markupPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "usdToGhs" DOUBLE PRECISION NOT NULL DEFAULT 14,

    CONSTRAINT "SmmSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoostOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "serviceName" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paystackReference" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "panelOrderId" TEXT,
    "panelStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoostOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "DataOrder_paystackReference_key" ON "DataOrder"("paystackReference");

-- CreateIndex
CREATE UNIQUE INDEX "Pin_batchId_serialNumber_key" ON "Pin"("batchId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PinOrder_pinId_key" ON "PinOrder"("pinId");

-- CreateIndex
CREATE UNIQUE INDEX "PinOrder_paystackReference_key" ON "PinOrder"("paystackReference");

-- CreateIndex
CREATE UNIQUE INDEX "AfaOrder_paystackReference_key" ON "AfaOrder"("paystackReference");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_userId_key" ON "AgentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_storeSlug_key" ON "AgentProfile"("storeSlug");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTransaction_paystackReference_key" ON "AgentTransaction"("paystackReference");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalPurchase_paystackReference_key" ON "DigitalPurchase"("paystackReference");

-- CreateIndex
CREATE UNIQUE INDEX "AiCreditPurchase_paystackReference_key" ON "AiCreditPurchase"("paystackReference");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_source_idx" ON "AnalyticsEvent"("source");

-- CreateIndex
CREATE UNIQUE INDEX "BoostOrder_paystackReference_key" ON "BoostOrder"("paystackReference");

-- AddForeignKey
ALTER TABLE "DataOrder" ADD CONSTRAINT "DataOrder_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "DataBundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataOrder" ADD CONSTRAINT "DataOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pin" ADD CONSTRAINT "Pin_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PinBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinOrder" ADD CONSTRAINT "PinOrder_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "Pin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinOrder" ADD CONSTRAINT "PinOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AfaOrder" ADD CONSTRAINT "AfaOrder_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AfaOrder" ADD CONSTRAINT "AfaOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTransaction" ADD CONSTRAINT "AgentTransaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSale" ADD CONSTRAINT "AgentSale_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSale" ADD CONSTRAINT "AgentSale_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "DataBundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalPurchase" ADD CONSTRAINT "DigitalPurchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DigitalProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoostOrder" ADD CONSTRAINT "BoostOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

