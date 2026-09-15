const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomerInvoice() {
  try {
    console.log('🔍 Checking customer sales...\n');
    
    // Get all sales with customer
    const sales = await prisma.sale.findMany({
      where: {
        customerId: { not: null }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        cashier: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${sales.length} customer sales\n`);
    
    if (sales.length > 0) {
      const firstSale = sales[0];
      console.log('📋 First Sale Details:');
      console.log('ID:', firstSale.id);
      console.log('Invoice Number:', firstSale.invoiceNumber);
      console.log('Customer:', firstSale.customer?.name || 'N/A');
      console.log('Total:', firstSale.total);
      console.log('Amount Paid:', firstSale.amountPaid);
      console.log('Remaining:', firstSale.total - firstSale.amountPaid);
      console.log('Items:', firstSale.items.length);
      console.log('\nItems Details:');
      firstSale.items.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.product?.name || 'Unknown'} - ${item.quantity} x ${item.unitPrice} = ${item.total}`);
      });
      
      console.log('\n✅ Test this URL in browser:');
      console.log(`http://localhost:3000/print/customer-invoice/${firstSale.id}`);
      console.log('\n✅ Test this API endpoint:');
      console.log(`GET http://localhost:5000/api/v1/customers/invoices/${firstSale.id}`);
    } else {
      console.log('⚠️ No customer sales found. Create a sale first from the Customers page.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomerInvoice();
