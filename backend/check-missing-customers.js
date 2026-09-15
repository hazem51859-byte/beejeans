const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMissingCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        officeInvoices: true
      }
    });

    console.log('📊 إجمالي العملاء:', customers.length);

    const withInvoices = customers.filter(c => c.officeInvoices.length > 0);
    const withoutInvoices = customers.filter(c => c.officeInvoices.length === 0);

    console.log('✅ عملاء ليهم فواتير:', withInvoices.length);
    console.log('❌ عملاء بدون فواتير:', withoutInvoices.length);

    if (withoutInvoices.length > 0) {
      console.log('\n❌ العملاء اللي مفيش ليهم فواتير (رصيدهم صفر):');
      withoutInvoices.forEach(c => {
        console.log(`   - ${c.name} (محفظة: ${c.walletBalance || 0} ج.م)`);
      });
    }

    console.log('\n✅ العملاء اللي ليهم فواتير:');
    withInvoices.slice(0, 5).forEach(c => {
      console.log(`   - ${c.name}: ${c.officeInvoices.length} فاتورة`);
    });

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingCustomers();
