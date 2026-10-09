-- CreateTable
CREATE TABLE "CodeAccount" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "loginEmail" TEXT NOT NULL,
    "inboundAddress" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revealSeconds" INTEGER NOT NULL DEFAULT 60,
    "turnSeconds" INTEGER NOT NULL DEFAULT 180,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "revealStartedAt" TIMESTAMP(3),
    "revealedCode" TEXT,
    "revealedText" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CodeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundEmail" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "extractedCode" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedBySessionId" TEXT,
    CONSTRAINT "InboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeAccount_inboundAddress_key" ON "CodeAccount"("inboundAddress");
CREATE INDEX "CodeAccount_productId_idx" ON "CodeAccount"("productId");
CREATE UNIQUE INDEX "CodeSession_purchaseId_key" ON "CodeSession"("purchaseId");
CREATE INDEX "CodeSession_accountId_status_idx" ON "CodeSession"("accountId", "status");
CREATE UNIQUE INDEX "InboundEmail_claimedBySessionId_key" ON "InboundEmail"("claimedBySessionId");
CREATE INDEX "InboundEmail_accountId_receivedAt_idx" ON "InboundEmail"("accountId", "receivedAt");

-- AddForeignKey
ALTER TABLE "CodeAccount" ADD CONSTRAINT "CodeAccount_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DigitalProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CodeSession" ADD CONSTRAINT "CodeSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CodeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CodeSession" ADD CONSTRAINT "CodeSession_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "DigitalPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InboundEmail" ADD CONSTRAINT "InboundEmail_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CodeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
