const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

async function checkTodaySales() {
  console.log('Checking today sales...\n');

  const today = new Date();
  const startOfDay = dayjs(today).startOf('day').toDate();
  const endOfDay = dayjs(today).endOf('day').toDate();

  console.log('Date range:');
  console.log('  Start:', startOfDay);
  console.log('  End:', endOfDay);
  console.log();

  // Get all branches
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true }
  });

  console.log(`Found ${branches.length} branches:\n`);

  for (const branch of branches) {
    console.log(`📍 Branch: ${branch.name}`);
    console.log(`   ID: ${branch.id}`);

    const sales = await prisma.sale.findMany({
      where: {
        branchId: branch.id,
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: 'COMPLETED'
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        createdAt: true,
        paymentMethod: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`   Sales today: ${sales.length}`);
    
    if (sales.length > 0) {
      const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
      console.log(`   Total amount: ${totalSales.toFixed(2)} ج.م`);
      console.log('   Recent sales:');
      sales.slice(0, 3).forEach(s => {
        console.log(`      - ${s.invoiceNumber}: ${s.total.toFixed(2)} ج.م (${s.paymentMethod})`);
        console.log(`        Time: ${s.createdAt.toLocaleString('ar-EG')}`);
      });
    } else {
      console.log('   ❌ No sales today!');
    }
    console.log();
  }

  // Aggregate all sales today
  const allSales = await prisma.sale.aggregate({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: 'COMPLETED'
    },
    _sum: { total: true, taxAmount: true, discountAmount: true },
    _count: true
  });

  console.log('📊 Total Summary (All Branches):');
  console.log(`   Sales Count: ${allSales._count}`);
  console.log(`   Total Sales: ${(allSales._sum.total || 0).toFixed(2)} ج.م`);
  console.log(`   Total Tax: ${(allSales._sum.taxAmount || 0).toFixed(2)} ج.م`);
  console.log(`   Total Discount: ${(allSales._sum.discountAmount || 0).toFixed(2)} ج.م`);

  await prisma.$disconnect();
}

checkTodaySales().catch(console.error);
