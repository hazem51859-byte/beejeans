const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function exportDatabase() {
  console.log('📦 بدء تصدير قاعدة البيانات...\n');

  try {
    // Export all data
    const data = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      
      // Core data
      categories: await prisma.category.findMany(),
      branches: await prisma.branch.findMany(),
      users: await prisma.user.findMany(),
      
      // Products and Inventory
      products: await prisma.product.findMany(),
      inventory: await prisma.inventory.findMany(),
      
      // Sales
      sales: await prisma.sale.findMany({
        include: {
          items: true
        }
      }),
      
      // Customers
      customers: await prisma.customer.findMany(),
      customerPayments: await prisma.customerPayment.findMany(),
      
      // Suppliers
      suppliers: await prisma.supplier.findMany(),
      supplierPayments: await prisma.supplierPayment.findMany(),
      
      // Production System
      fabricTypes: await prisma.fabricType.findMany(),
      fabricPurchases: await prisma.fabricPurchase.findMany(),
      manufacturingOrders: await prisma.manufacturingOrder.findMany(),
      washingOrders: await prisma.washingOrder.findMany(),
      
      // Transfers
      transfers: await prisma.transfer.findMany({
        include: {
          items: true
        }
      }),
      
      // Expenses
      expenses: await prisma.expense.findMany(),
      
      // Returns
      returns: await prisma.return.findMany({
        include: {
          items: true
        }
      }),
      
      // Vault
      vaultTransactions: await prisma.vaultTransaction.findMany(),
      
      // Shifts
      shifts: await prisma.shift.findMany(),
      
      // Partners
      partners: await prisma.partner.findMany(),
      partnerTransactions: await prisma.partnerTransaction.findMany(),
      
      // Additional tables
      productSerials: await prisma.productSerial.findMany(),
      fabricStock: await prisma.fabricStock.findMany(),
      moneyTransfers: await prisma.moneyTransfer.findMany(),
      activityLogs: await prisma.activityLog.findMany()
    };

    // Calculate statistics
    const stats = {
      categories: data.categories.length,
      branches: data.branches.length,
      users: data.users.length,
      products: data.products.length,
      inventory: data.inventory.length,
      sales: data.sales.length,
      saleItems: data.sales.reduce((sum, sale) => sum + sale.items.length, 0),
      customers: data.customers.length,
      customerPayments: data.customerPayments.length,
      suppliers: data.suppliers.length,
      supplierPayments: data.supplierPayments.length,
      fabricTypes: data.fabricTypes.length,
      fabricPurchases: data.fabricPurchases.length,
      fabricStock: data.fabricStock.length,
      manufacturingOrders: data.manufacturingOrders.length,
      washingOrders: data.washingOrders.length,
      transfers: data.transfers.length,
      transferItems: data.transfers.reduce((sum, t) => sum + t.items.length, 0),
      expenses: data.expenses.length,
      returns: data.returns.length,
      returnItems: data.returns.reduce((sum, r) => sum + r.items.length, 0),
      vaultTransactions: data.vaultTransactions.length,
      shifts: data.shifts.length,
      partners: data.partners.length,
      partnerTransactions: data.partnerTransactions.length,
      productSerials: data.productSerials.length,
      moneyTransfers: data.moneyTransfers.length,
      activityLogs: data.activityLogs.length
    };

    console.log('📊 إحصائيات البيانات:');
    console.log(JSON.stringify(stats, null, 2));
    console.log();

    // Save to file
    const backupDir = path.join(__dirname, 'backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const filename = `database-backup-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    console.log(`✅ تم تصدير البيانات بنجاح إلى:`);
    console.log(`   ${filepath}`);
    console.log();
    console.log(`📝 حجم الملف: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);
    console.log();
    console.log('🚀 الخطوات التالية:');
    console.log('   1. استخدم هذا الملف لاستعادة البيانات على Railway');
    console.log('   2. شغل import-database.js على السيرفر الجديد');
    console.log();

  } catch (error) {
    console.error('❌ حدث خطأ أثناء التصدير:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabase();
