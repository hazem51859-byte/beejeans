const prisma = require('./src/config/database');

async function testRailwaySales() {
  try {
    console.log('Testing Railway database...\n');

    // Count total sales
    const totalSales = await prisma.sale.count({
      where: { status: 'COMPLETED' }
    });

    console.log(`✅ Total COMPLETED sales: ${totalSales}\n`);

    if (totalSales > 0) {
      // Count by branch (exclude MAIN)
      const branchSales = await prisma.sale.groupBy({
        by: ['branchId'],
        where: {
          status: 'COMPLETED',
          branch: {
            isActive: true,
            code: { not: 'MAIN' }
          }
        },
        _count: true,
        _sum: {
          total: true
        }
      });

      console.log('Sales by branch:');
      for (const bs of branchSales) {
        const branch = await prisma.branch.findUnique({
          where: { id: bs.branchId },
          select: { name: true, code: true }
        });
        console.log(`  ${branch?.name || 'Unknown'} (${branch?.code || 'N/A'}): ${bs._count} sales, ${bs._sum.total || 0} ج`);
      }
      
      console.log('\n✅ Railway database has sales data!');
      console.log('👉 Restart your backend server to see the data in the frontend');
    } else {
      console.log('❌ No sales found in Railway database');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

testRailwaySales();
