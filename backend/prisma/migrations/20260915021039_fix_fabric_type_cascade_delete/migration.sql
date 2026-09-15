-- DropForeignKey
ALTER TABLE "fabric_stock" DROP CONSTRAINT "fabric_stock_fabricTypeId_fkey";

-- AddForeignKey
ALTER TABLE "fabric_stock" ADD CONSTRAINT "fabric_stock_fabricTypeId_fkey" FOREIGN KEY ("fabricTypeId") REFERENCES "fabric_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
