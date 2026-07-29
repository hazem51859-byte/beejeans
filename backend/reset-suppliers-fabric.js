/**
 * تصفير رصيد الموردين والقماش
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetSuppliersFabric() {
  try {
    console.log('🔄 تصفير رصيد الموردين والقماش...\n');
    
    // تصفير رصيد جميع الموردين
    console.log('📝 تصفير رصيد الموردين...');
    const suppliersResult = await prisma.supplier.updateMany({
      data: {
        balance: 0
      }
    });
    console.log(`   ✅ تم تصفير ${suppliersResult.count} مورد`);
    
    // حذف جميع مدفوعات الموردين
    console.log('\n📝 حذف مدفوعات الموردين...');
    const paymentsResult = await prisma.supplierPayment.deleteMany({});
    console.log(`   ✅ تم حذف ${paymentsResult.count} مدفوعات`);
    
    // تصفير كميات القماش
    console.log('\n📝 تصفير كميات القماش...');
    const fabricResult = await prisma.fabricStock.updateMany({
      data: {
        availableMeters: 0,
        reservedMeters: 0,
        totalPurchased: 0,
        totalUsed: 0
      }
    });
    console.log(`   ✅ تم تصفير ${fabricResult.count} قماش`);
    
    console.log('\n✅ تم التصفير بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetSuppliersFabric()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
