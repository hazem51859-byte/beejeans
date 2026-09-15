const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreCorrectQuantity() {
  try {
    console.log('🔄 استرجاع الكمية الصحيحة 450 قطعة...\n');

    // Get the product
    const product = await prisma.product.findFirst({
      where: { sku: '1002' }
    });

    if (!product) {
      console.log('❌ المنتج غير موجود');
      return;
    }

    // Find main warehouse
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainBranch) {
      console.log('❌ المخزن الرئيسي غير موجود');
      return;
    }

    // Get current counts
    const currentSerials = await prisma.productSerial.count({
      where: {
        productId: product.id,
        branchId: mainBranch.id
      }
    });

    const inventory = await prisma.inventory.findFirst({
      where: {
        productId: product.id,
        branchId: mainBranch.id
      }
    });

    console.log('📊 الحالة الحالية:');
    console.log(`   - عدد السيريالات: ${currentSerials}`);
    console.log(`   - المخزون: ${inventory?.quantity || 0}`);
    console.log(`   - totalPiecesProduced: ${product.totalPiecesProduced}\n`);

    const correctQuantity = 450;
    const neededSerials = correctQuantity - currentSerials;

    console.log(`✅ الكمية المطلوبة: ${correctQuantity} قطعة`);
    console.log(`➕ نحتاج إضافة: ${neededSerials} سيريال\n`);

    if (neededSerials > 0) {
      await prisma.$transaction(async (tx) => {
        // Add missing serials
        const serialsToCreate = [];
        for (let i = 0; i < neededSerials; i++) {
          serialsToCreate.push({
            serialNumber: product.sku,
            productId: product.id,
            branchId: mainBranch.id,
            status: 'AVAILABLE',
            registeredBy: '00000000-0000-0000-0000-000000000000' // System ID
          });
        }

        console.log(`➕ إضافة ${neededSerials} سيريال...`);
        await tx.productSerial.createMany({
          data: serialsToCreate
        });

        // Update inventory
        console.log(`📦 تحديث المخزون إلى ${correctQuantity}...`);
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: correctQuantity
          }
        });

        // Update product totalPiecesProduced
        console.log(`📊 تحديث totalPiecesProduced إلى ${correctQuantity}...`);
        await tx.product.update({
          where: { id: product.id },
          data: {
            totalPiecesProduced: correctQuantity
          }
        });

        console.log('\n✅ تم الاسترجاع بنجاح!');
      });

      // Verify
      const finalSerials = await prisma.productSerial.count({
        where: {
          productId: product.id,
          branchId: mainBranch.id
        }
      });

      const finalInventory = await prisma.inventory.findFirst({
        where: {
          productId: product.id,
          branchId: mainBranch.id
        }
      });

      const finalProduct = await prisma.product.findUnique({
        where: { id: product.id }
      });

      console.log('\n📊 النتيجة النهائية:');
      console.log(`   - عدد السيريالات: ${finalSerials}`);
      console.log(`   - المخزون: ${finalInventory?.quantity || 0}`);
      console.log(`   - totalPiecesProduced: ${finalProduct.totalPiecesProduced}`);
    } else {
      console.log('✅ الكمية صحيحة بالفعل!');
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

restoreCorrectQuantity();
