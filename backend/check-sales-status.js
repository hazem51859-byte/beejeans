const prisma = require('./src/config/database');

async function checkSalesStatus() {
  try {
    console.log('Checking all sales in database...\n');

    // Count sales by status
    const salesByStatus = await prisma.sale.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('Sales by status:');
    salesByStatus.forEach(s => {
      console.log(`  ${s.status}: ${s._count} sales`);
    });
    console.log('');

    // Get all sales (not just COMPLETED)
    const allSales = await prisma.sale.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: {
          select: {
            name: true,
            code: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                sku: true
              }
            }
          }
        }
      }
    });

    console.log(`\nLast ${allSales.length} sales:`);
    allSales.forEach(sale => {
      console.log(`\nSale #${sale.id}:`);
      console.log(`  Branch: ${sale.branch?.name} (${sale.branch?.code})`);
      console.log(`  Status: ${sale.status}`);
      console.log(`  Total: ${sale.total}`);
      console.log(`  Date: ${sale.createdAt}`);
      console.log(`  Items: ${sale.items.length}`);
      if (sale.items.length > 0) {
        sale.items.forEach(item => {
          console.log(`    - ${item.product?.name} (${item.product?.sku}): ${item.quantity} x ${item.unitPrice} = ${item.subtotal}`);
        });
      }
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkSalesStatus();
