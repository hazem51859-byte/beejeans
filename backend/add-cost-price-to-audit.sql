-- Add unitCostPrice to inventory_audit_items
-- Execute this in pgAdmin Query Tool on bee_jeans_pos database

ALTER TABLE "inventory_audit_items"
ADD COLUMN IF NOT EXISTS "unitCostPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Update existing records to copy costPrice from products
UPDATE "inventory_audit_items" AS ai
SET "unitCostPrice" = p."costPrice"
FROM "products" AS p
WHERE ai."productId" = p."id"
AND ai."unitCostPrice" = 0;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Added unitCostPrice column to inventory_audit_items';
    RAISE NOTICE '✅ Updated existing records with product cost prices';
END $$;
