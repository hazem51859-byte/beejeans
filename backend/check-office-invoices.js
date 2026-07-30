const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOfficeInvoices() {
  try {
    console.log('📋 Checking Office Invoices...\n');
    
    const invoices = await prisma.officeInvoice.findMany({
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`✅ Total Office Invoices: ${invoices.length}\n`);
    
    if (invoices.length === 0) {
      console.log('💡 No office invoices found yet.');
    } else {
      console.log('Recent invoices:');
      invoices.slice(0, 5).forEach((inv, i) => {
        console.log(`\n${i + 1}. ${inv.invoiceNumber}`);
        console.log(`   Type: ${inv.type}`);
        console.log(`   Customer: ${inv.customerName}`);
        console.log(`   Total: ${inv.total} ج`);
        console.log(`   Status: ${inv.status}`);
        console.log(`   Items: ${inv.items.length} products`);
        console.log(`   Created: ${inv.createdAt.toISOString()}`);
      });
    }
    
    // Check for incomplete invoices (created but no inventory update)
    const mainWarehouse = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });
    
    if (mainWarehouse) {
      console.log(`\n\n🏢 Main Warehouse: ${mainWarehouse.name}`);
      console.log(`   Cash Balance: ${mainWarehouse.vaultBalance || 0} ج`);
      console.log(`   Card Balance: ${mainWarehouse.cardVaultBalance || 0} ج`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOfficeInvoices();
