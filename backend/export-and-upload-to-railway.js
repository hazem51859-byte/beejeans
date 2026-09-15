/**
 * Export complete database and upload to Railway PostgreSQL
 * 
 * Usage:
 * 1. Make sure Railway PostgreSQL is created
 * 2. Get Railway DATABASE_URL from Railway Dashboard
 * 3. Run: node export-and-upload-to-railway.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Railway database URL check
const railwayDbUrl = process.env.RAILWAY_DATABASE_URL;

if (!railwayDbUrl) {
  console.error('❌ Error: RAILWAY_DATABASE_URL environment variable not set!');
  console.log('\n📋 Steps to fix:');
  console.log('1. Go to Railway Dashboard → PostgreSQL service');
  console.log('2. Copy the DATABASE_URL (should start with postgresql://)');
  console.log('3. Run this command:');
  console.log('\n   RAILWAY_DATABASE_URL="postgresql://..." node export-and-upload-to-railway.js\n');
  process.exit(1);
}

// Local database (source)
const localDb = new PrismaClient();

// Railway database (destination)  
const railwayDb = new PrismaClient({
  datasources: {
    db: {
      url: railwayDbUrl
    }
  }
});

async function exportData() {
  console.log('📦 Starting database export from local PostgreSQL...\n');
  
  try {
    // Export all tables
    const data = {
      users: await localDb.user.findMany(),
      branches: await localDb.branch.findMany(),
      categories: await localDb.category.findMany(),
      products: await localDb.product.findMany(),
      customers: await localDb.customer.findMany(),
      suppliers: await localDb.supplier.findMany(),
      sales: await localDb.sale.findMany(),
      saleItems: await localDb.saleItem.findMany(),
      purchases: await localDb.purchase.findMany(),
      purchaseItems: await localDb.purchaseItem.findMany(),
      payments: await localDb.payment.findMany(),
      expenses: await localDb.expense.findMany(),
      inventoryTransactions: await localDb.inventoryTransaction.findMany(),
      transfers: await localDb.transfer.findMany(),
      transferItems: await localDb.transferItem.findMany(),
      audits: await localDb.audit.findMany(),
      auditItems: await localDb.auditItem.findMany(),
      fabricStock: await localDb.fabricStock.findMany(),
      officeCustomers: await localDb.officeCustomer.findMany(),
      officeInvoices: await localDb.officeInvoice.findMany(),
      partnerCapitals: await localDb.partnerCapital.findMany(),
      partnerCapitalAdjustments: await localDb.partnerCapitalAdjustment.findMany(),
    };

    console.log('✅ Data exported successfully!\n');
    console.log('📊 Export Summary:');
    console.log(`   Users: ${data.users.length}`);
    console.log(`   Branches: ${data.branches.length}`);
    console.log(`   Categories: ${data.categories.length}`);
    console.log(`   Products: ${data.products.length}`);
    console.log(`   Customers: ${data.customers.length}`);
    console.log(`   Suppliers: ${data.suppliers.length}`);
    console.log(`   Sales: ${data.sales.length}`);
    console.log(`   Sale Items: ${data.saleItems.length}`);
    console.log(`   Purchases: ${data.purchases.length}`);
    console.log(`   Purchase Items: ${data.purchaseItems.length}`);
    console.log(`   Payments: ${data.payments.length}`);
    console.log(`   Expenses: ${data.expenses.length}`);
    console.log(`   Inventory Transactions: ${data.inventoryTransactions.length}`);
    console.log(`   Transfers: ${data.transfers.length}`);
    console.log(`   Transfer Items: ${data.transferItems.length}`);
    console.log(`   Audits: ${data.audits.length}`);
    console.log(`   Audit Items: ${data.auditItems.length}`);
    console.log(`   Fabric Stock: ${data.fabricStock.length}`);
    console.log(`   Office Customers: ${data.officeCustomers.length}`);
    console.log(`   Office Invoices: ${data.officeInvoices.length}`);
    console.log(`   Partner Capitals: ${data.partnerCapitals.length}`);
    console.log(`   Partner Capital Adjustments: ${data.partnerCapitalAdjustments.length}`);

    return data;
  } catch (error) {
    console.error('❌ Error exporting data:', error.message);
    throw error;
  }
}

async function uploadToRailway(data) {
  console.log('\n🚂 Starting upload to Railway PostgreSQL...\n');
  
  try {
    // Upload in order (respecting foreign keys)
    
    // 1. Users (no dependencies)
    console.log('⬆️  Uploading users...');
    for (const user of data.users) {
      await railwayDb.user.upsert({
        where: { id: user.id },
        create: user,
        update: user
      });
    }
    console.log(`   ✅ ${data.users.length} users uploaded`);

    // 2. Branches (depends on users)
    console.log('⬆️  Uploading branches...');
    for (const branch of data.branches) {
      await railwayDb.branch.upsert({
        where: { id: branch.id },
        create: branch,
        update: branch
      });
    }
    console.log(`   ✅ ${data.branches.length} branches uploaded`);

    // 3. Categories (no dependencies)
    console.log('⬆️  Uploading categories...');
    for (const category of data.categories) {
      await railwayDb.category.upsert({
        where: { id: category.id },
        create: category,
        update: category
      });
    }
    console.log(`   ✅ ${data.categories.length} categories uploaded`);

    // 4. Products (depends on categories and branches)
    console.log('⬆️  Uploading products...');
    for (const product of data.products) {
      await railwayDb.product.upsert({
        where: { id: product.id },
        create: product,
        update: product
      });
    }
    console.log(`   ✅ ${data.products.length} products uploaded`);

    // 5. Customers (depends on branches)
    console.log('⬆️  Uploading customers...');
    for (const customer of data.customers) {
      await railwayDb.customer.upsert({
        where: { id: customer.id },
        create: customer,
        update: customer
      });
    }
    console.log(`   ✅ ${data.customers.length} customers uploaded`);

    // 6. Suppliers (no dependencies)
    console.log('⬆️  Uploading suppliers...');
    for (const supplier of data.suppliers) {
      await railwayDb.supplier.upsert({
        where: { id: supplier.id },
        create: supplier,
        update: supplier
      });
    }
    console.log(`   ✅ ${data.suppliers.length} suppliers uploaded`);

    // 7. Sales (depends on branches, customers, users)
    console.log('⬆️  Uploading sales...');
    for (const sale of data.sales) {
      await railwayDb.sale.upsert({
        where: { id: sale.id },
        create: sale,
        update: sale
      });
    }
    console.log(`   ✅ ${data.sales.length} sales uploaded`);

    // 8. Sale Items (depends on sales, products)
    console.log('⬆️  Uploading sale items...');
    for (const item of data.saleItems) {
      await railwayDb.saleItem.upsert({
        where: { id: item.id },
        create: item,
        update: item
      });
    }
    console.log(`   ✅ ${data.saleItems.length} sale items uploaded`);

    // 9. Purchases (depends on branches, suppliers, users)
    console.log('⬆️  Uploading purchases...');
    for (const purchase of data.purchases) {
      await railwayDb.purchase.upsert({
        where: { id: purchase.id },
        create: purchase,
        update: purchase
      });
    }
    console.log(`   ✅ ${data.purchases.length} purchases uploaded`);

    // 10. Purchase Items (depends on purchases, products)
    console.log('⬆️  Uploading purchase items...');
    for (const item of data.purchaseItems) {
      await railwayDb.purchaseItem.upsert({
        where: { id: item.id },
        create: item,
        update: item
      });
    }
    console.log(`   ✅ ${data.purchaseItems.length} purchase items uploaded`);

    // 11. Payments (depends on customers/suppliers, branches, users)
    console.log('⬆️  Uploading payments...');
    for (const payment of data.payments) {
      await railwayDb.payment.upsert({
        where: { id: payment.id },
        create: payment,
        update: payment
      });
    }
    console.log(`   ✅ ${data.payments.length} payments uploaded`);

    // 12. Expenses (depends on branches, users)
    console.log('⬆️  Uploading expenses...');
    for (const expense of data.expenses) {
      await railwayDb.expense.upsert({
        where: { id: expense.id },
        create: expense,
        update: expense
      });
    }
    console.log(`   ✅ ${data.expenses.length} expenses uploaded`);

    // 13. Inventory Transactions (depends on products, branches, users)
    console.log('⬆️  Uploading inventory transactions...');
    for (const transaction of data.inventoryTransactions) {
      await railwayDb.inventoryTransaction.upsert({
        where: { id: transaction.id },
        create: transaction,
        update: transaction
      });
    }
    console.log(`   ✅ ${data.inventoryTransactions.length} inventory transactions uploaded`);

    // 14. Transfers (depends on branches, users)
    console.log('⬆️  Uploading transfers...');
    for (const transfer of data.transfers) {
      await railwayDb.transfer.upsert({
        where: { id: transfer.id },
        create: transfer,
        update: transfer
      });
    }
    console.log(`   ✅ ${data.transfers.length} transfers uploaded`);

    // 15. Transfer Items (depends on transfers, products)
    console.log('⬆️  Uploading transfer items...');
    for (const item of data.transferItems) {
      await railwayDb.transferItem.upsert({
        where: { id: item.id },
        create: item,
        update: item
      });
    }
    console.log(`   ✅ ${data.transferItems.length} transfer items uploaded`);

    // 16. Audits (depends on branches, users)
    console.log('⬆️  Uploading audits...');
    for (const audit of data.audits) {
      await railwayDb.audit.upsert({
        where: { id: audit.id },
        create: audit,
        update: audit
      });
    }
    console.log(`   ✅ ${data.audits.length} audits uploaded`);

    // 17. Audit Items (depends on audits, products)
    console.log('⬆️  Uploading audit items...');
    for (const item of data.auditItems) {
      await railwayDb.auditItem.upsert({
        where: { id: item.id },
        create: item,
        update: item
      });
    }
    console.log(`   ✅ ${data.auditItems.length} audit items uploaded`);

    // 18. Fabric Stock (depends on suppliers)
    console.log('⬆️  Uploading fabric stock...');
    for (const fabric of data.fabricStock) {
      await railwayDb.fabricStock.upsert({
        where: { id: fabric.id },
        create: fabric,
        update: fabric
      });
    }
    console.log(`   ✅ ${data.fabricStock.length} fabric stock uploaded`);

    // 19. Office Customers (no dependencies)
    console.log('⬆️  Uploading office customers...');
    for (const customer of data.officeCustomers) {
      await railwayDb.officeCustomer.upsert({
        where: { id: customer.id },
        create: customer,
        update: customer
      });
    }
    console.log(`   ✅ ${data.officeCustomers.length} office customers uploaded`);

    // 20. Office Invoices (depends on office customers)
    console.log('⬆️  Uploading office invoices...');
    for (const invoice of data.officeInvoices) {
      await railwayDb.officeInvoice.upsert({
        where: { id: invoice.id },
        create: invoice,
        update: invoice
      });
    }
    console.log(`   ✅ ${data.officeInvoices.length} office invoices uploaded`);

    // 21. Partner Capitals (no dependencies)
    console.log('⬆️  Uploading partner capitals...');
    for (const capital of data.partnerCapitals) {
      await railwayDb.partnerCapital.upsert({
        where: { id: capital.id },
        create: capital,
        update: capital
      });
    }
    console.log(`   ✅ ${data.partnerCapitals.length} partner capitals uploaded`);

    // 22. Partner Capital Adjustments (depends on partner capitals)
    console.log('⬆️  Uploading partner capital adjustments...');
    for (const adjustment of data.partnerCapitalAdjustments) {
      await railwayDb.partnerCapitalAdjustment.upsert({
        where: { id: adjustment.id },
        create: adjustment,
        update: adjustment
      });
    }
    console.log(`   ✅ ${data.partnerCapitalAdjustments.length} partner capital adjustments uploaded`);

    console.log('\n🎉 All data uploaded successfully to Railway!\n');
    
  } catch (error) {
    console.error('❌ Error uploading data:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Database Migration Tool\n');
    console.log('   Source: Local PostgreSQL (bee_jeans_pos)');
    console.log(`   Destination: Railway PostgreSQL\n`);
    console.log('════════════════════════════════════════════════\n');

    // Export from local
    const data = await exportData();

    // Upload to Railway
    await uploadToRailway(data);

    console.log('════════════════════════════════════════════════');
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test your Railway deployment');
    console.log('2. Update backend .env to use Railway DATABASE_URL');
    console.log('3. Deploy to Railway\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await localDb.$disconnect();
    await railwayDb.$disconnect();
  }
}

main();
