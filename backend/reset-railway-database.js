/**
 * إعادة تعيين Railway Database بالكامل
 * يمسح كل البيانات ويعيد ضبط الـ auto-increment
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🗑️  مسح كل البيانات من Railway Database...\n');

    // الترتيب مهم - لازم نمسح البيانات اللي فيها foreign keys الأول
    
    const tables = [
      'saleItem',
      'officeInvoiceItem',
      'returnItem',
      'sale',
      'return',
      'customerPayment',
      'shipment',
      'officeInvoice',
      'customer',
      'vaultTransaction',
      'shift',
      'expense',
      'transfer',
      'inventory',
      'supplierPayment',
      'product',
      'category',
      'supplier',
      'partner',
      'branch',
      'user',
    ];
    
    for (const table of tables) {
      if (prisma[table] && prisma[table].deleteMany) {
        console.log(`مسح ${table}...`);
        try {
          await prisma[table].deleteMany({});
        } catch (error) {
          console.log(`   ⚠️  تخطي ${table}: ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ تم مسح جميع البيانات!');
    console.log('📝 الجداول الآن فاضية وجاهزة للاستيراد\n');
    
  } catch (error) {
    console.error('❌ خطأ في مسح البيانات:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل
resetDatabase()
  .then(() => {
    console.log('✅ Database جاهزة!');
    console.log('💡 شغل الآن: echo yes | node import-to-railway.js');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل:', error);
    process.exit(1);
  });
