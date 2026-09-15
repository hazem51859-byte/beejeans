const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixShipmentInvoices() {
  try {
    console.log('🔧 Fixing shipment invoices...');

    // جلب كل فواتير الشحن اللي لسه pending
    const shipmentInvoices = await prisma.officeInvoice.findMany({
      where: {
        type: 'SHIPMENT',
        status: { in: ['PENDING', 'SHIPPED'] }
      },
      include: {
        shipment: true
      }
    });

    console.log(`Found ${shipmentInvoices.length} shipment invoices`);

    for (const invoice of shipmentInvoices) {
      // لو الشحنة لسه مش متحصل فلوسها، صفر paidAmount
      if (!invoice.shipment?.paymentCollected) {
        const updated = await prisma.officeInvoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: 0,
            remainingAmount: invoice.total
          }
        });
        console.log(`✅ Fixed invoice ${invoice.invoiceNumber} - set paidAmount to 0`);
      } else {
        console.log(`⏭️  Invoice ${invoice.invoiceNumber} already collected - skipped`);
      }
    }

    console.log('✅ Done fixing shipment invoices!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixShipmentInvoices();
