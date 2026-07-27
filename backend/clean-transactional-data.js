const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTransactionalData() {
  console.log('🧹 Starting database cleanup...\n');
  console.log('⚠️  This will delete ALL transactional data but keep:');
  console.log('   ✅ Branches');
  console.log('   ✅ Users');
  console.log('   ✅ Suppliers (names only)');
  console.log('   ✅ Customers (names only)');
  console.log('   ✅ Fabric Types');
  console.log('   ✅ Products');
  console.log('   ✅ Categories\n');

  try {
    // Delete transactional data in correct order (respecting foreign keys)
    console.log('🗑️  Deleting transactional data...\n');

    // Office invoices and shipments
    await prisma.officeInvoiceItem.deleteMany({});
    console.log('  ✓ Office Invoice Items deleted');
    
    await prisma.officeInvoice.deleteMany({});
    console.log('  ✓ Office Invoices deleted');
    
    await prisma.shipment.deleteMany({});
    console.log('  ✓ Shipments deleted');

    // Returns
    await prisma.returnItem.deleteMany({});
    console.log('  ✓ Return Items deleted');
    
    await prisma.return.deleteMany({});
    console.log('  ✓ Returns deleted');

    // Sales
    await prisma.saleItem.deleteMany({});
    console.log('  ✓ Sale Items deleted');
    
    await prisma.sale.deleteMany({});
    console.log('  ✓ Sales deleted');

    // Product serials
    await prisma.productSerial.deleteMany({});
    console.log('  ✓ Product Serials deleted');

    // Transfers
    await prisma.transferItem.deleteMany({});
    console.log('  ✓ Transfer Items deleted');
    
    await prisma.transfer.deleteMany({});
    console.log('  ✓ Transfers deleted');

    // Production
    await prisma.washingOrder.deleteMany({});
    console.log('  ✓ Washing Orders deleted');
    
    await prisma.manufacturingOrder.deleteMany({});
    console.log('  ✓ Manufacturing Orders deleted');

    // Fabric
    await prisma.fabricPurchase.deleteMany({});
    console.log('  ✓ Fabric Purchases deleted');
    
    await prisma.fabricStock.deleteMany({});
    console.log('  ✓ Fabric Stock deleted');

    // Purchases
    await prisma.purchaseItem.deleteMany({});
    console.log('  ✓ Purchase Items deleted');
    
    await prisma.purchase.deleteMany({});
    console.log('  ✓ Purchases deleted');

    // Payments
    await prisma.supplierPayment.deleteMany({});
    console.log('  ✓ Supplier Payments deleted');
    
    await prisma.customerPayment.deleteMany({});
    console.log('  ✓ Customer Payments deleted');

    // Vault & Money
    await prisma.vaultTransaction.deleteMany({});
    console.log('  ✓ Vault Transactions deleted');
    
    await prisma.moneyTransfer.deleteMany({});
    console.log('  ✓ Money Transfers deleted');

    // Expenses & Partners
    await prisma.expense.deleteMany({});
    console.log('  ✓ Expenses deleted');
    
    await prisma.partnerTransaction.deleteMany({});
    console.log('  ✓ Partner Transactions deleted');
    
    await prisma.partner.deleteMany({});
    console.log('  ✓ Partners deleted');

    // Shifts
    await prisma.shift.deleteMany({});
    console.log('  ✓ Shifts deleted');

    // Inventory
    await prisma.inventory.deleteMany({});
    console.log('  ✓ Inventory deleted');

    // Activity logs & Sync logs
    await prisma.activityLog.deleteMany({});
    console.log('  ✓ Activity Logs deleted');
    
    await prisma.syncLog.deleteMany({});
    console.log('  ✓ Sync Logs deleted');

    console.log('\n📊 Resetting supplier and customer balances...\n');

    // Reset supplier balances
    await prisma.supplier.updateMany({
      data: {
        totalPurchases: 0,
        totalPaid: 0,
        balance: 0
      }
    });
    console.log('  ✓ Supplier balances reset');

    // Reset branch vault balances
    await prisma.branch.updateMany({
      data: {
        vaultBalance: 0,
        cardVaultBalance: 0
      }
    });
    console.log('  ✓ Branch vault balances reset');

    console.log('\n✅ Database cleanup completed!\n');

    // Show what's left
    console.log('📊 Remaining Data:');
    const counts = {
      branches: await prisma.branch.count(),
      users: await prisma.user.count(),
      suppliers: await prisma.supplier.count(),
      customers: await prisma.customer.count(),
      fabricTypes: await prisma.fabricType.count(),
      products: await prisma.product.count(),
      categories: await prisma.category.count()
    };

    console.log(`  - Branches: ${counts.branches}`);
    console.log(`  - Users: ${counts.users}`);
    console.log(`  - Suppliers: ${counts.suppliers}`);
    console.log(`  - Customers: ${counts.customers}`);
    console.log(`  - Fabric Types: ${counts.fabricTypes}`);
    console.log(`  - Products: ${counts.products}`);
    console.log(`  - Categories: ${counts.categories}`);

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanTransactionalData().catch(console.error);
