const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicateCompletion() {
  try {
    console.log('🔍 جاري البحث عن المنتجات المكررة...\n');

    // Get the product (Boy Friend Mokhalat)
    const product = await prisma.product.findFirst({
      where: {
        sku: '1002'
      },
      include: {
        _count: {
          select: { productSerials: true }
        }
      }
    });

    if (!product) {
      console.log('❌ لم يتم العثور على المنتج');
      return;
    }

    console.log(`📦 المنتج: ${product.name}`);
    console.log(`📊 عدد السيريالات الحالي: ${product._count.productSerials}`);
    console.log(`📊 totalPiecesProduced: ${product.totalPiecesProduced}\n`);

    // Find main warehouse
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainBranch) {
      console.log('❌ المخزن الرئيسي غير موجود');
      return;
    }

    // Get current inventory
    const inventory = await prisma.inventory.findFirst({
      where: {
        productId: product.id,
        branchId: mainBranch.id
      }
    });

    console.log(`📦 الكمية في المخزون: ${inventory?.quantity || 0}\n`);

    // Calculate the correct values (half of current)
    const correctQuantity = Math.floor(product._count.productSerials / 2);
    const excessQuantity = product._count.productSerials - correctQuantity;

    console.log(`✅ الكمية الصحيحة: ${correctQuantity}`);
    console.log(`❌ الكمية الزيادة: ${excessQuantity}\n`);

    console.log('⚠️  هل تريد حذف الكمية الزيادة؟ (y/n)');
    console.log('   سيتم حذف:');
    console.log(`   - ${excessQuantity} سيريال من product_serials`);
    console.log(`   - تحديث الـ inventory إلى ${correctQuantity}`);
    console.log(`   - تحديث totalPiecesProduced إلى ${correctQuantity}\n`);

    // For automation, we'll proceed directly
    const confirmDelete = true;

    if (confirmDelete) {
      await prisma.$transaction(async (tx) => {
        // Delete excess serials (keep first half, delete second half)
        const allSerials = await tx.productSerial.findMany({
          where: {
            productId: product.id,
            branchId: mainBranch.id,
            status: 'AVAILABLE'
          },
          orderBy: { createdAt: 'asc' }
        });

        const serialsToDelete = allSerials.slice(correctQuantity);
        const serialIds = serialsToDelete.map(s => s.id);

        console.log(`🗑️  حذف ${serialIds.length} سيريال...`);
        await tx.productSerial.deleteMany({
          where: {
            id: { in: serialIds }
          }
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

        console.log('\n✅ تم التصليح بنجاح!');
      });

      // Verify
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
          _count: {
            select: { productSerials: true }
          }
        }
      });

      const updatedInventory = await prisma.inventory.findFirst({
        where: {
          productId: product.id,
          branchId: mainBranch.id
        }
      });

      console.log('\n📊 النتيجة النهائية:');
      console.log(`   - عدد السيريالات: ${updatedProduct._count.productSerials}`);
      console.log(`   - المخزون: ${updatedInventory?.quantity || 0}`);
      console.log(`   - totalPiecesProduced: ${updatedProduct.totalPiecesProduced}`);
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicateCompletion();
