const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('🔧 إصلاح رصيد مورد مينا فوكس جينز...\n');
  
  // حذف الدفعة الخاطئة
  const supplier = await prisma.supplier.findFirst({
    where: { name: 'مينا فوكس جينز' }
  });

  if (supplier) {
    // حذف الدفعة القديمة
    await prisma.supplierPayment.deleteMany({
      where: {
        supplierId: supplier.id,
        referenceNumber: 'OPENING-BALANCE'
      }
    });

    // تحديث totalPaid
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        totalPaid: 0
      }
    });

    console.log('✅ تم حذف دفعة مينا فوكس جينز الخاطئة');
    console.log('✅ رصيد مينا فوكس = -4,905 ج.م (علينا له)');
    console.log('\n📊 الآن إجمالي أرصدة الموردين = 592,973 ج.م فقط');
  }

  await prisma.$disconnect();
})();
