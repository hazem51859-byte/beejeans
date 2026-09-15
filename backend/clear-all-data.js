const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllData() {
  console.log('🗑️  بدء عملية حذف جميع البيانات (ما عدا الفروع والمستخدمين)...\n');

  try {
    await prisma.$transaction(async (tx) => {
      // 1. حذف الجرود (Audits)
      console.log('🗑️  حذف الجرود...');
      await tx.inventoryAuditItem.deleteMany({});
      await tx.inventoryAudit.deleteMany({});
      console.log('✅ تم حذف الجرود\n');

      // 2. حذف المرتجعات (Returns)
      console.log('🗑️  حذف المرتجعات...');
      await tx.returnItem.deleteMany({});
      await tx.return.deleteMany({});
      console.log('✅ تم حذف المرتجعات\n');

      // 3. حذف الشحنات (Shipments)
      console.log('🗑️  حذف الشحنات...');
      await tx.shipment.deleteMany({});
      console.log('✅ تم حذف الشحنات\n');

      // 4. حذف فواتير المكتب (Office Invoices)
      console.log('🗑️  حذف فواتير المكتب...');
      await tx.officeInvoiceItem.deleteMany({});
      await tx.officeInvoice.deleteMany({});
      console.log('✅ تم حذف فواتير المكتب\n');

      // 5. حذف عملاء المكتب (Office Customers)
      console.log('🗑️  حذف عملاء المكتب...');
      await tx.officeCustomer.deleteMany({});
      console.log('✅ تم حذف عملاء المكتب\n');

      // 6. حذف المبيعات (Sales)
      console.log('🗑️  حذف المبيعات...');
      await tx.saleItem.deleteMany({});
      await tx.sale.deleteMany({});
      console.log('✅ تم حذف المبيعات\n');

      // 7. حذف دفعات العملاء (Customer Payments)
      console.log('🗑️  حذف دفعات العملاء...');
      await tx.customerPayment.deleteMany({});
      console.log('✅ تم حذف دفعات العملاء\n');

      // 8. حذف العملاء (Customers)
      console.log('🗑️  حذف العملاء...');
      await tx.customer.deleteMany({});
      console.log('✅ تم حذف العملاء\n');

      // 9. حذف أوامر الغسيل (Washing Orders)
      console.log('🗑️  حذف أوامر الغسيل...');
      await tx.washingOrder.deleteMany({});
      console.log('✅ تم حذف أوامر الغسيل\n');

      // 10. حذف أوامر التصنيع (Manufacturing Orders)
      console.log('🗑️  حذف أوامر التصنيع...');
      await tx.manufacturingOrder.deleteMany({});
      console.log('✅ تم حذف أوامر التصنيع\n');

      // 11. حذف مشتريات القماش (Fabric Purchases)
      console.log('🗑️  حذف مشتريات القماش...');
      await tx.fabricPurchase.deleteMany({});
      console.log('✅ تم حذف مشتريات القماش\n');

      // 12. حذف مخزون القماش (Fabric Stock)
      console.log('🗑️  حذف مخزون القماش...');
      await tx.fabricStock.deleteMany({});
      console.log('✅ تم حذف مخزون القماش\n');

      // 13. حذف أنواع القماش (Fabric Types)
      console.log('🗑️  حذف أنواع القماش...');
      await tx.fabricType.deleteMany({});
      console.log('✅ تم حذف أنواع القماش\n');

      // 14. حذف المشتريات العادية (Purchases)
      console.log('🗑️  حذف المشتريات...');
      await tx.purchaseItem.deleteMany({});
      await tx.purchase.deleteMany({});
      console.log('✅ تم حذف المشتريات\n');

      // 15. حذف دفعات الموردين (Supplier Payments)
      console.log('🗑️  حذف دفعات الموردين...');
      await tx.supplierPayment.deleteMany({});
      console.log('✅ تم حذف دفعات الموردين\n');

      // 16. حذف الموردين (Suppliers)
      console.log('🗑️  حذف الموردين...');
      await tx.supplier.deleteMany({});
      console.log('✅ تم حذف الموردين\n');

      // 17. حذف المصروفات (Expenses)
      console.log('🗑️  حذف المصروفات...');
      await tx.expense.deleteMany({});
      console.log('✅ تم حذف المصروفات\n');

      // 18. حذف التحويلات (Transfers)
      console.log('🗑️  حذف التحويلات...');
      await tx.transferItem.deleteMany({});
      await tx.transfer.deleteMany({});
      console.log('✅ تم حذف التحويلات\n');

      // 19. حذف تحويلات الأموال (Money Transfers)
      console.log('🗑️  حذف تحويلات الأموال...');
      await tx.moneyTransfer.deleteMany({});
      console.log('✅ تم حذف تحويلات الأموال\n');

      // 20. حذف معاملات الخزينة (Vault Transactions)
      console.log('🗑️  حذف معاملات الخزينة...');
      await tx.vaultTransaction.deleteMany({});
      console.log('✅ تم حذف معاملات الخزينة\n');

      // 21. حذف الشفتات (Shifts)
      console.log('🗑️  حذف الشفتات...');
      await tx.shift.deleteMany({});
      console.log('✅ تم حذف الشفتات\n');

      // 22. حذف السيريالات (Product Serials)
      console.log('🗑️  حذف السيريالات...');
      await tx.productSerial.deleteMany({});
      console.log('✅ تم حذف السيريالات\n');

      // 23. حذف المخزون (Inventory)
      console.log('🗑️  حذف المخزون...');
      await tx.inventory.deleteMany({});
      console.log('✅ تم حذف المخزون\n');

      // 24. حذف المنتجات (Products)
      console.log('🗑️  حذف المنتجات...');
      await tx.product.deleteMany({});
      console.log('✅ تم حذف المنتجات\n');

      // 25. حذف الفئات (Categories)
      console.log('🗑️  حذف الفئات...');
      await tx.category.deleteMany({});
      console.log('✅ تم حذف الفئات\n');

      // 26. حذف سجل الأنشطة (Activity Logs)
      console.log('🗑️  حذف سجل الأنشطة...');
      await tx.activityLog.deleteMany({});
      console.log('✅ تم حذف سجل الأنشطة\n');

      // 27. إعادة تعيين رصيد الخزائن في الفروع
      console.log('🗑️  إعادة تعيين أرصدة الخزائن...');
      await tx.branch.updateMany({
        data: {
          vaultBalance: 0,
          cardVaultBalance: 0,
          walletBalance: 0
        }
      });
      console.log('✅ تم إعادة تعيين أرصدة الخزائن\n');

      console.log('✅✅✅ تم حذف جميع البيانات بنجاح! ✅✅✅\n');
      console.log('📌 البيانات المحفوظة:');
      console.log('   - الفروع (Branches)');
      console.log('   - المستخدمين (Users)\n');
    });

    // عرض البيانات المتبقية
    const branches = await prisma.branch.count();
    const users = await prisma.user.count();
    
    console.log('📊 الإحصائيات النهائية:');
    console.log(`   ✅ عدد الفروع: ${branches}`);
    console.log(`   ✅ عدد المستخدمين: ${users}`);
    console.log('\n🎉 تم الانتهاء من عملية المسح بنجاح!');

  } catch (error) {
    console.error('❌ حدث خطأ أثناء حذف البيانات:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
clearAllData()
  .catch((error) => {
    console.error('❌ فشل في تشغيل السكريبت:', error);
    process.exit(1);
  });
