const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBranchSales() {
  try {
    console.log('\n=== Checking Branch Sales Data ===\n');

    // Get all branches (except MAIN)
    const branches = await prisma.branch.findMany({
      where: {
        isActive: true,
        code: { not: 'MAIN' }
      },
      select: {
        id: true,
        name: true,
        code: true
      }
    });

    console.log(`Found ${branches.length} branches (excluding MAIN):`);
    branches.forEach(b => console.log(`  - ${b.name} (${b.code})`));

    // Check sales for each branch
    console.log('\n=== Sales by Branch ===\n');
    
    for (const branch of branches) {
      const salesCount = await prisma.sale.count({
        where: {
          branchId: branch.id,
          status: 'COMPLETED'
        }
      });

      const salesTotal = await prisma.sale.aggregate({
        where: {
          branchId: branch.id,
          status: 'COMPLETED'
        },
        _sum: {
          total: true
        }
      });

      console.log(`${branch.name} (${branch.code}):`);
      console.log(`  Sales Count: ${salesCount}`);
      console.log(`  Total Sales: ${salesTotal._sum.total || 0} ج.م`);
      console.log('');
    }

    // Check total sales (all branches except MAIN)
    const totalSales = await prisma.sale.count({
      where: {
        status: 'COMPLETED',
        branch: {
          isActive: true,
          code: { not: 'MAIN' }
        }
      }
    });

    console.log(`\n=== Total Sales (All Branches) ===`);
    console.log(`Total Completed Sales: ${totalSales}`);

    // Get sample sales
    if (totalSales > 0) {
      console.log('\n=== Sample Sales (Last 5) ===\n');
      const sampleSales = await prisma.sale.findMany({
        where: {
          status: 'COMPLETED',
          branch: {
            code: { not: 'MAIN' }
          }
        },
        include: {
          branch: {
            select: {
              name: true,
              code: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });

      sampleSales.forEach(sale => {
        console.log(`Sale #${sale.invoiceNumber || sale.id}:`);
        console.log(`  Branch: ${sale.branch.name}`);
        console.log(`  Total: ${sale.total} ج.م`);
        console.log(`  Date: ${sale.createdAt.toLocaleString('ar-EG')}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBranchSales();
