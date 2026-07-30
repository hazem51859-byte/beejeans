-- =====================================================
-- Script to add Inventory Audit System to PostgreSQL
-- Execute this in pgAdmin Query Tool
-- Database: bee_jeans_pos
-- =====================================================

-- First, check if tables already exist
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_audits') THEN
        RAISE NOTICE 'Table inventory_audits already exists - skipping creation';
    ELSE
        RAISE NOTICE 'Creating inventory_audits table...';
    END IF;
END $$;

-- CreateTable: inventory_audits
CREATE TABLE IF NOT EXISTS "inventory_audits" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable: inventory_audit_items
CREATE TABLE IF NOT EXISTS "inventory_audit_items" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_audit_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique index for auditNumber
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_audits_auditNumber_key" 
ON "inventory_audits"("auditNumber");

-- CreateIndex: branchId index
CREATE INDEX IF NOT EXISTS "inventory_audits_branchId_idx" 
ON "inventory_audits"("branchId");

-- CreateIndex: status index
CREATE INDEX IF NOT EXISTS "inventory_audits_status_idx" 
ON "inventory_audits"("status");

-- CreateIndex: auditNumber index (for searching)
CREATE INDEX IF NOT EXISTS "inventory_audits_auditNumber_idx" 
ON "inventory_audits"("auditNumber");

-- CreateIndex: createdAt index (for sorting)
CREATE INDEX IF NOT EXISTS "inventory_audits_createdAt_idx" 
ON "inventory_audits"("createdAt");

-- CreateIndex: auditId index for items
CREATE INDEX IF NOT EXISTS "inventory_audit_items_auditId_idx" 
ON "inventory_audit_items"("auditId");

-- CreateIndex: productId index for items
CREATE INDEX IF NOT EXISTS "inventory_audit_items_productId_idx" 
ON "inventory_audit_items"("productId");

-- AddForeignKey: inventory_audits -> branches
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inventory_audits_branchId_fkey'
    ) THEN
        ALTER TABLE "inventory_audits" 
        ADD CONSTRAINT "inventory_audits_branchId_fkey" 
        FOREIGN KEY ("branchId") 
        REFERENCES "branches"("id") 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key: inventory_audits_branchId_fkey';
    ELSE
        RAISE NOTICE 'Foreign key inventory_audits_branchId_fkey already exists';
    END IF;
END $$;

-- AddForeignKey: inventory_audits -> users (createdBy)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inventory_audits_createdBy_fkey'
    ) THEN
        ALTER TABLE "inventory_audits" 
        ADD CONSTRAINT "inventory_audits_createdBy_fkey" 
        FOREIGN KEY ("createdBy") 
        REFERENCES "users"("id") 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key: inventory_audits_createdBy_fkey';
    ELSE
        RAISE NOTICE 'Foreign key inventory_audits_createdBy_fkey already exists';
    END IF;
END $$;

-- AddForeignKey: inventory_audits -> users (settledBy)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inventory_audits_settledBy_fkey'
    ) THEN
        ALTER TABLE "inventory_audits" 
        ADD CONSTRAINT "inventory_audits_settledBy_fkey" 
        FOREIGN KEY ("settledBy") 
        REFERENCES "users"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key: inventory_audits_settledBy_fkey';
    ELSE
        RAISE NOTICE 'Foreign key inventory_audits_settledBy_fkey already exists';
    END IF;
END $$;

-- AddForeignKey: inventory_audit_items -> inventory_audits
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inventory_audit_items_auditId_fkey'
    ) THEN
        ALTER TABLE "inventory_audit_items" 
        ADD CONSTRAINT "inventory_audit_items_auditId_fkey" 
        FOREIGN KEY ("auditId") 
        REFERENCES "inventory_audits"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key: inventory_audit_items_auditId_fkey';
    ELSE
        RAISE NOTICE 'Foreign key inventory_audit_items_auditId_fkey already exists';
    END IF;
END $$;

-- AddForeignKey: inventory_audit_items -> products
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inventory_audit_items_productId_fkey'
    ) THEN
        ALTER TABLE "inventory_audit_items" 
        ADD CONSTRAINT "inventory_audit_items_productId_fkey" 
        FOREIGN KEY ("productId") 
        REFERENCES "products"("id") 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key: inventory_audit_items_productId_fkey';
    ELSE
        RAISE NOTICE 'Foreign key inventory_audit_items_productId_fkey already exists';
    END IF;
END $$;

-- Record migration in _prisma_migrations table
INSERT INTO "_prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "logs",
    "rolled_back_at",
    "started_at",
    "applied_steps_count"
)
VALUES (
    gen_random_uuid()::text,
    'audit_system_manual_migration',
    NOW(),
    '20260729000000_add_inventory_audit_system',
    NULL,
    NULL,
    NOW(),
    1
)
ON CONFLICT DO NOTHING;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Inventory Audit System tables created successfully!';
    RAISE NOTICE '📋 Tables: inventory_audits, inventory_audit_items';
    RAISE NOTICE '🔑 All foreign keys and indexes added';
END $$;
