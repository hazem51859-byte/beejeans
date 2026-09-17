const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportFabricData() {
  try {
    console.log('🔍 جاري تصدير بيانات القماش من قاعدة البيانات المحلية...\n');

    // Export Fabric Types
    const fabricTypes = await prisma.fabricType.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`✅ تم العثور على ${fabricTypes.length} نوع قماش`);

    // Export Fabric Stock
    const fabricStock = await prisma.fabricStock.findMany({
      include: {
        fabricType: {
          select: { name: true }
        }
      }
    });
    console.log(`✅ تم العثور على ${fabricStock.length} سجل مخزون`);

    // Export Fabric Purchases
    const fabricPurchases = await prisma.fabricPurchase.findMany({
      include: {
        fabricType: {
          select: { name: true }
        },
        supplier: {
          select: { name: true }
        }
      },
      orderBy: { purchaseDate: 'desc' }
    });
    console.log(`✅ تم العثور على ${fabricPurchases.length} عملية شراء قماش`);

    // Export Manufacturing Orders
    const manufacturingOrders = await prisma.manufacturingOrder.findMany({
      include: {
        fabricType: {
          select: { name: true }
        },
        supplier: {
          select: { name: true }
        },
        product: {
          select: { name: true, barcode: true }
        }
      },
      orderBy: { sentDate: 'desc' }
    });
    console.log(`✅ تم العثور على ${manufacturingOrders.length} أمر تصنيع\n`);

    // Prepare export data
    const exportData = {
      exportDate: new Date().toISOString(),
      fabricTypes,
      fabricStock,
      fabricPurchases,
      manufacturingOrders
    };

    // Save to file
    const filename = `fabric-data-export-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    const filepath = path.join(__dirname, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    
    console.log('📦 تم حفظ البيانات في الملف:');
    console.log(`   ${filepath}\n`);

    // Print summary
    console.log('📊 ملخص البيانات المصدرة:');
    console.log('═══════════════════════════════════════');
    
    if (fabricTypes.length > 0) {
      console.log('\n🧵 أنواع القماش:');
      fabricTypes.forEach(type => {
        const stock = fabricStock.find(s => s.fabricTypeId === type.id);
        console.log(`   • ${type.name}`);
        console.log(`     - السعر: ${type.pricePerMeter} جنيه/متر`);
        if (stock) {
          console.log(`     - المتاح: ${stock.availableMeters} متر`);
          console.log(`     - المحجوز: ${stock.reservedMeters} متر`);
          console.log(`     - إجمالي المشتريات: ${stock.totalPurchased} متر`);
          console.log(`     - إجمالي المستخدم: ${stock.totalUsed} متر`);
        }
      });
    }

    console.log('\n═══════════════════════════════════════\n');
    console.log('✅ تم التصدير بنجاح!');
    console.log('\n📝 الخطوة التالية:');
    console.log('   قم بتشغيل السكريبت التالي لاستيراد البيانات إلى Railway:');
    console.log(`   node import-fabric-data.js ${filename}\n`);

  } catch (error) {
    console.error('❌ خطأ في تصدير البيانات:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportFabricData()
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
