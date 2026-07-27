const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCustomerAPI() {
  try {
    console.log('🔍 اختبار API العملاء...\n');
    
    // الحصول على جميع العملاء (محاكاة getAllCustomers)
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`✅ تم العثور على ${customers.length} عميل\n`);
    
    for (const customer of customers) {
      console.log(`📋 ${customer.name} (${customer.id})`);
      
      const sales = await prisma.sale.findMany({
        where: { customerId: customer.id, status: 'COMPLETED' }
      });
      
      const officeInvoices = await prisma.officeInvoice.findMany({
        where: { 
          customerId: customer.id,
          status: { not: 'CANCELLED' }
        }
      });
      
      const payments = await prisma.customerPayment.findMany({
        where: { customerId: customer.id }
      });
      
      const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
      const totalPaidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);
      const totalOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaidOnOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
      
      const balance = totalSales + totalOfficeInvoices - totalPaidOnSales - totalPaidOnOfficeInvoices - totalPayments;
      
      console.log(`   فواتير التقسيط: ${sales.length}`);
      console.log(`   فواتير المكتب: ${officeInvoices.length}`);
      console.log(`   الدفعات: ${payments.length}`);
      console.log(`   إجمالي المبيعات: ${(totalSales + totalOfficeInvoices).toFixed(2)} ج.م`);
      console.log(`   إجمالي المدفوع: ${(totalPaidOnSales + totalPaidOnOfficeInvoices + totalPayments).toFixed(2)} ج.م`);
      console.log(`   الرصيد: ${balance.toFixed(2)} ج.م\n`);
    }
    
    // الآن اختبار getCustomerById لأسامة السري
    const osama = customers.find(c => c.name.includes('اسامه') || c.name.includes('اسامة'));
    
    if (osama) {
      console.log('='.repeat(50));
      console.log('🔍 اختبار getCustomerById لأسامة السري:');
      console.log('='.repeat(50));
      
      const customerDetail = await prisma.customer.findUnique({
        where: { id: osama.id }
      });
      
      const sales = await prisma.sale.findMany({
        where: { customerId: osama.id },
        include: {
          items: {
            include: { product: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      const officeInvoices = await prisma.officeInvoice.findMany({
        where: { 
          customerId: osama.id,
          status: { not: 'CANCELLED' }
        },
        include: {
          items: {
            include: { product: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      const payments = await prisma.customerPayment.findMany({
        where: { customerId: osama.id },
        orderBy: { paymentDate: 'desc' }
      });
      
      console.log(`\n✅ Customer Object:`);
      console.log(JSON.stringify(customerDetail, null, 2));
      
      console.log(`\n✅ Sales Array (${sales.length} items):`);
      if (sales.length > 0) {
        console.log(JSON.stringify(sales, null, 2));
      } else {
        console.log('[]');
      }
      
      console.log(`\n✅ Office Invoices Array (${officeInvoices.length} items):`);
      if (officeInvoices.length > 0) {
        console.log(JSON.stringify(officeInvoices, null, 2));
      } else {
        console.log('[]');
      }
      
      console.log(`\n✅ Payments Array (${payments.length} items):`);
      if (payments.length > 0) {
        console.log(JSON.stringify(payments, null, 2));
      } else {
        console.log('[]');
      }
    }
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testCustomerAPI();
