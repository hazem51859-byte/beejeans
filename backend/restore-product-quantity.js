const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreProductQuantity() {
  try {
    console.log('🔧 استرجاع كمية المنتج الصحيحة...\n');

    // البحث عن المنتج بالـ SKU
    const product = await prisma.product.findFirst({
      where: {
        sku: '1001'
      },
      include: {
        inventory: {
          where: { branchId: '550e8400-e29b-41d4-a716-446655440000' } // المخزن الرئيسي
        }
      }
    });

    if (!product) {
      console.log('❌ المنتج غير موجود!');
      return;
    }

    console.log(`📦 المنتج: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   totalPiecesProduced الحالي: ${product.totalPiecesProduced}`);
    console.log(`   المخزون الحالي: ${product.inventory[0]?.quantity || 0}`);

    // الكمية الصحيحة (كانت 490 مضاعفة، يعني الصح 245)
    const correctQuantity = 245;

    console.log(`\n✅ الكمية الصحيحة: ${correctQuantity}`);
    console.log(`📝 جاري التحديث...`);

    await prisma.$transaction(async (tx) => {
      // Update product totalPiecesProduced
      await tx.product.update({
        where: { id: product.id },
        data: {
          totalPiecesProduced: correctQuantity
        }
      });

      // Update or create inventory in main warehouse
      const mainInventory = product.inventory[0];
      if (mainInventory) {
        await tx.inventory.update({
          where: { id: mainInventory.id },
          data: {
            quantity: correctQuantity
          }
        });
      } else {
        await tx.inventory.create({
          data: {
            productId: product.id,
            branchId: '550e8400-e29b-41d4-a716-446655440000', // المخزن الرئيسي
            quantity: correctQuantity
          }
        });
      }
    });

    console.log('\n✨ تم التحديث بنجاح!');
    console.log(`   totalPiecesProduced: ${correctQuantity}`);
    console.log(`   المخزون في المصنع: ${correctQuantity}`);

  } catch (error) {
    console.error('❌ خطأ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
restoreProductQuantity()
  .then(() => {
    console.log('\n🎉 اكتمل الاسترجاع!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشل الاسترجاع:', error.message);
    process.exit(1);
  });
