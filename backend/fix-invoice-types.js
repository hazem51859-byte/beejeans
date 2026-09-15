const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInvoiceTypes() {
  console.log('🔧 تصحيح أنواع الفواتير الافتتاحية...\n');

  try {
    // تحديث كل الفواتير الافتتاحية من REGULAR إلى CLIENT
    const result = await prisma.officeInvoice.updateMany({
      where: {
        notes: {
          contains: 'رصيد افتتاحي'
        },
        type: 'REGULAR'
      },
      data: {
        type: 'CLIENT'
      }
    });

    console.log(`✅ تم تحديث ${result.count} فاتورة من REGULAR إلى CLIENT\n`);

    // عرض الإحصائيات
    const invoicesByType = await prisma.officeInvoice.groupBy({
      by: ['type'],
      _count: true,
      _sum: {
        total: true,
        remainingAmount: true
      }
    });

    console.log('📊 الفواتير حسب النوع:\n');
    invoicesByType.forEach(group => {
      console.log(`   ${group.type}:`);
      console.log(`   - عدد الفواتير: ${group._count}`);
      console.log(`   - إجمالي المبيعات: ${(group._sum.total || 0).toLocaleString()} جنيه`);
      console.log(`   - الرصيد المتبقي: ${(group._sum.remainingAmount || 0).toLocaleString()} جنيه`);
      console.log('');
    });

    console.log('✅ تم التصحيح بنجاح!\n');
    console.log('💡 دلوقتي الفواتير الافتتاحية هتظهر في "عملاء دائمين" مش "زباين عاديين"');

  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixInvoiceTypes();
