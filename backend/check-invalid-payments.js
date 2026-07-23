const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvalidPayments() {
  console.log('🔍 البحث عن فواتير بها أخطاء في المدفوعات...\n');

  // Check all sales
  const allSales = await prisma.sale.findMany({
    where: {
      status: 'COMPLETED'
    },
    include: {
      customer: true,
      branch: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`📊 إجمالي الفواتير: ${allSales.length}\n`);

  let invalidCount = 0;
  let fixedCount = 0;

  for (const sale of allSales) {
    // Check if amountPaid > total (ERROR!)
    if (sale.amountPaid > sale.total) {
      invalidCount++;
      const excess = sale.amountPaid - sale.total;
      
      console.log(`❌ فاتورة خطأ: ${sale.invoiceNumber}`);
      console.log(`   الفرع: ${sale.branch?.name || 'غير محدد'}`);
      console.log(`   العميل: ${sale.customer?.name || sale.customerName || 'بدون عميل'}`);
      console.log(`   التاريخ: ${sale.createdAt.toLocaleDateString('ar-EG')}`);
      console.log(`   الإجمالي: ${sale.total.toFixed(2)} ج.م`);
      console.log(`   المدفوع: ${sale.amountPaid.toFixed(2)} ج.م`);
      console.log(`   الزيادة (خطأ): ${excess.toFixed(2)} ج.م`);
      console.log(`   الباقي (سالب!): ${(sale.total - sale.amountPaid).toFixed(2)} ج.م`);
      
      // Fix it: amountPaid should not exceed total
      console.log(`   ✅ تصليح: سيتم ضبط المدفوع = ${sale.total.toFixed(2)} ج.م\n`);
      
      await prisma.sale.update({
        where: { id: sale.id },
        data: { amountPaid: sale.total }
      });
      
      fixedCount++;
    }
    
    // Check if amountPaid < 0 (also ERROR!)
    if (sale.amountPaid < 0) {
      invalidCount++;
      console.log(`❌ فاتورة بمبلغ سالب: ${sale.invoiceNumber}`);
      console.log(`   المدفوع السالب: ${sale.amountPaid.toFixed(2)} ج.م`);
      console.log(`   ✅ تصليح: سيتم ضبط المدفوع = 0 ج.م\n`);
      
      await prisma.sale.update({
        where: { id: sale.id },
        data: { amountPaid: 0 }
      });
      
      fixedCount++;
    }
  }

  if (invalidCount === 0) {
    console.log('✅ كل الفواتير صحيحة! لا توجد أخطاء.\n');
  } else {
    console.log(`⚠️  تم العثور على ${invalidCount} فاتورة بها أخطاء`);
    console.log(`✅ تم إصلاح ${fixedCount} فاتورة\n`);
  }

  // Re-check today's sales after fix
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySales = await prisma.sale.aggregate({
    where: {
      createdAt: { gte: today, lt: tomorrow },
      status: 'COMPLETED'
    },
    _sum: {
      total: true,
      amountPaid: true
    },
    _count: true
  });

  console.log('📊 ملخص مبيعات اليوم بعد الإصلاح:');
  console.log(`   عدد الفواتير: ${todaySales._count}`);
  console.log(`   إجمالي المبيعات: ${(todaySales._sum.total || 0).toFixed(2)} ج.م`);
  console.log(`   المبلغ المدفوع: ${(todaySales._sum.amountPaid || 0).toFixed(2)} ج.م`);
  console.log(`   المتبقي (آجل): ${((todaySales._sum.total || 0) - (todaySales._sum.amountPaid || 0)).toFixed(2)} ج.م\n`);

  await prisma.$disconnect();
}

checkInvalidPayments().catch(console.error);
