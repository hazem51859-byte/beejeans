const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setCorrectQuantity() {
  try {
    const MAIN_BRANCH_ID = '550e8400-e29b-41d4-a716-446655440000';
    const correctQuantity = 590; // الكمية الفعلية الصحيحة

    const product = await prisma.product.findFirst({
      where: { sku: '1001' },
      include: {
        inventory: { where: { branchId: MAIN_BRANCH_ID } }
      }
    });

    if (!product) {
      console.log('❌ المنتج غير موجود!');
      return;
    }

    console.log(`📦 المنتج: ${product.name}`);
    console.log(`   totalPiecesProduced الحالي: ${product.totalPiecesProduced}`);
    console.log(`   المخزون الحالي: ${product.inventory[0]?.quantity || 0}`);
    console.log(`\n✅ التصحيح إلى: ${correctQuantity}`);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: { totalPiecesProduced: correctQuantity }
      });

      const mainInventory = product.inventory[0];
      if (mainInventory) {
        await tx.inventory.update({
          where: { id: mainInventory.id },
          data: { quantity: correctQuantity }
        });
      } else {
        await tx.inventory.create({
          data: {
            productId: product.id,
            branchId: MAIN_BRANCH_ID,
            quantity: correctQuantity
          }
        });
      }
    });

    console.log('\n🎉 تم التصحيح بنجاح!');
    console.log(`   totalPiecesProduced: ${correctQuantity}`);
    console.log(`   المخزون: ${correctQuantity}`);

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setCorrectQuantity();
