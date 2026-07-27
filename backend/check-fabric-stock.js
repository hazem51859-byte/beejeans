const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFabricStock() {
  try {
    const stock = await prisma.fabricStock.findMany({
      include: { fabricType: true }
    });
    
    console.log('📦 Fabric Stock Records:', stock.length);
    
    if (stock.length > 0) {
      console.log('\nStock Details:');
      stock.forEach(s => {
        console.log(`  - ${s.fabricType.name}: ${s.availableMeters} متر متاح`);
      });
    } else {
      console.log('\n⚠️  No fabric stock found!');
    }
    
    // Also check fabric types
    const types = await prisma.fabricType.findMany({
      include: { fabricStock: true }
    });
    
    console.log('\n🧵 Fabric Types with Stock:');
    types.forEach(t => {
      console.log(`  - ${t.name}: ${t.fabricStock ? t.fabricStock.availableMeters + ' متر' : 'لا يوجد stock'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFabricStock();
