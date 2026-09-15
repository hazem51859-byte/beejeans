-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "unitRetailPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transfer_items" ADD COLUMN     "retailPrice" DOUBLE PRECISION DEFAULT 0;
