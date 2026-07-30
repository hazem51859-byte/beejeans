const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicateTotalPiecesProduced() {
  try {
    console.log('🔧 بدء تصحيح totalPiecesProduced المضاعف...\n');

    // Get all active products
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        totalPiecesProduced: { gt: 0 }
      },
      include: {
        inventory: {
          where: { branchId: '1' } // المخزن الرئيسي
        }
      }
    });

    console.log(`📦 عدد المنتجات: ${products.length}\n`);

    let fixedCount = 0;

    for (const product of products) {
      const currentTotal = product.totalPiecesProduced;
      const mainInventoryQty = product.inventory[0]?.quantity || 0;

      console.log(`\n🔹 ${product.name} (${product.sku})`);
      console.log(`   totalPiecesProduced الحالي: ${currentTotal}`);
      console.log(`   كمية المخزن الرئيسي: ${mainInventoryQty}`);

      // إذا كان totalPiecesProduced ضعف الكمية في المخزن، يعني فيه مشكلة
      if (currentTotal === mainInventoryQty * 2) {
        console.log(`   ⚠️ اكتشفت مشكلة: القيمة مضاعفة!`);
        console.log(`   ✅ التصحيح: ${mainInventoryQty}`);

        await prisma.product.update({
          where: { id: product.id },
          data: {
            totalPiecesProduced: mainInventoryQty
          }
        });

        fixedCount++;
      } else if (currentTotal !== mainInventoryQty) {
        console.log(`   ⚠️ هناك فرق بين totalPiecesProduced (${currentTotal}) والمخزن (${mainInventoryQty})`);
        console.log(`   💡 سيتم تحديث totalPiecesProduced ليطابق المخزن`);

        await prisma.product.update({
          where: { id: product.id },
          data: {
            totalPiecesProduced: mainInventoryQty
          }
        });

        fixedCount++;
      } else {
        console.log(`   ✅ الكمية صحيحة`);
      }
    }

    console.log(`\n✨ تم التصحيح بنجاح!`);
    console.log(`📊 عدد المنتجات المصححة: ${fixedCount}`);

  } catch (error) {
    console.error('❌ خطأ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
fixDuplicateTotalPiecesProduced()
  .then(() => {
    console.log('\n🎉 اكتمل التصحيح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشل التصحيح:', error.message);
    process.exit(1);
  });
