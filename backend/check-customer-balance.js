const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomerBalance() {
  try {
    const customers = await prisma.customer.findMany();
    
    console.log('\n=== فحص أرصدة العملاء ===\n');
    
    for (const customer of customers) {
      // جلب فواتير التقسيط
      const sales = await prisma.sale.findMany({
        where: { customerId: customer.id, status: 'COMPLETED' }
      });
      
      // جلب فواتير المكتب
      const officeInvoices = await prisma.officeInvoice.findMany({
        where: { 
          customerId: customer.id,
          status: { not: 'CANCELLED' }
        }
      });
      
      // جلب الدفعات
      const payments = await prisma.customerPayment.findMany({
        where: { customerId: customer.id }
      });
      
      const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
      const totalPaidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);
      const totalOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaidOnOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
      
      const calculatedBalance = totalSales + totalOfficeInvoices - totalPaidOnSales - totalPaidOnOfficeInvoices - totalPayments;
      
      console.log(`\n👤 ${customer.name} (ID: ${customer.id})`);
      console.log(`   الرصيد في قاعدة البيانات: ${customer.balance} جنيه`);
      console.log(`   الرصيد المحسوب: ${calculatedBalance.toFixed(2)} جنيه`);
      console.log(`   ---`);
      console.log(`   فواتير التقسيط: ${totalSales.toFixed(2)} جنيه (مدفوع: ${totalPaidOnSales.toFixed(2)})`);
      console.log(`   فواتير المكتب: ${totalOfficeInvoices.toFixed(2)} جنيه (مدفوع: ${totalPaidOnOfficeInvoices.toFixed(2)})`);
      console.log(`   الدفعات المباشرة: ${totalPayments.toFixed(2)} جنيه`);
      
      if (Math.abs(customer.balance - calculatedBalance) > 0.01) {
        console.log(`   ⚠️  فرق في الرصيد: ${(customer.balance - calculatedBalance).toFixed(2)} جنيه`);
      }
    }
    
    console.log('\n✅ تم الفحص\n');
    
  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomerBalance();
