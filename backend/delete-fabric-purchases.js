const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const deleted = await prisma.fabricPurchase.deleteMany({ 
    where: { invoiceNumber: { startsWith: 'OPENING-FABRIC-' } } 
  });
  console.log(`✅ تم حذف ${deleted.count} فاتورة شراء قماش`);
  console.log('✅ القماش باقي في المخزن كرصيد افتتاحي فقط');
  await prisma.$disconnect();
})();
