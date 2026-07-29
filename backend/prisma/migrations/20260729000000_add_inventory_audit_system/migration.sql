-- CreateTable
CREATE TABLE "inventory_audits" (
    "id" TEXT NOT NULL,
    "auditNumber" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "itemsWithShortage" INTEGER NOT NULL DEFAULT 0,
    "itemsWithSurplus" INTEGER NOT NULL DEFAULT 0,
    "totalShortageQty" INTEGER NOT NULL DEFAULT 0,
    "totalSurplusQty" INTEGER NOT NULL DEFAULT 0,
    "totalShortageValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSurplusValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "settledBy" TEXT,
    "settledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_audit_items" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,
    "actualQty" INTEGER,
    "differenceQty" INTEGER,
    "differenceType" TEXT,
    "differenceValue" DOUBLE PRECISION,
    "unitSalePrice" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_audit_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_audits_auditNumber_key" ON "inventory_audits"("auditNumber");

-- CreateIndex
CREATE INDEX "inventory_audits_branchId_idx" ON "inventory_audits"("branchId");

-- CreateIndex
CREATE INDEX "inventory_audits_status_idx" ON "inventory_audits"("status");

-- CreateIndex
CREATE INDEX "inventory_audits_auditNumber_idx" ON "inventory_audits"("auditNumber");

-- CreateIndex
CREATE INDEX "inventory_audits_createdAt_idx" ON "inventory_audits"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_audit_items_auditId_idx" ON "inventory_audit_items"("auditId");

-- CreateIndex
CREATE INDEX "inventory_audit_items_productId_idx" ON "inventory_audit_items"("productId");

-- AddForeignKey
ALTER TABLE "inventory_audits" ADD CONSTRAINT "inventory_audits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_audits" ADD CONSTRAINT "inventory_audits_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_audits" ADD CONSTRAINT "inventory_audits_settledBy_fkey" FOREIGN KEY ("settledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_audit_items" ADD CONSTRAINT "inventory_audit_items_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "inventory_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_audit_items" ADD CONSTRAINT "inventory_audit_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
