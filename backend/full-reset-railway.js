const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullReset() {
  try {
    console.log('🗑️  Reset شامل للـ Railway Database...\n');

    // 1. حذف كل البيانات المرتبطة بالمعاملات والمبيعات
    console.log('📝 حذف Sales و Items...');
    await prisma.saleItem.deleteMany({});
    await prisma.sale.deleteMany({});

    console.log('📝 حذف Shipments...');
    await prisma.shipment.deleteMany({});

    console.log('📝 حذف Office Invoices و Items...');
    await prisma.officeInvoiceItem.deleteMany({});
    await prisma.officeInvoice.deleteMany({});

    console.log('📝 حذف Returns و Items...');
    await prisma.returnItem.deleteMany({});
    await prisma.return.deleteMany({});

    console.log('📝 حذف Customer Payments...');
    await prisma.customerPayment.deleteMany({});

    console.log('📝 حذف Customers...');
    await prisma.customer.deleteMany({});

    // 2. حذف معاملات الخزينة والمصروفات
    console.log('📝 حذف Vault Transactions...');
    await prisma.vaultTransaction.deleteMany({});

    console.log('📝 حذف Money Transfers...');
    await prisma.moneyTransfer.deleteMany({});

    console.log('📝 حذف Shifts...');
    await prisma.shift.deleteMany({});

    console.log('📝 حذف Expenses...');
    await prisma.expense.deleteMany({});

    // 3. حذف التوريدات والترانسفرات
    console.log('📝 حذف Transfers...');
    await prisma.transferItem.deleteMany({});
    await prisma.transfer.deleteMany({});

    console.log('📝 حذف Purchase Items...');
    await prisma.purchaseItem.deleteMany({});
    await prisma.purchase.deleteMany({});

    // 4. حذف الإنتاج والقماش
    console.log('📝 حذف Washing Orders...');
    await prisma.washingOrder.deleteMany({});

    console.log('📝 حذف Manufacturing Orders...');
    await prisma.manufacturingOrder.deleteMany({});

    console.log('📝 حذف Fabric Stock...');
    await prisma.fabricStock.deleteMany({});

    console.log('📝 حذف Fabric Purchases...');
    await prisma.fabricPurchase.deleteMany({});

    // 5. حذف المخزون والمنتجات
    console.log('📝 حذف Inventory...');
    await prisma.inventory.deleteMany({});

    console.log('📝 حذف Product Serials...');
    await prisma.productSerial.deleteMany({});

    console.log('📝 حذف Products...');
    await prisma.product.deleteMany({});

    console.log('📝 حذف Categories...');
    await prisma.category.deleteMany({});

    // 6. حذف الشركاء ومدفوعاتهم
    console.log('📝 حذف Partner Transactions...');
    await prisma.partnerTransaction.deleteMany({});

    console.log('📝 حذف Partners...');
    await prisma.partner.deleteMany({});

    // 7. تصفير مدفوعات الموردين وأرصدتهم (بدون حذف أسمائهم)
    console.log('📝 حذف Supplier Payments...');
    await prisma.supplierPayment.deleteMany({});

    console.log('📝 تصفير أرصدة الموردين...');
    const supplierResult = await prisma.supplier.updateMany({
      data: {
        balance: 0,
        totalPurchases: 0,
        totalPaid: 0
      }
    });
    console.log(`   ✅ تم تصفير ${supplierResult.count} مورد`);

    // 8. حذف Activity Logs
    console.log('📝 حذف Activity Logs...');
    await prisma.activityLog.deleteMany({});

    // 9. حذف Sync Logs
    console.log('📝 حذف Sync Logs...');
    await prisma.syncLog.deleteMany({});

    // 10. حذف Audits
    console.log('📝 حذف Inventory Audits...');
    try {
      await prisma.inventoryAuditItem.deleteMany({});
      await prisma.inventoryAudit.deleteMany({});
    } catch (error) {
      console.log('   ⚠️  تخطي Audits (قد لا تكون موجودة)');
    }

    // 11. تصفير رصيد الخزينة في الفروع
    console.log('📝 تصفير رصيد الخزينة في الفروع...');
    const branchResult = await prisma.branch.updateMany({
      data: {
        vaultBalance: 0,
        cardVaultBalance: 0
      }
    });
    console.log(`   ✅ تم تصفير ${branchResult.count} فرع`);

    console.log('\n✅ تم Reset الـ Database بنجاح!');
    console.log('\n📋 ما تم الاحتفاظ به:');
    console.log('   - الفروع (Branches) - مع تصفير الخزينة');
    console.log('   - المستخدمين (Users)');
    console.log('   - أسماء الخامات (FabricTypes)');
    console.log('   - أسماء الموردين (Suppliers) - مع تصفير الأرصدة');
    console.log('\n📋 ما تم حذفه:');
    console.log('   - جميع المنتجات والمخزون');
    console.log('   - جميع المبيعات والفواتير');
    console.log('   - جميع التوريدات والشحنات');
    console.log('   - جميع المصروفات والمعاملات');
    console.log('   - جميع الإنتاج والقماش');
    console.log('   - جميع العملاء والشركاء');
    console.log('   - جميع الجرود والتقارير');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تأكيد قبل التنفيذ
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  تحذير: هذا سيحذف جميع البيانات من Railway ماعدا:');
console.log('   - الفروع (مع تصفير الخزينة)');
console.log('   - المستخدمين');
console.log('   - أسماء الخامات');
console.log('   - أسماء الموردين (مع تصفير الأرصدة)');
console.log('');

rl.question('هل أنت متأكد من Reset؟ (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    fullReset()
      .then(() => {
        console.log('\n✅ تم بنجاح!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ فشل:', error);
        process.exit(1);
      });
  } else {
    console.log('❌ تم الإلغاء');
    rl.close();
    process.exit(0);
  }
});
