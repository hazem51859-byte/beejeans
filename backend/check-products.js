const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      where: {
        sku: { in: ['1001', '1010', '1142'] }
      },
      include: {
        category: true,
        inventory: {
          include: {
            branch: true
          }
        }
      }
    });

    console.log('\n✅ Sample products check:\n');
    products.forEach(p => {
      console.log(`📦 ${p.sku} - ${p.name}`);
      console.log(`   Cost: ${p.costPrice} / Price: ${p.sellingPrice}`);
      p.inventory.forEach(inv => {
        console.log(`   📍 ${inv.branch.name}: ${inv.quantity} units`);
      });
      console.log('');
    });

    const total = await prisma.product.count();
    console.log(`📊 Total products in database: ${total}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
