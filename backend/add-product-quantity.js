const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addProductQuantity() {
  try {
    const barcode = '1054';
    const quantityToAdd = 17;
    
    console.log(`🔄 إضافة ${quantityToAdd} قطعة للمنتج ${barcode}...\n`);
    
    // Find product by barcode
    const product = await prisma.product.findFirst({
      where: { barcode: barcode }
    });
    
    if (!product) {
      console.log(`❌ لم يتم العثور على منتج بكود: ${barcode}`);
      return;
    }
    
    console.log('═'.repeat(70));
    console.log(`📦 ${product.name} (كود: ${barcode})`);
    console.log('═'.repeat(70));
    
    // Get MAIN branch
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });
    
    if (!mainBranch) {
      console.log('❌ لم يتم العثور على المخزن الرئيسي');
      return;
    }
    
    // Get current inventory
    const inventory = await prisma.inventory.findUnique({
      where: {
        productId_branchId: {
          productId: product.id,
          branchId: mainBranch.id
        }
      }
    });
    
    const oldQuantity = inventory?.quantity || 0;
    const newQuantity = oldQuantity + quantityToAdd;
    
    // Update inventory
    await prisma.inventory.upsert({
      where: {
        productId_branchId: {
          productId: product.id,
          branchId: mainBranch.id
        }
      },
      update: {
        quantity: {
          increment: quantityToAdd
        },
        lastRestockDate: new Date()
      },
      create: {
        productId: product.id,
        branchId: mainBranch.id,
        quantity: quantityToAdd,
        lastRestockDate: new Date()
      }
    });
    
    // Update totalPiecesProduced
    await prisma.product.update({
      where: { id: product.id },
      data: {
        totalPiecesProduced: {
          increment: quantityToAdd
        }
      }
    });
    
    console.log(`\n✅ الكمية القديمة: ${oldQuantity} قطعة`);
    console.log(`✅ المضاف: +${quantityToAdd} قطعة`);
    console.log(`✅ الكمية الجديدة: ${newQuantity} قطعة`);
    console.log('\n' + '═'.repeat(70));
    console.log('✅ تم التحديث بنجاح!');
    console.log('═'.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addProductQuantity();
