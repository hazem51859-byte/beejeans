-- AlterTable
ALTER TABLE "transfer_items" ADD COLUMN     "costPrice" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "sellingPrice" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "transfers" ADD COLUMN     "totalCost" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalSellingPrice" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "office_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shipmentCompany" TEXT,
    "shipmentBill" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "size" TEXT,
    "unitCostPrice" DOUBLE PRECISION NOT NULL,
    "unitSalePrice" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "totalSale" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "shipmentCompany" TEXT NOT NULL,
    "shipmentBill" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shippedAt" TIMESTAMP(3),
    "estimatedDelivery" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "paymentCollected" BOOLEAN NOT NULL DEFAULT false,
    "paymentCollectedAt" TIMESTAMP(3),
    "collectedAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "trackingNotes" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "office_invoices_invoiceNumber_key" ON "office_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "office_invoices_type_idx" ON "office_invoices"("type");

-- CreateIndex
CREATE INDEX "office_invoices_customerId_idx" ON "office_invoices"("customerId");

-- CreateIndex
CREATE INDEX "office_invoices_status_idx" ON "office_invoices"("status");

-- CreateIndex
CREATE INDEX "office_invoices_invoiceNumber_idx" ON "office_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "office_invoices_createdAt_idx" ON "office_invoices"("createdAt");

-- CreateIndex
CREATE INDEX "office_invoice_items_invoiceId_idx" ON "office_invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "office_invoice_items_productId_idx" ON "office_invoice_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipmentNumber_key" ON "shipments"("shipmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_invoiceId_key" ON "shipments"("invoiceId");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_shipmentNumber_idx" ON "shipments"("shipmentNumber");

-- CreateIndex
CREATE INDEX "shipments_shipmentCompany_idx" ON "shipments"("shipmentCompany");

-- CreateIndex
CREATE INDEX "shipments_shippedAt_idx" ON "shipments"("shippedAt");

-- AddForeignKey
ALTER TABLE "office_invoices" ADD CONSTRAINT "office_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_invoice_items" ADD CONSTRAINT "office_invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "office_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_invoice_items" ADD CONSTRAINT "office_invoice_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "office_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
