-- =====================================================
-- Migration Script for pgAdmin
-- تحديث جدول transfer_items ليشتغل مع النظام الجديد
-- =====================================================

-- الخطوة 1: حذف الجدول القديم (لأنه فاضي)
DROP TABLE IF EXISTS "transfer_items" CASCADE;

-- الخطوة 2: إنشاء الجدول الجديد بالبنية المبسطة
CREATE TABLE "transfer_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityRequested" INTEGER NOT NULL,
    "quantityReceived" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT "transfer_items_transferId_fkey" 
        FOREIGN KEY ("transferId") 
        REFERENCES "transfers" ("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    CONSTRAINT "transfer_items_productId_fkey" 
        FOREIGN KEY ("productId") 
        REFERENCES "products" ("id") 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- الخطوة 3: إنشاء Indexes لتحسين الأداء
CREATE INDEX "transfer_items_transferId_idx" ON "transfer_items"("transferId");
CREATE INDEX "transfer_items_productId_idx" ON "transfer_items"("productId");

-- الخطوة 4: إضافة Trigger لتحديث updatedAt تلقائياً
CREATE OR REPLACE FUNCTION update_transfer_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transfer_items_updated_at
    BEFORE UPDATE ON "transfer_items"
    FOR EACH ROW
    EXECUTE FUNCTION update_transfer_items_updated_at();

-- =====================================================
-- انتهى السكريبت بنجاح!
-- =====================================================

-- للتحقق من البنية الجديدة:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'transfer_items'
-- ORDER BY ordinal_position;
