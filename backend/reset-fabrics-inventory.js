const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetFabrics() {
  try {
    console.log('🔄 Resetting fabrics inventory...\n');
    
    const fabrics = [
      { name: 'نيو فيجن كحلي', quantity: 2511, pricePerMeter: 175 },
      { name: 'سلوشي', quantity: 822, pricePerMeter: 192 },
      { name: 'نيو فيجن محجر', quantity: 401, pricePerMeter: 175 },
      { name: 'بوي فريند مخلوط', quantity: 26, pricePerMeter: 155 },
      { name: 'كارين', quantity: 116, pricePerMeter: 147 }
    ];
    
    // Step 1: Delete all existing fabric stocks
    console.log('🗑️  Deleting existing fabric stocks...');
    await prisma.fabricStock.deleteMany({});
    console.log('✅ Deleted all existing fabric stocks');
    
    console.log('🗑️  Deleting existing fabric types...');
    await prisma.fabricType.deleteMany({});
    console.log('✅ Deleted all existing fabric types\n');
    
    // Step 2: Add new fabrics
    console.log('📦 Adding fabrics with opening balances:\n');
    
    let totalQuantity = 0;
    let totalValue = 0;
    
    for (const fabric of fabrics) {
      const value = fabric.quantity * fabric.pricePerMeter;
      
      // Create fabric type
      const fabricType = await prisma.fabricType.create({
        data: {
          name: fabric.name,
          pricePerMeter: fabric.pricePerMeter,
          isActive: true
        }
      });
      
      // Create fabric stock
      const fabricStock = await prisma.fabricStock.create({
        data: {
          fabricTypeId: fabricType.id,
          availableMeters: fabric.quantity,
          reservedMeters: 0,
          totalPurchased: fabric.quantity,
          totalUsed: 0
        }
      });
      
      console.log(`✅ ${fabricType.name}`);
      console.log(`   الكمية: ${fabric.quantity} متر`);
      console.log(`   سعر المتر: ${fabric.pricePerMeter} ج.م`);
      console.log(`   القيمة: ${value.toFixed(2)} ج.م`);
      console.log('');
      
      totalQuantity += fabric.quantity;
      totalValue += value;
    }
    
    console.log('═'.repeat(70));
    console.log('📊 ملخص مخزن القماش:');
    console.log('═'.repeat(70));
    console.log(`📦 عدد الخامات: ${fabrics.length} خامة`);
    console.log(`📏 إجمالي الكمية: ${totalQuantity.toFixed(2)} متر`);
    console.log(`💰 إجمالي القيمة: ${totalValue.toFixed(2)} ج.م`);
    console.log('═'.repeat(70));
    
    console.log(`\n✅ تم تحديث مخزن القماش بنجاح!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetFabrics();
