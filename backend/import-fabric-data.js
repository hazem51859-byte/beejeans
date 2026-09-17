const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importFabricData(filename) {
  try {
    if (!filename) {
      console.error('❌ يرجى تحديد اسم ملف التصدير');
      console.log('مثال: node import-fabric-data.js fabric-data-export-2026-08-27.json');
      process.exit(1);
    }

    const filepath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filepath)) {
      console.error(`❌ الملف غير موجود: ${filepath}`);
      process.exit(1);
    }

    console.log('📂 جاري قراءة الملف...');
    const fileContent = fs.readFileSync(filepath, 'utf8');
    const data = JSON.parse(fileContent);

    console.log('\n📊 البيانات المستوردة:');
    console.log(`   • أنواع القماش: ${data.fabricTypes.length}`);
    console.log(`   • سجلات المخزون: ${data.fabricStock.length}`);
    console.log(`   • عمليات الشراء: ${data.fabricPurchases.length}`);
    console.log(`   • أوامر التصنيع: ${data.manufacturingOrders.length}\n`);

    const confirm = process.argv.includes('--confirm');
    if (!confirm) {
      console.log('⚠️  هذا السكريبت سيحذف جميع بيانات القماش الموجودة ويستبدلها بالبيانات من الملف');
      console.log('   لتأكيد العملية، أضف --confirm في نهاية الأمر:');
      console.log(`   node import-fabric-data.js ${filename} --confirm\n`);
      process.exit(0);
    }

    console.log('🗑️  جاري حذف البيانات القديمة...\n');

    // Delete in correct order (respecting foreign keys)
    await prisma.manufacturingOrder.deleteMany({});
    console.log('   ✅ تم حذف أوامر التصنيع');

    await prisma.fabricPurchase.deleteMany({});
    console.log('   ✅ تم حذف عمليات الشراء');

    await prisma.fabricStock.deleteMany({});
    console.log('   ✅ تم حذف سجلات المخزون');

    await prisma.fabricType.deleteMany({});
    console.log('   ✅ تم حذف أنواع القماش\n');

    console.log('📥 جاري استيراد البيانات الجديدة...\n');

    // Import Fabric Types
    for (const type of data.fabricTypes) {
      await prisma.fabricType.create({
        data: {
          id: type.id,
          name: type.name,
          pricePerMeter: type.pricePerMeter,
          description: type.description,
          isActive: type.isActive,
          createdAt: new Date(type.createdAt),
          updatedAt: new Date(type.updatedAt)
        }
      });
    }
    console.log(`   ✅ تم استيراد ${data.fabricTypes.length} نوع قماش`);

    // Import Fabric Stock
    for (const stock of data.fabricStock) {
      await prisma.fabricStock.create({
        data: {
          id: stock.id,
          fabricTypeId: stock.fabricTypeId,
          availableMeters: stock.availableMeters,
          reservedMeters: stock.reservedMeters,
          totalPurchased: stock.totalPurchased,
          totalUsed: stock.totalUsed,
          createdAt: new Date(stock.createdAt),
          lastUpdated: new Date(stock.lastUpdated)
        }
      });
    }
    console.log(`   ✅ تم استيراد ${data.fabricStock.length} سجل مخزون`);

    // Import Fabric Purchases
    for (const purchase of data.fabricPurchases) {
      await prisma.fabricPurchase.create({
        data: {
          id: purchase.id,
          invoiceNumber: purchase.invoiceNumber,
          supplierId: purchase.supplierId,
          fabricTypeId: purchase.fabricTypeId,
          meters: purchase.meters,
          pricePerMeter: purchase.pricePerMeter,
          totalCost: purchase.totalCost,
          paidAmount: purchase.paidAmount,
          remainingAmount: purchase.remainingAmount,
          paymentStatus: purchase.paymentStatus,
          purchaseDate: new Date(purchase.purchaseDate),
          notes: purchase.notes,
          createdBy: purchase.createdBy,
          createdAt: new Date(purchase.createdAt),
          updatedAt: new Date(purchase.updatedAt)
        }
      });
    }
    console.log(`   ✅ تم استيراد ${data.fabricPurchases.length} عملية شراء`);

    // Import Manufacturing Orders
    for (const order of data.manufacturingOrders) {
      await prisma.manufacturingOrder.create({
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          supplierId: order.supplierId,
          fabricTypeId: order.fabricTypeId,
          productId: order.productId,
          metersUsed: order.metersUsed,
          fabricCostPerMeter: order.fabricCostPerMeter,
          status: order.status,
          sentDate: new Date(order.sentDate),
          sentBy: order.sentBy,
          piecesReceived: order.piecesReceived,
          manufacturingCostPerPiece: order.manufacturingCostPerPiece,
          receivedDate: order.receivedDate ? new Date(order.receivedDate) : null,
          receivedBy: order.receivedBy,
          notes: order.notes,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt)
        }
      });
    }
    console.log(`   ✅ تم استيراد ${data.manufacturingOrders.length} أمر تصنيع\n`);

    console.log('═══════════════════════════════════════');
    console.log('✅ تم الاستيراد بنجاح!');
    console.log('═══════════════════════════════════════\n');

    // Print summary
    const finalTypes = await prisma.fabricType.count();
    const finalStock = await prisma.fabricStock.count();
    const finalPurchases = await prisma.fabricPurchase.count();
    const finalOrders = await prisma.manufacturingOrder.count();

    console.log('📊 ملخص البيانات النهائية:');
    console.log(`   • أنواع القماش: ${finalTypes}`);
    console.log(`   • سجلات المخزون: ${finalStock}`);
    console.log(`   • عمليات الشراء: ${finalPurchases}`);
    console.log(`   • أوامر التصنيع: ${finalOrders}\n`);

  } catch (error) {
    console.error('❌ خطأ في استيراد البيانات:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const filename = process.argv[2];
importFabricData(filename)
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
