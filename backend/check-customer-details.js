const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomerDetails() {
  try {
    console.log('🔍 Checking customer details...\n');
    
    // Get first customer with sales
    const customers = await prisma.customer.findMany({
      take: 1
    });
    
    if (customers.length === 0) {
      console.log('⚠️ No customers found');
      return;
    }
    
    const customerId = customers[0].id;
    console.log('Customer:', customers[0].name, '- ID:', customerId);
    console.log();
    
    // Get customer details like the API does
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });
    
    const sales = await prisma.sale.findMany({
      where: { customerId: customerId },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const payments = await prisma.customerPayment.findMany({
      where: { customerId: customerId },
      orderBy: { paymentDate: 'desc' }
    });
    
    console.log('📊 Sales:', sales.length);
    console.log('💰 Payments:', payments.length);
    console.log();
    
    if (sales.length > 0) {
      console.log('📋 Sales Details:');
      sales.forEach((sale, idx) => {
        console.log(`\n${idx + 1}. Invoice: ${sale.invoiceNumber}`);
        console.log(`   Date: ${sale.createdAt.toLocaleDateString('ar-EG')}`);
        console.log(`   Total: ${sale.total} ج.م`);
        console.log(`   Paid: ${sale.amountPaid} ج.م`);
        console.log(`   Remaining: ${sale.total - sale.amountPaid} ج.م`);
        console.log(`   Items (${sale.items.length}):`);
        sale.items.forEach((item, itemIdx) => {
          console.log(`     ${itemIdx + 1}. ${item.product?.name || 'N/A'} - ${item.quantity} x ${item.unitPrice} = ${item.total}`);
          if (item.size) console.log(`        Size: ${item.size}`);
          if (item.color) console.log(`        Color: ${item.color}`);
        });
      });
    }
    
    if (payments.length > 0) {
      console.log('\n\n💵 Payments:');
      payments.forEach((payment, idx) => {
        console.log(`${idx + 1}. ${payment.paymentDate.toLocaleDateString('ar-EG')} - ${payment.amount} ج.م - ${payment.paymentMethod}`);
      });
    }
    
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalPaidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalSales - totalPaidOnSales - totalPayments;
    
    console.log('\n\n📈 Summary:');
    console.log('Total Sales:', totalSales.toFixed(2), 'ج.م');
    console.log('Paid on Sales:', totalPaidOnSales.toFixed(2), 'ج.م');
    console.log('Total Payments:', totalPayments.toFixed(2), 'ج.م');
    console.log('Balance:', balance.toFixed(2), 'ج.م');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomerDetails();
