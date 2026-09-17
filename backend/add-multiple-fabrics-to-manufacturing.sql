-- Add multiple fabrics support to Manufacturing Orders

-- 1. Create new table for manufacturing order fabrics
CREATE TABLE IF NOT EXISTS "manufacturing_order_fabrics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "manufacturingOrderId" TEXT NOT NULL,
  "fabricTypeId" TEXT NOT NULL,
  "metersUsed" DOUBLE PRECISION NOT NULL,
  "fabricCostPerMeter" DOUBLE PRECISION NOT NULL,
  "totalFabricCost" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "manufacturing_order_fabrics_manufacturingOrderId_fkey" 
    FOREIGN KEY ("manufacturingOrderId") REFERENCES "manufacturing_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "manufacturing_order_fabrics_fabricTypeId_fkey" 
    FOREIGN KEY ("fabricTypeId") REFERENCES "fabric_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS "manufacturing_order_fabrics_manufacturingOrderId_idx" 
  ON "manufacturing_order_fabrics"("manufacturingOrderId");
  
CREATE INDEX IF NOT EXISTS "manufacturing_order_fabrics_fabricTypeId_idx" 
  ON "manufacturing_order_fabrics"("fabricTypeId");

-- 3. Add new columns to manufacturing_orders table
ALTER TABLE "manufacturing_orders" 
  ADD COLUMN IF NOT EXISTS "totalFabricCost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "grandTotalCost" DOUBLE PRECISION;

-- 4. Make old fabric columns nullable (for backward compatibility)
ALTER TABLE "manufacturing_orders" 
  ALTER COLUMN "fabricTypeId" DROP NOT NULL,
  ALTER COLUMN "metersUsed" DROP NOT NULL,
  ALTER COLUMN "fabricCostPerMeter" DROP NOT NULL;

-- 5. Migrate existing data to new structure
INSERT INTO "manufacturing_order_fabrics" 
  ("id", "manufacturingOrderId", "fabricTypeId", "metersUsed", "fabricCostPerMeter", "totalFabricCost", "createdAt")
SELECT 
  gen_random_uuid()::text,
  "id" as "manufacturingOrderId",
  "fabricTypeId",
  "metersUsed",
  "fabricCostPerMeter",
  ("metersUsed" * "fabricCostPerMeter") as "totalFabricCost",
  "createdAt"
FROM "manufacturing_orders"
WHERE "fabricTypeId" IS NOT NULL 
  AND "metersUsed" IS NOT NULL 
  AND "fabricCostPerMeter" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "manufacturing_order_fabrics" 
    WHERE "manufacturing_order_fabrics"."manufacturingOrderId" = "manufacturing_orders"."id"
  );

-- 6. Update totalFabricCost in manufacturing_orders
UPDATE "manufacturing_orders" 
SET "totalFabricCost" = ("metersUsed" * "fabricCostPerMeter")
WHERE "metersUsed" IS NOT NULL 
  AND "fabricCostPerMeter" IS NOT NULL
  AND "totalFabricCost" IS NULL;

-- 7. Update grandTotalCost (manufacturing + fabric)
UPDATE "manufacturing_orders" 
SET "grandTotalCost" = COALESCE("totalManufacturingCost", 0) + COALESCE("totalFabricCost", 0)
WHERE "grandTotalCost" IS NULL;
