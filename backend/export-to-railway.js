/**
 * تصدير البيانات من Local Database إلى Railway Production
 * 
 * الخطوات:
 * 1. تصدير البيانات من local database
 * 2. الاتصال بـ Railway database
 * 3. استيراد البيانات
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// الاتصال بالـ local database
const prisma = new PrismaClient();

async function exportData() {
  try {
    console.log('📤 تصدير البيانات من Local Database...\n');
    
    const data = {
      timestamp: new Date().toISOString(),
      source: 'local',
    };
    
    // تصدير كل جدول مع معالجة الأخطاء
    const tables = [
      { name: 'users', query: () => prisma.user.findMany() },
      { name: 'categories', query: () => prisma.category.findMany() },
      { name: 'products', query: () => prisma.product.findMany() },
      { name: 'inventory', query: () => prisma.inventory.findMany() },
      { name: 'branches', query: () => prisma.branch.findMany() },
      { name: 'sales', query: () => prisma.sale.findMany({ include: { items: true } }) },
      { name: 'customers', query: () => prisma.customer.findMany() },
      { name: 'customerPayments', query: () => prisma.customerPayment.findMany() },
      { name: 'officeInvoices', query: () => prisma.officeInvoice.findMany({ include: { items: true } }) },
      { name: 'shipments', query: () => prisma.shipment.findMany() },
      { name: 'transfers', query: () => prisma.transfer.findMany({ include: { items: true } }) },
      { name: 'returns', query: () => prisma.return.findMany({ include: { items: true } }) },
      { name: 'fabricTypes', query: () => prisma.fabricType.findMany() },
      { name: 'fabricInventory', query: () => prisma.fabricInventory.findMany() },
      { name: 'fabricPurchases', query: () => prisma.fabricPurchase.findMany({ include: { items: true } }) },
      { name: 'manufacturingOrders', query: () => prisma.manufacturingOrder.findMany({ include: { items: true } }) },
      { name: 'washingOrders', query: () => prisma.washingOrder.findMany({ include: { items: true } }) },
      { name: 'expenses', query: () => prisma.expense.findMany() },
      { name: 'vaultTransactions', query: () => prisma.vaultTransaction.findMany() },
      { name: 'partners', query: () => prisma.partner.findMany() },
      { name: 'suppliers', query: () => prisma.supplier.findMany() },
      { name: 'supplierPayments', query: () => prisma.supplierPayment.findMany() },
    ];
    
    for (const table of tables) {
      try {
        console.log(`   📋 ${table.name}...`);
        data[table.name] = await table.query();
        console.log(`   ✅ ${table.name}: ${data[table.name].length} سجل`);
      } catch (error) {
        console.log(`   ⚠️  ${table.name}: ${error.message}`);
        data[table.name] = [];
      }
    }
    
    // حفظ البيانات في ملف JSON
    const backupDir = path.join(__dirname, 'backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const filename = `full-database-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    console.log('\n✅ تم تصدير البيانات بنجاح!');
    console.log(`📁 الملف: ${filepath}`);
    console.log(`\n📊 إحصائيات:`);
    console.log(`   - Users: ${data.users?.length || 0}`);
    console.log(`   - Products: ${data.products?.length || 0}`);
    console.log(`   - Sales: ${data.sales?.length || 0}`);
    console.log(`   - Customers: ${data.customers?.length || 0}`);
    console.log(`   - Office Invoices: ${data.officeInvoices?.length || 0}`);
    console.log(`   - Branches: ${data.branches?.length || 0}`);
    console.log(`   - Inventory: ${data.inventory?.length || 0}`);
    
    return filepath;
    
  } catch (error) {
    console.error('❌ خطأ في التصدير:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل التصدير
console.log('🚀 بدء عملية التصدير...\n');
exportData()
  .then((filepath) => {
    console.log('\n✅ اكتمل التصدير!');
    console.log('\n📝 الخطوة التالية:');
    console.log('   1. احصل على Railway DATABASE_URL من Dashboard');
    console.log('   2. غير DATABASE_URL في .env للـ production URL');
    console.log('   3. شغل: node import-to-railway.js');
    console.log(`   4. الملف: ${path.basename(filepath)}`);
  })
  .catch((error) => {
    console.error('\n❌ فشل التصدير:', error);
    process.exit(1);
  });
