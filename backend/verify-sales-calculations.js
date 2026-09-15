const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySalesCalculations() {
  console.log('🔍 التحقق من حسابات المبيعات...\n');

  // Get today's sales
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow
      },
      status: 'COMPLETED'
    },
    include: {
      customer: true
    }
  });

  console.log(`📊 عدد المبيعات اليوم: ${sales.length}\n`);

  let totalSalesValue = 0;
  let totalAmountPaid = 0;
  let totalRemaining = 0;
  let creditSalesCount = 0;

  sales.forEach(sale => {
    totalSalesValue += sale.total;
    totalAmountPaid += sale.amountPaid;
    const remaining = sale.total - sale.amountPaid;
    totalRemaining += remaining;
    
    if (remaining > 0) {
      creditSalesCount++;
      console.log(`💳 فاتورة آجلة: ${sale.invoiceNumber}`);
      console.log(`   العميل: ${sale.customer?.name || sale.customerName || 'بدون عميل'}`);
      console.log(`   الإجمالي: ${sale.total.toFixed(2)} ج.م`);
      console.log(`   المدفوع: ${sale.amountPaid.toFixed(2)} ج.م`);
      console.log(`   المتبقي: ${remaining.toFixed(2)} ج.م\n`);
    }
  });

  console.log('📈 الملخص:');
  console.log(`   إجمالي قيمة المبيعات: ${totalSalesValue.toFixed(2)} ج.م`);
  console.log(`   المبلغ المدفوع فعلياً: ${totalAmountPaid.toFixed(2)} ج.م`);
  console.log(`   المبلغ المتبقي (آجل): ${totalRemaining.toFixed(2)} ج.م`);
  console.log(`   عدد الفواتير الآجلة: ${creditSalesCount}\n`);

  console.log('✅ المبيعات في Dashboard يجب أن تعرض: ${totalAmountPaid.toFixed(2)} ج.م (المدفوع فقط)');
  console.log('❌ وليس: ${totalSalesValue.toFixed(2)} ج.م (الإجمالي)\n');

  await prisma.$disconnect();
}

verifySalesCalculations().catch(console.error);
