const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomers() {
  try {
    const count = await prisma.customer.count();
    console.log(`\n📊 إجمالي العملاء الدائمين: ${count}\n`);
    
    const customers = await prisma.customer.findMany({
      take: 5,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            sales: true,
            officeInvoices: true,
            payments: true
          }
        }
      }
    });
    
    console.log('أول 5 عملاء:\n');
    customers.forEach(c => {
      console.log(`👤 ${c.name}`);
      console.log(`   💰 رصيد المحفظة: ${c.walletBalance || 0} جنيه`);
      console.log(`   📊 عدد الفواتير: ${c._count.officeInvoices}`);
      console.log(`   💵 عدد الدفعات: ${c._count.payments}`);
      console.log('');
    });

    // جلب الـ OfficeCustomers
    const officeCustomersCount = await prisma.officeCustomer.count();
    console.log(`\n📊 إجمالي الزباين العاديين: ${officeCustomersCount}\n`);

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomers();
