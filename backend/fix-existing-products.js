const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixExistingProducts() {
  try {
    console.log('🔧 إصلاح المنتجات الموجودة...\n');

    // Get MAIN branch
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainBranch) {
      console.log('❌ المخزن الرئيسي غير موجود');
      return;
    }

    console.log(`✅ المخزن الرئيسي: ${mainBranch.name} (${mainBranch.id})\n`);

    // Get all ACTIVE products with totalPiecesProduced > 0
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        totalPiecesProduced: { gt: 0 }
      }
    });

    console.log(`📦 وجدنا ${products.length} منتج نشط مع قطع منتجة\n`);

    for (const product of products) {
      console.log(`\n🔹 معالجة: ${product.name} (SKU: ${product.sku})`);
      console.log(`   القطع المنتجة: ${product.totalPiecesProduced}`);

      // Check existing serials
      const existingSerials = await prisma.productSerial.count({
        where: {
          productId: product.id,
          branchId: mainBranch.id
        }
      });

      console.log(`   السيريالات الموجودة: ${existingSerials}`);

      if (existingSerials < product.totalPiecesProduced) {
        const neededSerials = product.totalPiecesProduced - existingSerials;
        console.log(`   ✏️ نحتاج إضافة: ${neededSerials} سيريال`);

        // Create missing serials - one by one because serialNumber must be unique
        for (let i = 0; i < neededSerials; i++) {
          await prisma.productSerial.create({
            data: {
              serialNumber: `${product.sku}-${Date.now()}-${i}`, // رقم فريد لكل قطعة
              productId: product.id,
              branchId: mainBranch.id,
              status: 'AVAILABLE',
              registeredBy: 'system'
            }
          });
        }

        console.log(`   ✅ تم إضافة ${neededSerials} سيريال`);

        // Update inventory
        const existingInventory = await prisma.inventory.findFirst({
          where: {
            productId: product.id,
            branchId: mainBranch.id
          }
        });

        if (existingInventory) {
          await prisma.inventory.update({
            where: { id: existingInventory.id },
            data: {
              quantity: product.totalPiecesProduced
            }
          });
          console.log(`   ✅ تم تحديث المخزون: ${product.totalPiecesProduced} قطعة`);
        } else {
          await prisma.inventory.create({
            data: {
              productId: product.id,
              branchId: mainBranch.id,
              quantity: product.totalPiecesProduced
            }
          });
          console.log(`   ✅ تم إنشاء سجل مخزون: ${product.totalPiecesProduced} قطعة`);
        }
      } else {
        console.log(`   ✅ المنتج صحيح - لا يحتاج تعديل`);
      }
    }

    console.log('\n\n🎉 تم إصلاح جميع المنتجات بنجاح!');
    console.log('الآن يمكنك رؤية المنتجات في المخزون ولوحة الإنتاج');

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingProducts();
