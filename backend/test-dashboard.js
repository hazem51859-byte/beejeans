const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDashboard() {
  try {
    console.log('🔍 Testing office invoices dashboard...');

    const officeInvoices = await prisma.officeInvoice.aggregate({
      where: {
        status: { not: 'CANCELLED' }
      },
      _sum: {
        total: true,
        paidAmount: true,
        profit: true
      },
      _count: true
    });

    console.log('Office Invoices Data:', officeInvoices);
    
    // Get all invoices for details
    const allInvoices = await prisma.officeInvoice.findMany({
      where: {
        status: { not: 'CANCELLED' }
      },
      select: {
        id: true,
        invoiceNumber: true,
        type: true,
        total: true,
        paidAmount: true,
        profit: true,
        status: true
      }
    });

    console.log('\nAll Invoices:');
    allInvoices.forEach(inv => {
      console.log(`${inv.invoiceNumber} (${inv.type}): Total=${inv.total}, Paid=${inv.paidAmount}, Profit=${inv.profit}, Status=${inv.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboard();
