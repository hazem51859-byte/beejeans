const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFabricStock() {
  try {
    console.log('🔍 جاري فحص مخزون القماش...\n');

    // Check FabricType
    const fabricTypes = await prisma.fabricType.findMany();
    console.log(`📦 أنواع القماش: ${fabricTypes.length}`);
    fabricTypes.forEach(ft => {
      console.log(`   - ${ft.name}: ${ft.pricePerMeter} جنيه/متر`);
    });

    console.log('\n');

    // Check FabricStock
    const fabricStock = await prisma.fabricStock.findMany({
      include: {
        fabricType: true
      }
    });
    
    console.log(`📊 سجلات مخزون القماش: ${fabricStock.length}`);
    if (fabricStock.length === 0) {
      console.log('⚠️  لا يوجد سجلات في FabricStock!');
      console.log('💡 هل تريد إنشاء سجلات مخزون القماش؟');
    } else {
      fabricStock.forEach(fs => {
        console.log(`   - ${fs.fabricType?.name || 'غير معروف'}: ${fs.availableMeters} متر متاح`);
        console.log(`     (محجوز: ${fs.reservedMeters}, مستخدم: ${fs.totalUsed}, مشترى: ${fs.totalPurchased})`);
      });
    }

    console.log('\n');

    // Check FabricPurchase
    const fabricPurchases = await prisma.fabricPurchase.findMany({
      include: {
        fabricType: true,
        supplier: true
      },
      orderBy: {
        purchaseDate: 'desc'
      },
      take: 5
    });

    console.log(`🛒 آخر 5 مشتريات قماش:`);
    if (fabricPurchases.length === 0) {
      console.log('   لا توجد مشتريات قماش');
    } else {
      fabricPurchases.forEach(fp => {
        console.log(`   - ${fp.fabricType?.name}: ${fp.meters} متر من ${fp.supplier?.name}`);
        console.log(`     التاريخ: ${fp.purchaseDate.toLocaleDateString('ar-EG')}`);
      });
    }

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFabricStock();
