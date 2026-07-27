const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllData() {
  try {
    console.log('🔍 Comprehensive Database Check\n');
    console.log('═══════════════════════════════════════\n');

    // Core Data
    console.log('📊 CORE DATA:');
    const branches = await prisma.branch.count();
    const users = await prisma.user.count();
    const products = await prisma.product.count();
    console.log(`   Branches: ${branches}`);
    console.log(`   Users: ${users}`);
    console.log(`   Products: ${products}`);

    // Sales & Customers
    console.log('\n💰 SALES & CUSTOMERS:');
    const sales = await prisma.sale.count();
    const customers = await prisma.customer.count();
    const customerPayments = await prisma.customerPayment.count();
    console.log(`   Sales: ${sales}`);
    console.log(`   Customers: ${customers}`);
    console.log(`   Customer Payments: ${customerPayments}`);

    // Inventory & Transfers
    console.log('\n📦 INVENTORY & TRANSFERS:');
    const inventory = await prisma.inventory.count();
    const transfers = await prisma.transfer.count();
    const transferItems = await prisma.transferItem.count();
    console.log(`   Inventory Records: ${inventory}`);
    console.log(`   Transfers: ${transfers}`);
    console.log(`   Transfer Items: ${transferItems}`);

    // Suppliers & Purchases
    console.log('\n🏭 SUPPLIERS & PURCHASES:');
    const suppliers = await prisma.supplier.count();
    const purchases = await prisma.purchase.count();
    const supplierPayments = await prisma.supplierPayment.count();
    console.log(`   Suppliers: ${suppliers}`);
    console.log(`   Purchases: ${purchases}`);
    console.log(`   Supplier Payments: ${supplierPayments}`);

    // Fabric & Production
    console.log('\n🧵 FABRIC & PRODUCTION:');
    const fabricTypes = await prisma.fabricType.count();
    const fabricStock = await prisma.fabricStock.count();
    const fabricPurchases = await prisma.fabricPurchase.count();
    const manufacturingOrders = await prisma.manufacturingOrder.count();
    const washingOrders = await prisma.washingOrder.count();
    console.log(`   Fabric Types: ${fabricTypes}`);
    console.log(`   Fabric Stock: ${fabricStock}`);
    console.log(`   Fabric Purchases: ${fabricPurchases}`);
    console.log(`   Manufacturing Orders: ${manufacturingOrders}`);
    console.log(`   Washing Orders: ${washingOrders}`);

    // Vault & Money
    console.log('\n💵 VAULT & FINANCES:');
    const vaultTransactions = await prisma.vaultTransaction.count();
    const moneyTransfers = await prisma.moneyTransfer.count();
    const expenses = await prisma.expense.count();
    const partners = await prisma.partner.count();
    console.log(`   Vault Transactions: ${vaultTransactions}`);
    console.log(`   Money Transfers: ${moneyTransfers}`);
    console.log(`   Expenses: ${expenses}`);
    console.log(`   Partners: ${partners}`);

    // Returns & Office Invoices
    console.log('\n↩️  RETURNS & OFFICE:');
    const returns = await prisma.return.count();
    const officeInvoices = await prisma.officeInvoice.count();
    const shipments = await prisma.shipment.count();
    console.log(`   Returns: ${returns}`);
    console.log(`   Office Invoices: ${officeInvoices}`);
    console.log(`   Shipments: ${shipments}`);

    console.log('\n═══════════════════════════════════════\n');

    // Show sample data
    if (suppliers > 0) {
      console.log('🏭 Sample Suppliers:');
      const sampleSuppliers = await prisma.supplier.findMany({ take: 3 });
      sampleSuppliers.forEach(s => {
        console.log(`   - ${s.name} (${s.type})`);
        console.log(`     Balance: ${s.balance.toFixed(2)} ج.م`);
      });
    }

    if (products > 0) {
      console.log('\n📦 Sample Products:');
      const sampleProducts = await prisma.product.findMany({ take: 5 });
      sampleProducts.forEach(p => {
        console.log(`   - ${p.name}`);
        console.log(`     Cost: ${p.costPrice} ج.م, Selling: ${p.sellingPrice} ج.م`);
      });
    }

    if (fabricTypes > 0) {
      console.log('\n🧵 Sample Fabric Types:');
      const sampleFabrics = await prisma.fabricType.findMany({ take: 3 });
      sampleFabrics.forEach(f => {
        console.log(`   - ${f.name}: ${f.pricePerMeter} ج.م/متر`);
      });
    }

    if (inventory > 0) {
      console.log('\n📦 Sample Inventory:');
      const sampleInventory = await prisma.inventory.findMany({ 
        take: 5,
        include: { product: true, branch: true }
      });
      sampleInventory.forEach(i => {
        console.log(`   - ${i.product.name} @ ${i.branch.name}: ${i.quantity} قطعة`);
      });
    }

    console.log('\n═══════════════════════════════════════\n');

    // Check for missing critical data
    const issues = [];
    if (suppliers === 0) issues.push('⚠️  No suppliers found');
    if (products === 0) issues.push('⚠️  No products found');
    if (fabricTypes === 0) issues.push('⚠️  No fabric types found');
    if (inventory === 0) issues.push('⚠️  No inventory records found');

    if (issues.length > 0) {
      console.log('🚨 ISSUES DETECTED:');
      issues.forEach(i => console.log(i));
      console.log('\n❌ Some critical data is missing!');
      console.log('   The backup may not have included all tables.\n');
    } else {
      console.log('✅ All critical data present!\n');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkAllData();
