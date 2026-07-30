const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🗑️ بدء تصفير قاعدة البيانات...\n');

    // حذف البيانات بالترتيب الصحيح (من الأسفل للأعلى في العلاقات)
    
    console.log('⏳ جاري حذف الشحنات...');
    await prisma.shipment.deleteMany({});
    console.log('✅ تم حذف الشحنات');

    console.log('⏳ جاري حذف عناصر فواتير المكتب...');
    await prisma.officeInvoiceItem.deleteMany({});
    console.log('✅ تم حذف عناصر فواتير المكتب');

    console.log('⏳ جاري حذف فواتير المكتب...');
    await prisma.officeInvoice.deleteMany({});
    console.log('✅ تم حذف فواتير المكتب');

    console.log('⏳ جاري حذف أوامر الغسيل...');
    await prisma.washingOrder.deleteMany({});
    console.log('✅ تم حذف أوامر الغسيل');

    console.log('⏳ جاري حذف أوامر التصنيع...');
    await prisma.manufacturingOrder.deleteMany({});
    console.log('✅ تم حذف أوامر التصنيع');

    console.log('⏳ جاري حذف مخزون الأقمشة...');
    await prisma.fabricStock.deleteMany({});
    console.log('✅ تم حذف مخزون الأقمشة');

    console.log('⏳ جاري حذف مشتريات الأقمشة...');
    await prisma.fabricPurchase.deleteMany({});
    console.log('✅ تم حذف مشتريات الأقمشة');

    console.log('⏳ جاري حذف أنواع الأقمشة...');
    await prisma.fabricType.deleteMany({});
    console.log('✅ تم حذف أنواع الأقمشة');

    console.log('⏳ جاري حذف عناصر المرتجعات...');
    await prisma.returnItem.deleteMany({});
    console.log('✅ تم حذف عناصر المرتجعات');

    console.log('⏳ جاري حذف المرتجعات...');
    await prisma.return.deleteMany({});
    console.log('✅ تم حذف المرتجعات');

    console.log('⏳ جاري حذف تحويلات الأموال...');
    await prisma.moneyTransfer.deleteMany({});
    console.log('✅ تم حذف تحويلات الأموال');

    console.log('⏳ جاري حذف معاملات الخزائن...');
    await prisma.vaultTransaction.deleteMany({});
    console.log('✅ تم حذف معاملات الخزائن');

    console.log('⏳ جاري حذف مدفوعات العملاء...');
    await prisma.customerPayment.deleteMany({});
    console.log('✅ تم حذف مدفوعات العملاء');

    console.log('⏳ جاري حذف عناصر المبيعات...');
    await prisma.saleItem.deleteMany({});
    console.log('✅ تم حذف عناصر المبيعات');

    console.log('⏳ جاري حذف المبيعات...');
    await prisma.sale.deleteMany({});
    console.log('✅ تم حذف المبيعات');

    console.log('⏳ جاري حذف العملاء...');
    await prisma.customer.deleteMany({});
    console.log('✅ تم حذف العملاء');

    console.log('⏳ جاري حذف عناصر التحويلات...');
    await prisma.transferItem.deleteMany({});
    console.log('✅ تم حذف عناصر التحويلات');

    console.log('⏳ جاري حذف التحويلات...');
    await prisma.transfer.deleteMany({});
    console.log('✅ تم حذف التحويلات');

    console.log('⏳ جاري حذف الأرقام التسلسلية...');
    await prisma.productSerial.deleteMany({});
    console.log('✅ تم حذف الأرقام التسلسلية');

    console.log('⏳ جاري حذف عناصر المشتريات...');
    await prisma.purchaseItem.deleteMany({});
    console.log('✅ تم حذف عناصر المشتريات');

    console.log('⏳ جاري حذف مدفوعات الموردين...');
    await prisma.supplierPayment.deleteMany({});
    console.log('✅ تم حذف مدفوعات الموردين');

    console.log('⏳ جاري حذف المشتريات...');
    await prisma.purchase.deleteMany({});
    console.log('✅ تم حذف المشتريات');

    console.log('⏳ جاري حذف الموردين...');
    await prisma.supplier.deleteMany({});
    console.log('✅ تم حذف الموردين');

    // حذف جرد المخزون (إذا كانت الـ tables موجودة)
    try {
      console.log('⏳ جاري حذف عناصر جرد المخزون...');
      if (prisma.inventoryAuditItem) {
        await prisma.inventoryAuditItem.deleteMany({});
        console.log('✅ تم حذف عناصر جرد المخزون');
      } else {
        console.log('⚠️ جدول عناصر جرد المخزون غير موجود');
      }
    } catch (e) {
      console.log('⚠️ تخطي عناصر جرد المخزون:', e.message);
    }

    try {
      console.log('⏳ جاري حذف جرد المخزون...');
      if (prisma.inventoryAudit) {
        await prisma.inventoryAudit.deleteMany({});
        console.log('✅ تم حذف جرد المخزون');
      } else {
        console.log('⚠️ جدول جرد المخزون غير موجود');
      }
    } catch (e) {
      console.log('⚠️ تخطي جرد المخزون:', e.message);
    }

    console.log('⏳ جاري حذف المخزون...');
    await prisma.inventory.deleteMany({});
    console.log('✅ تم حذف المخزون');

    console.log('⏳ جاري حذف المصروفات...');
    await prisma.expense.deleteMany({});
    console.log('✅ تم حذف المصروفات');

    console.log('⏳ جاري حذف المنتجات...');
    await prisma.product.deleteMany({});
    console.log('✅ تم حذف المنتجات');

    console.log('⏳ جاري حذف الفئات...');
    await prisma.category.deleteMany({});
    console.log('✅ تم حذف الفئات');

    console.log('⏳ جاري حذف نوبات العمل...');
    await prisma.shift.deleteMany({});
    console.log('✅ تم حذف نوبات العمل');

    console.log('⏳ جاري حذف سجلات النشاط...');
    await prisma.activityLog.deleteMany({});
    console.log('✅ تم حذف سجلات النشاط');

    console.log('⏳ جاري حذف سجلات المزامنة...');
    await prisma.syncLog.deleteMany({});
    console.log('✅ تم حذف سجلات المزامنة');

    console.log('⏳ جاري حذف معاملات الشركاء...');
    await prisma.partnerTransaction.deleteMany({});
    console.log('✅ تم حذف معاملات الشركاء');

    console.log('⏳ جاري حذف الشركاء...');
    await prisma.partner.deleteMany({});
    console.log('✅ تم حذف الشركاء');

    console.log('\n✅ تم تصفير قاعدة البيانات بنجاح!');
    console.log('📌 تم الاحتفاظ بـ:');
    
    const branchCount = await prisma.branch.count();
    const userCount = await prisma.user.count();
    
    console.log(`   - الفروع: ${branchCount}`);
    console.log(`   - المستخدمين: ${userCount}`);

  } catch (error) {
    console.error('❌ خطأ في تصفير قاعدة البيانات:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
resetDatabase()
  .then(() => {
    console.log('\n🎉 اكتمل التصفير بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشل التصفير:', error.message);
    process.exit(1);
  });
