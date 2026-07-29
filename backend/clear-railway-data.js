/**
 * مسح جميع البيانات من Railway Database قبل الاستيراد
 * ⚠️  تحذير: هذا سيحذف كل البيانات!
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('⚠️  تحذير: سيتم حذف جميع البيانات من Production Database!');
    console.log('🗑️  بدء عملية المسح...\n');
    
    // الترتيب مهم جداً - نحذف من الجداول التابعة أولاً
    const tables = [
      'vaultTransactions',
      'customerPayments',
      'supplierPayments',
      'expenses',
      'washingOrders',
      'manufacturingOrders',
      'fabricPurchases',
      'fabricInventory',
      'fabricTypes',
      'shipments',
      'officeInvoiceItems',
      'officeInvoices',
      'saleItems',
      'sales',
      'transferItems',
      'transfers',
      'returnItems',
      'returns',
      'inventory',
      'products',
      'categories',
      'customers',
      'suppliers',
      'partners',
      'shifts',
      'branches',
      'users',
    ];
    
    for (const table of tables) {
      try {
        const result = await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`   ✅ ${table}: تم المسح`);
      } catch (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      }
    }
    
    console.log('\n✅ تم مسح جميع البيانات');
    console.log('📝 الآن يمكنك تشغيل: node import-to-railway.js');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
