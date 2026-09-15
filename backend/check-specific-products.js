const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecific() {
  try {
    const products = await prisma.product.findMany({
      where: {
        sku: { in: ['1055', '1061', '1062', '1100', '1101', '1102', '1103', '1104', '1021', '1032', '1051'] }
      },
      orderBy: { sku: 'asc' }
    });

    console.log('\n📊 Products in database:\n');
    products.forEach(p => {
      console.log(`${p.sku} - ${p.name}`);
      console.log(`   Cost: ${p.costPrice} / Selling: ${p.sellingPrice}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecific();
