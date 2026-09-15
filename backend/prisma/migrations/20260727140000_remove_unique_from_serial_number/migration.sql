-- DropIndex
DROP INDEX IF EXISTS "product_serials_serialNumber_key";

-- AlterTable
-- serialNumber is now non-unique to allow multiple pieces with same barcode
