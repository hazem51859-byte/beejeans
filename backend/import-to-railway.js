/**
 * استيراد البيانات إلى Railway Production Database
 * 
 * ⚠️ تحذير: تأكد من أن DATABASE_URL في .env يشير إلى Railway database
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const prisma = new PrismaClient();

// طلب تأكيد من المستخدم
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function importData(dataFile) {
  try {
    console.log('📥 استيراد البيانات إلى Production Database...\n');
    
    // قراءة الملف
    const filepath = path.join(__dirname, 'backup', dataFile);
    if (!fs.existsSync(filepath)) {
      throw new Error(`الملف غير موجود: ${filepath}`);
    }
    
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    console.log('📊 البيانات المستوردة:');
    console.log(`   - Users: ${data.users?.length || 0}`);
    console.log(`   - Products: ${data.products?.length || 0}`);
    console.log(`   - Sales: ${data.sales?.length || 0}`);
    console.log(`   - Customers: ${data.customers?.length || 0}`);
    console.log(`   - Office Invoices: ${data.officeInvoices?.length || 0}`);
    console.log(`   - Branches: ${data.branches?.length || 0}\n`);
    
    // طلب التأكيد
    const confirmed = await askConfirmation('⚠️  هل أنت متأكد من الاستيراد إلى Production؟ (yes/no): ');
    
    if (!confirmed) {
      console.log('❌ تم إلغاء الاستيراد');
      return;
    }
    
    console.log('\n🚀 بدء الاستيراد...\n');
    
    // الترتيب مهم جداً لتجنب مشاكل الـ foreign keys!
    const importOrder = [
      { name: 'Branches', data: data.branches, create: (item) => prisma.branch.create({ data: item }) },
      { name: 'Users', data: data.users, create: (item) => prisma.user.create({ data: item }) },
      { name: 'Categories', data: data.categories, create: (item) => prisma.category.create({ data: item }) },
      { name: 'Products', data: data.products, create: (item) => prisma.product.create({ data: item }) },
      { name: 'Inventory', data: data.inventory, create: (item) => prisma.inventory.create({ data: item }) },
      { name: 'Customers', data: data.customers, create: (item) => prisma.customer.create({ data: item }) },
      { name: 'Partners', data: data.partners, create: (item) => prisma.partner.create({ data: item }) },
      { name: 'Suppliers', data: data.suppliers, create: (item) => prisma.supplier.create({ data: item }) },
      { name: 'FabricInventory', data: data.fabricInventory, create: (item) => prisma.fabricInventory.create({ data: item }) },
    ];
    
    // استيراد البيانات الأساسية
    for (const table of importOrder) {
      if (table.data && table.data.length > 0) {
        console.log(`📝 استيراد ${table.name}...`);
        let count = 0;
        
        for (const item of table.data) {
          try {
            await table.create(item);
            count++;
          } catch (error) {
            console.log(`   ⚠️  تخطي ${table.name}: ${error.message}`);
          }
        }
        
        console.log(`   ✅ تم استيراد ${count}/${table.data.length} ${table.name}`);
      }
    }
    
    // استيراد الـ Sales مع الـ items
    if (data.sales && data.sales.length > 0) {
      console.log(`\n📝 استيراد Sales...`);
      let count = 0;
      
      for (const sale of data.sales) {
        try {
          const { items, shiftId, ...saleData } = sale;
          
          // إزالة saleId من الـ items
          const cleanItems = items.map(({ saleId, ...item }) => item);
          
          // إنشاء Sale بدون shiftId (هنخليه null)
          await prisma.sale.create({
            data: {
              ...saleData,
              shiftId: null,  // نخلي الـ shift null
              items: {
                create: cleanItems
              }
            }
          });
          count++;
        } catch (error) {
          console.log(`   ⚠️  تخطي Sale: ${error.message}`);
        }
      }
      
      console.log(`   ✅ تم استيراد ${count}/${data.sales.length} Sales`);
    }
    
    // استيراد Office Invoices مع الـ items
    if (data.officeInvoices && data.officeInvoices.length > 0) {
      console.log(`\n📝 استيراد Office Invoices...`);
      let count = 0;
      
      for (const invoice of data.officeInvoices) {
        try {
          const { items, ...invoiceData } = invoice;
          
          // إزالة invoiceId من الـ items
          const cleanItems = items.map(({ invoiceId, ...item }) => item);
          
          await prisma.officeInvoice.create({
            data: {
              ...invoiceData,
              items: {
                create: cleanItems
              }
            }
          });
          count++;
        } catch (error) {
          console.log(`   ⚠️  تخطي Office Invoice: ${error.message}`);
        }
      }
      
      console.log(`   ✅ تم استيراد ${count}/${data.officeInvoices.length} Office Invoices`);
    }
    
    // استيراد باقي البيانات
    const additionalData = [
      { name: 'Customer Payments', data: data.customerPayments, model: prisma.customerPayment },
      { name: 'Shipments', data: data.shipments, model: prisma.shipment },
      { name: 'Expenses', data: data.expenses, model: prisma.expense },
      { name: 'Vault Transactions', data: data.vaultTransactions, model: prisma.vaultTransaction },
      { name: 'Supplier Payments', data: data.supplierPayments, model: prisma.supplierPayment },
    ];
    
    for (const table of additionalData) {
      if (table.data && table.data.length > 0) {
        console.log(`\n📝 استيراد ${table.name}...`);
        let count = 0;
        
        for (const item of table.data) {
          try {
            await table.model.create({ data: item });
            count++;
          } catch (error) {
            console.log(`   ⚠️  تخطي: ${error.message}`);
          }
        }
        
        console.log(`   ✅ تم استيراد ${count}/${table.data.length} ${table.name}`);
      }
    }
    
    console.log('\n✅ اكتمل الاستيراد بنجاح!');
    console.log('🎉 البيانات الآن على Railway Production Database');
    
  } catch (error) {
    console.error('❌ خطأ في الاستيراد:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// البحث عن آخر ملف backup
const backupDir = path.join(__dirname, 'backup');
if (!fs.existsSync(backupDir)) {
  console.error('❌ لا يوجد مجلد backup');
  console.log('💡 شغل أولاً: node export-to-railway.js');
  process.exit(1);
}

const files = fs.readdirSync(backupDir)
  .filter(f => f.startsWith('full-database-export-') && f.endsWith('.json'))
  .sort()
  .reverse();

if (files.length === 0) {
  console.error('❌ لا يوجد ملفات backup');
  console.log('💡 شغل أولاً: node export-to-railway.js');
  process.exit(1);
}

const latestFile = files[0];
console.log(`📁 استخدام الملف: ${latestFile}\n`);

// تشغيل الاستيراد
importData(latestFile)
  .then(() => {
    console.log('\n✅ تم بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل الاستيراد:', error);
    process.exit(1);
  });
