const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateProducts() {
  try {
    const result = await prisma.product.updateMany({
      where: { status: 'DRAFT' },
      data: { status: 'ACTIVE' }
    });
    
    console.log(`✅ Activated ${result.count} products`);
    
    const activeProducts = await prisma.product.findMany({
      where: { status: 'ACTIVE' }
    });
    
    console.log('\n📦 Active Products:');
    activeProducts.forEach(p => {
      console.log(`  - ${p.name} (${p.sku})`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateProducts();
