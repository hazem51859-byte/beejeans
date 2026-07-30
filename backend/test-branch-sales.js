const prisma = require('./src/config/database');

async function testBranchSales() {
  try {
    console.log('Testing branch sales data...\n');

    // Get all branches
    const branches = await prisma.branch.findMany({
      where: {
        isActive: true,
        code: { not: 'MAIN' }
      }
    });

    console.log(`Found ${branches.length} branches (excluding MAIN):`);
    branches.forEach(b => console.log(`  - ${b.name} (${b.code})`));
    console.log('');

    // Get today's sales for first branch
    if (branches.length > 0) {
      const firstBranch = branches[0];
      console.log(`Checking sales for: ${firstBranch.name}\n`);

      const sales = await prisma.sale.findMany({
        where: {
          branchId: firstBranch.id,
          status: 'COMPLETED'
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  costPrice: true
                }
              }
            }
          }
        },
        take: 5
      });

      console.log(`Found ${sales.length} completed sales`);
      
      if (sales.length > 0) {
        const sale = sales[0];
        console.log(`\nSample Sale #${sale.id}:`);
        console.log(`  Total: ${sale.total}`);
        console.log(`  Items: ${sale.items.length}`);
        
        if (sale.items.length > 0) {
          const item = sale.items[0];
          console.log(`\n  Sample Item:`);
          console.log(`    Product: ${item.product?.name}`);
          console.log(`    SKU: ${item.product?.sku}`);
          console.log(`    Quantity: ${item.quantity}`);
          console.log(`    Unit Price: ${item.unitPrice}`);
          console.log(`    Cost Price: ${item.product?.costPrice}`);
          console.log(`    Subtotal: ${item.subtotal}`);
          
          const profit = (item.unitPrice - (item.product?.costPrice || 0)) * item.quantity;
          console.log(`    Profit: ${profit}`);
        }
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

testBranchSales();
