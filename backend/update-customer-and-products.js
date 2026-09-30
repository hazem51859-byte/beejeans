const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCustomerAndProducts() {
  try {
    console.log('🔄 تحديث حساب العميلة والمنتجات...\n');
    
    // 1. Update رغده اكتوبر customer balance to zero
    console.log('═'.repeat(70));
    console.log('👤 تحديث حساب العميلة "رغده اكتوبر":');
    console.log('═'.repeat(70));
    
    const customer = await prisma.customer.findFirst({
      where: {
        name: {
          contains: 'رغده',
          mode: 'insensitive'
        }
      }
    });
    
    if (customer) {
      const oldBalance = customer.walletBalance;
      
      const updatedCustomer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          walletBalance: 0
        }
      });
      
      console.log(`✅ تم تصفير حساب: ${customer.name}`);
      console.log(`   الرصيد القديم: ${oldBalance} ج.م`);
      console.log(`   الرصيد الجديد: 0 ج.م`);
      console.log(`   الحالة: لا يوجد رصيد (متزن)`);
    } else {
      console.log('❌ لم يتم العثور على عميلة "رغده اكتوبر"');
    }
    
    // 2. Update products with barcodes 1021 and 1002
    console.log('\n' + '═'.repeat(70));
    console.log('📦 تحديث المنتجات (إضافة 6 قطع):');
    console.log('═'.repeat(70));
    
    const barcodes = ['1021', '1002'];
    
    for (const barcode of barcodes) {
      const product = await prisma.product.findFirst({
        where: { barcode: barcode }
      });
      
      if (!product) {
        console.log(`\n❌ لم يتم العثور على منتج بكود: ${barcode}`);
        continue;
      }
      
      console.log(`\n📦 ${product.name} (كود: ${barcode})`);
      
      // Get MAIN branch
      const mainBranch = await prisma.branch.findFirst({
        where: { code: 'MAIN' }
      });
      
      if (!mainBranch) {
        console.log(`   ❌ لم يتم العثور على المخزن الرئيسي`);
        continue;
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
      const newQuantity = oldQuantity + 6;
      
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
            increment: 6
          },
          lastRestockDate: new Date()
        },
        create: {
          productId: product.id,
          branchId: mainBranch.id,
          quantity: 6,
          lastRestockDate: new Date()
        }
      });
      
      // Update totalPiecesProduced
      await prisma.product.update({
        where: { id: product.id },
        data: {
          totalPiecesProduced: {
            increment: 6
          }
        }
      });
      
      console.log(`   الكمية القديمة: ${oldQuantity} قطعة`);
      console.log(`   المضاف: +6 قطع`);
      console.log(`   الكمية الجديدة: ${newQuantity} قطعة`);
      console.log(`   ✅ تم التحديث بنجاح`);
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ تم إتمام جميع التحديثات بنجاح!');
    console.log('═'.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateCustomerAndProducts();
