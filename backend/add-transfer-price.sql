-- Add transferPrice column to transfer_items table
-- This represents the price at which each item was transferred to the branch

ALTER TABLE transfer_items 
ADD COLUMN IF NOT EXISTS "transferPrice" DECIMAL(10, 2) DEFAULT 0;

-- Update existing records: set transferPrice to product's wholesalePrice
UPDATE transfer_items ti
SET "transferPrice" = COALESCE(p."wholesalePrice", p."costPrice")
FROM products p
WHERE ti."productId" = p.id
  AND (ti."transferPrice" IS NULL OR ti."transferPrice" = 0);

-- Make it NOT NULL after setting defaults
ALTER TABLE transfer_items 
ALTER COLUMN "transferPrice" SET NOT NULL;

SELECT 'transferPrice column added successfully to transfer_items table' as status;
