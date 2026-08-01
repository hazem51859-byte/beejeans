const { PrismaClient } = require('@prisma/client');

const prismaLocal = new PrismaClient({
  datasourceUrl: "postgresql://postgres:Zoma.54559@localhost:5432/bee_jeans_pos?schema=public"
});

const prismaRailway = new PrismaClient({
  datasourceUrl: "postgresql://postgres:jYrfaMNJbJuExJHgePjMhjkfeDoqYUFd@tokaido.proxy.rlwy.net:29985/railway"
});

async function fixCustomers() {
  try {
    console.log('\n🔧 إصلاح بيانات العملاء على Railway...\n');

    // 1. حذف البيانات القديمة
    console.log('🗑️  حذف البيانات القديمة...');
    await prismaRailway.shipment.deleteMany({});
    await prismaRailway.officeInvoiceItem.deleteMany({});
    await prismaRailway.officeInvoice.deleteMany({});
    await prismaRailway.customerPayment.deleteMany({});
    await prismaRailway.customer.deleteMany({});
    console.log('✅ تم حذف البيانات القديمة\n');

    // 2. نسخ العملاء
    const customers = await prismaLocal.customer.findMany();
    console.log(`📦 نسخ ${customers.length} عميل...`);
    for (const c of customers) {
      await prismaRailway.customer.create({ data: c });
    }
    console.log(`✅ تم نسخ ${customers.length} عميل\n`);

    // 3. نسخ دفعات العملاء
    const payments = await prismaLocal.customerPayment.findMany();
    console.log(`📦 نسخ ${payments.length} دفعة عميل...`);
    for (const p of payments) {
      await prismaRailway.customerPayment.create({ data: p });
    }
    console.log(`✅ تم نسخ ${payments.length} دفعة\n`);

    // 4. نسخ فواتير المكتب
    const officeInvoices = await prismaLocal.officeInvoice.findMany();
    console.log(`📦 نسخ ${officeInvoices.length} فاتورة مكتب...`);
    for (const inv of officeInvoices) {
      await prismaRailway.officeInvoice.create({ data: inv });
    }
    console.log(`✅ تم نسخ ${officeInvoices.length} فاتورة مكتب\n`);

    // 5. نسخ تفاصيل فواتير المكتب
    const officeInvoiceItems = await prismaLocal.officeInvoiceItem.findMany();
    console.log(`📦 نسخ ${officeInvoiceItems.length} صنف فاتورة مكتب...`);
    for (const item of officeInvoiceItems) {
      await prismaRailway.officeInvoiceItem.create({ data: item });
    }
    console.log(`✅ تم نسخ ${officeInvoiceItems.length} صنف\n`);

    // 6. نسخ الشحنات
    const shipments = await prismaLocal.shipment.findMany();
    console.log(`📦 نسخ ${shipments.length} شحنة...`);
    for (const ship of shipments) {
      await prismaRailway.shipment.create({ data: ship });
    }
    console.log(`✅ تم نسخ ${shipments.length} شحنة\n`);

    // 7. التحقق من البيانات
    console.log('📊 التحقق من البيانات على Railway...\n');
    
    const railwayCustomers = await prismaRailway.customer.findMany();
    const railwayPayments = await prismaRailway.customerPayment.findMany();
    const railwayOfficeInvoices = await prismaRailway.officeInvoice.findMany();
    
    console.log(`✅ العملاء: ${railwayCustomers.length}`);
    console.log(`✅ الدفعات: ${railwayPayments.length}`);
    console.log(`✅ فواتير المكتب: ${railwayOfficeInvoices.length}`);

    // عرض تفاصيل العميل "جازم منتصر"
    const jazem = railwayCustomers.find(c => c.name.includes('جازم'));
    if (jazem) {
      const jazemPayments = railwayPayments.filter(p => p.customerId === jazem.id);
      const jazemInvoices = railwayOfficeInvoices.filter(i => i.customerId === jazem.id);
      
      console.log(`\n💰 جازم منتصر:`);
      console.log(`   عدد الدفعات: ${jazemPayments.length}`);
      console.log(`   إجمالي الدفعات: ${jazemPayments.reduce((sum, p) => sum + p.amount, 0)} ج.م`);
      console.log(`   عدد فواتير المكتب: ${jazemInvoices.length}`);
      console.log(`   إجمالي الفواتير: ${jazemInvoices.reduce((sum, i) => sum + i.total, 0)} ج.م`);
    }

    console.log('\n✅ تم إصلاح بيانات العملاء بنجاح! 🎉\n');
    console.log('🔄 افتح Railway وشوف صفحة العملاء دلوقتي\n');

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error);
  } finally {
    await prismaLocal.$disconnect();
    await prismaRailway.$disconnect();
  }
}

fixCustomers();
