const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const allProducts = await prisma.product.findMany();
    const activeProducts = await prisma.product.findMany({
      where: { status: 'ACTIVE' }
    });
    
    console.log('📦 Total products:', allProducts.length);
    console.log('✅ Active products:', activeProducts.length);
    
    if (allProducts.length > 0) {
      console.log('\nAll Products:');
      allProducts.forEach(p => {
        console.log(`  - ${p.name} (${p.sku}) - Status: ${p.status}`);
      });
    } else {
      console.log('\n⚠️  No products found in database!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
