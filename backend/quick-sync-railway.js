const { PrismaClient } = require('@prisma/client');

// Local database
const prismaLocal = new PrismaClient({
  datasourceUrl: "postgresql://postgres:Zoma.54559@localhost:5432/bee_jeans_pos?schema=public"
});

// Railway database  
const prismaRailway = new PrismaClient({
  datasourceUrl: "postgresql://postgres:jYrfaMNJbJuExJHgePjMhjkfeDoqYUFd@tokaido.proxy.rlwy.net:29985/railway"
});

async function quickSync() {
  try {
    console.log('\n🚀 مزامنة سريعة للبيانات الأساسية فقط...\n');

    // 1. حذف البيانات (بدون serials عشان السرعة)
    console.log('🗑️  حذف البيانات القديمة...');
    await prismaRailway.saleItem.deleteMany({});
    await prismaRailway.sale.deleteMany({});
    await prismaRailway.customerPayment.deleteMany({});
    await prismaRailway.customer.deleteMany({});
    console.log('✅ تم حذف البيانات القديمة\n');

    // 2. نسخ العملاء
    const customers = await prismaLocal.customer.findMany();
    console.log(`📦 نسخ ${customers.length} عميل...`);
    for (const c of customers) {
      await prismaRailway.customer.create({ data: c });
    }
    console.log('✅ Customers: ' + customers.length);

    // 3. نسخ المبيعات
    const sales = await prismaLocal.sale.findMany();
    console.log(`📦 نسخ ${sales.length} فاتورة...`);
    for (const s of sales) {
      await prismaRailway.sale.create({ data: s });
    }
    console.log('✅ Sales: ' + sales.length);

    // 4. نسخ تفاصيل المبيعات
    const saleItems = await prismaLocal.saleItem.findMany();
    console.log(`📦 نسخ ${saleItems.length} صنف مبيعات...`);
    for (const item of saleItems) {
      await prismaRailway.saleItem.create({ data: item });
    }
    console.log('✅ Sale Items: ' + saleItems.length);

    // 5. نسخ دفعات العملاء
    const payments = await prismaLocal.customerPayment.findMany();
    console.log(`📦 نسخ ${payments.length} دفعة...`);
    for (const p of payments) {
      await prismaRailway.customerPayment.create({ data: p });
    }
    console.log('✅ Customer Payments: ' + payments.length);

    console.log('\n✅ تمت المزامنة بنجاح! 🎉');
    console.log('📊 البيانات الأساسية متزامنة الآن\n');

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error);
  } finally {
    await prismaLocal.$disconnect();
    await prismaRailway.$disconnect();
  }
}

quickSync();
