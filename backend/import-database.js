const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function importDatabase() {
  console.log('📥 بدء استيراد قاعدة البيانات...\n');

  try {
    // Get the backup file path from command line argument
    const backupFile = process.argv[2];
    
    if (!backupFile) {
      console.error('❌ يرجى تحديد مسار ملف النسخة الاحتياطية');
      console.log('الاستخدام: node import-database.js <path-to-backup-file>');
      process.exit(1);
    }

    if (!fs.existsSync(backupFile)) {
      console.error(`❌ الملف غير موجود: ${backupFile}`);
      process.exit(1);
    }

    console.log(`📂 قراءة الملف: ${backupFile}`);
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    console.log(`⏰ تاريخ النسخة الاحتياطية: ${data.timestamp}`);
    console.log(`📦 الإصدار: ${data.version}\n`);

    // Disable foreign key checks temporarily (PostgreSQL)
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');

    console.log('🗑️  مسح البيانات الموجودة...');
    
    // Delete in correct order (reverse of foreign key dependencies) - SKIP THIS STEP
    // We'll use skipDuplicates instead
    console.log('⚠️  تخطي مسح البيانات - سيتم استخدام skipDuplicates');
    /*
    await prisma.activityLog.deleteMany();
    await prisma.returnItem.deleteMany();
    await prisma.return.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.transferItem.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.productSerial.deleteMany();
    await prisma.washingOrder.deleteMany();
    await prisma.manufacturingOrder.deleteMany();
    await prisma.fabricStock.deleteMany();
    await prisma.fabricPurchase.deleteMany();
    await prisma.fabricType.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.supplierPayment.deleteMany();
    await prisma.customerPayment.deleteMany();
    await prisma.moneyTransfer.deleteMany();
    await prisma.vaultTransaction.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.partnerTransaction.deleteMany();
    await prisma.partner.deleteMany();

    console.log('✅ تم مسح البيانات الموجودة\n');

    console.log('📥 بدء استيراد البيانات الجديدة...\n');

    // Import in correct order (respecting foreign keys)
    
    // Core data
    console.log('📍 استيراد الفئات...');
    if (data.categories?.length > 0) {
      await prisma.category.createMany({ data: data.categories, skipDuplicates: true });
      console.log(`   ✓ ${data.categories.length} فئة`);
    }

    console.log('📍 استيراد الفروع...');
    if (data.branches?.length > 0) {
      await prisma.branch.createMany({ data: data.branches, skipDuplicates: true });
      console.log(`   ✓ ${data.branches.length} فرع`);
    }

    console.log('📍 استيراد المستخدمين...');
    if (data.users?.length > 0) {
      await prisma.user.createMany({ data: data.users, skipDuplicates: true });
      console.log(`   ✓ ${data.users.length} مستخدم`);
    }

    console.log('📍 استيراد العملاء...');
    if (data.customers?.length > 0) {
      await prisma.customer.createMany({ data: data.customers, skipDuplicates: true });
      console.log(`   ✓ ${data.customers.length} عميل`);
    }

    console.log('📍 استيراد الموردين...');
    if (data.suppliers?.length > 0) {
      await prisma.supplier.createMany({ data: data.suppliers, skipDuplicates: true });
      console.log(`   ✓ ${data.suppliers.length} مورد`);
    }

    console.log('📍 استيراد الشركاء...');
    if (data.partners?.length > 0) {
      await prisma.partner.createMany({ data: data.partners, skipDuplicates: true });
      console.log(`   ✓ ${data.partners.length} شريك`);
    }

    console.log('📍 استيراد معاملات الشركاء...');
    if (data.partnerTransactions?.length > 0) {
      await prisma.partnerTransaction.createMany({ data: data.partnerTransactions, skipDuplicates: true });
      console.log(`   ✓ ${data.partnerTransactions.length} معاملة`);
    }

    // Products and Inventory
    console.log('📍 استيراد المنتجات...');
    if (data.products?.length > 0) {
      await prisma.product.createMany({ data: data.products, skipDuplicates: true });
      console.log(`   ✓ ${data.products.length} منتج`);
    }

    console.log('📍 استيراد المخزون...');
    if (data.inventory?.length > 0) {
      await prisma.inventory.createMany({ data: data.inventory, skipDuplicates: true });
      console.log(`   ✓ ${data.inventory.length} سجل مخزون`);
    }

    // Fabric Management
    console.log('📍 استيراد أنواع القماش...');
    if (data.fabricTypes?.length > 0) {
      await prisma.fabricType.createMany({ data: data.fabricTypes, skipDuplicates: true });
      console.log(`   ✓ ${data.fabricTypes.length} نوع قماش`);
    }

    console.log('📍 استيراد مشتريات القماش...');
    if (data.fabricPurchases?.length > 0) {
      await prisma.fabricPurchase.createMany({ data: data.fabricPurchases, skipDuplicates: true });
      console.log(`   ✓ ${data.fabricPurchases.length} فاتورة قماش`);
    }

    console.log('📍 استيراد مخزون القماش...');
    if (data.fabricStock?.length > 0) {
      await prisma.fabricStock.createMany({ data: data.fabricStock, skipDuplicates: true });
      console.log(`   ✓ ${data.fabricStock.length} سجل مخزون قماش`);
    }

    console.log('📍 استيراد أوامر التصنيع...');
    if (data.manufacturingOrders?.length > 0) {
      await prisma.manufacturingOrder.createMany({ data: data.manufacturingOrders, skipDuplicates: true });
      console.log(`   ✓ ${data.manufacturingOrders.length} أمر تصنيع`);
    }

    console.log('📍 استيراد أوامر الغسيل...');
    if (data.washingOrders?.length > 0) {
      await prisma.washingOrder.createMany({ data: data.washingOrders, skipDuplicates: true });
      console.log(`   ✓ ${data.washingOrders.length} أمر غسيل`);
    }

    // Shifts
    console.log('📍 استيراد الوردتات...');
    if (data.shifts?.length > 0) {
      await prisma.shift.createMany({ data: data.shifts, skipDuplicates: true });
      console.log(`   ✓ ${data.shifts.length} وردية`);
    }

    // Sales (with nested items)
    console.log('📍 استيراد المبيعات...');
    if (data.sales?.length > 0) {
      for (const sale of data.sales) {
        const { items, ...saleData } = sale;
        // Clean items: remove saleId from nested create
        const cleanItems = (items || []).map(item => {
          const { saleId, ...itemData } = item;
          return itemData;
        });
        
        await prisma.sale.create({
          data: {
            ...saleData,
            items: {
              create: cleanItems
            }
          }
        });
      }
      console.log(`   ✓ ${data.sales.length} فاتورة بيع`);
    }

    // Transfers (with nested items)
    console.log('📍 استيراد التوريدات...');
    if (data.transfers?.length > 0) {
      for (const transfer of data.transfers) {
        const { items, ...transferData } = transfer;
        await prisma.transfer.create({
          data: {
            ...transferData,
            items: {
              create: items || []
            }
          }
        });
      }
      console.log(`   ✓ ${data.transfers.length} توريد`);
    }

    // Returns (with nested items)
    console.log('📍 استيراد المرتجعات...');
    if (data.returns?.length > 0) {
      for (const returnData of data.returns) {
        const { items, ...returnDataOnly } = returnData;
        await prisma.return.create({
          data: {
            ...returnDataOnly,
            items: {
              create: items || []
            }
          }
        });
      }
      console.log(`   ✓ ${data.returns.length} مرتجع`);
    }

    // Expenses
    console.log('📍 استيراد المصروفات...');
    if (data.expenses?.length > 0) {
      await prisma.expense.createMany({ data: data.expenses, skipDuplicates: true });
      console.log(`   ✓ ${data.expenses.length} مصروف`);
    }

    // Payments
    console.log('📍 استيراد دفعات العملاء...');
    if (data.customerPayments?.length > 0) {
      await prisma.customerPayment.createMany({ data: data.customerPayments, skipDuplicates: true });
      console.log(`   ✓ ${data.customerPayments.length} دفعة`);
    }

    console.log('📍 استيراد دفعات الموردين...');
    if (data.supplierPayments?.length > 0) {
      await prisma.supplierPayment.createMany({ data: data.supplierPayments, skipDuplicates: true });
      console.log(`   ✓ ${data.supplierPayments.length} دفعة`);
    }

    // Vault
    console.log('📍 استيراد معاملات الخزينة...');
    if (data.vaultTransactions?.length > 0) {
      await prisma.vaultTransaction.createMany({ data: data.vaultTransactions, skipDuplicates: true });
      console.log(`   ✓ ${data.vaultTransactions.length} معاملة`);
    }

    // Money Transfers
    console.log('📍 استيراد تحويلات الأموال...');
    if (data.moneyTransfers?.length > 0) {
      await prisma.moneyTransfer.createMany({ data: data.moneyTransfers, skipDuplicates: true });
      console.log(`   ✓ ${data.moneyTransfers.length} تحويل`);
    }

    // Product Serials
    console.log('📍 استيراد أرقام السيريالات...');
    if (data.productSerials?.length > 0) {
      await prisma.productSerial.createMany({ data: data.productSerials, skipDuplicates: true });
      console.log(`   ✓ ${data.productSerials.length} سيريال`);
    }

    // Activity Logs (optional, can be large)
    console.log('📍 استيراد سجلات النشاط...');
    if (data.activityLogs?.length > 0) {
      // Limit to recent logs to avoid large imports
      const recentLogs = data.activityLogs.slice(-1000); // Last 1000 logs
      await prisma.activityLog.createMany({ data: recentLogs, skipDuplicates: true });
      console.log(`   ✓ ${recentLogs.length} سجل نشاط`);
    }

    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');

    console.log('\n✅ تم استيراد البيانات بنجاح!');
    console.log('\n📊 الإحصائيات:');
    console.log(`   - الفروع: ${data.branches?.length || 0}`);
    console.log(`   - المستخدمين: ${data.users?.length || 0}`);
    console.log(`   - المنتجات: ${data.products?.length || 0}`);
    console.log(`   - المبيعات: ${data.sales?.length || 0}`);
    console.log(`   - العملاء: ${data.customers?.length || 0}`);
    console.log(`   - الموردين: ${data.suppliers?.length || 0}`);
    console.log(`   - التوريدات: ${data.transfers?.length || 0}`);
    console.log(`   - المرتجعات: ${data.returns?.length || 0}`);
    console.log();
    console.log('🎉 النظام جاهز للاستخدام مع البيانات المستوردة!');

  } catch (error) {
    console.error('❌ حدث خطأ أثناء الاستيراد:', error);
    console.error('\nالتفاصيل:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importDatabase();
