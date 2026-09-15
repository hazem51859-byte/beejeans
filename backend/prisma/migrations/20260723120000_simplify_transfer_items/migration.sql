-- SimplifyTransferItems: Remove old category-based fields, keep only product-based structure
-- Since table is empty, we can safely drop and recreate

-- Drop the old table
DROP TABLE IF EXISTS "transfer_items";

-- Create new simplified structure
CREATE TABLE "transfer_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityRequested" INTEGER NOT NULL,
    "quantityReceived" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "transfer_items_transferId_fkey" 
        FOREIGN KEY ("transferId") REFERENCES "transfers" ("id") 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    CONSTRAINT "transfer_items_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "products" ("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX "transfer_items_transferId_idx" ON "transfer_items"("transferId");
CREATE INDEX "transfer_items_productId_idx" ON "transfer_items"("productId");
