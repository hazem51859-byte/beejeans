-- CreateTable: customer_store_returns
CREATE TABLE "customer_store_returns" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_store_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable: customer_store_return_items
CREATE TABLE "customer_store_return_items" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "size" TEXT,
    "unitSalePrice" DOUBLE PRECISION NOT NULL,
    "unitCostPrice" DOUBLE PRECISION NOT NULL,
    "totalSalePrice" DOUBLE PRECISION NOT NULL,
    "totalCostPrice" DOUBLE PRECISION NOT NULL,
    "returnReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_store_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_store_returns_returnNumber_key" ON "customer_store_returns"("returnNumber");
CREATE INDEX "customer_store_returns_customerId_idx" ON "customer_store_returns"("customerId");
CREATE INDEX "customer_store_returns_returnNumber_idx" ON "customer_store_returns"("returnNumber");
CREATE INDEX "customer_store_returns_createdAt_idx" ON "customer_store_returns"("createdAt");
CREATE INDEX "customer_store_return_items_returnId_idx" ON "customer_store_return_items"("returnId");
CREATE INDEX "customer_store_return_items_productId_idx" ON "customer_store_return_items"("productId");

-- AddForeignKey
ALTER TABLE "customer_store_returns" ADD CONSTRAINT "customer_store_returns_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_store_returns" ADD CONSTRAINT "customer_store_returns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_store_return_items" ADD CONSTRAINT "customer_store_return_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "customer_store_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_store_return_items" ADD CONSTRAINT "customer_store_return_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
