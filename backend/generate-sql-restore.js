const fs = require('fs');
const path = require('path');

// Read backup file
const backupFile = process.argv[2];
if (!backupFile) {
  console.error('❌ يرجى تحديد ملف النسخة الاحتياطية');
  console.log('الاستخدام: node generate-sql-restore.js backup/database-backup-XXX.json');
  process.exit(1);
}

console.log('📂 قراءة الملف:', backupFile);
const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

let sql = `-- =====================================================
-- SQL Restore Script
-- Generated from: ${backupFile}
-- Date: ${new Date().toISOString()}
-- =====================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Clean existing data
DELETE FROM activity_logs;
DELETE FROM return_items;
DELETE FROM returns;
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM transfer_items;
DELETE FROM transfers;
DELETE FROM product_serials;
DELETE FROM washing_orders;
DELETE FROM manufacturing_orders;
DELETE FROM fabric_stock;
DELETE FROM fabric_purchases;
DELETE FROM fabric_types;
DELETE FROM purchase_items;
DELETE FROM purchases;
DELETE FROM supplier_payments;
DELETE FROM customer_payments;
DELETE FROM money_transfers;
DELETE FROM vault_transactions;
DELETE FROM expenses;
DELETE FROM inventory;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM shifts;
DELETE FROM users;
DELETE FROM branches;
DELETE FROM customers;
DELETE FROM suppliers;
DELETE FROM partner_transactions;
DELETE FROM partners;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

`;

// Helper to escape SQL strings
function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    return `'${val.replace(/'/g, "''")}'`;
  }
  if (val instanceof Date || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/))) {
    return `'${val}'`;
  }
  return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
}

// Insert branches
if (data.branches?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Branches (${data.branches.length})\n`;
  sql += `-- =====================================================\n`;
  data.branches.forEach(branch => {
    sql += `INSERT INTO branches (id, name, code, url, address, phone, city, "isActive", "vaultBalance", "cardVaultBalance", "createdAt", "updatedAt")
VALUES (${escapeSql(branch.id)}, ${escapeSql(branch.name)}, ${escapeSql(branch.code)}, ${escapeSql(branch.url)}, ${escapeSql(branch.address)}, ${escapeSql(branch.phone)}, ${escapeSql(branch.city)}, ${escapeSql(branch.isActive)}, ${escapeSql(branch.vaultBalance)}, ${escapeSql(branch.cardVaultBalance)}, ${escapeSql(branch.createdAt)}, ${escapeSql(branch.updatedAt)});\n`;
  });
}

// Insert users
if (data.users?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Users (${data.users.length})\n`;
  sql += `-- =====================================================\n`;
  data.users.forEach(user => {
    sql += `INSERT INTO users (id, username, email, password, "fullName", phone, role, "isActive", "branchId", "createdAt", "updatedAt")
VALUES (${escapeSql(user.id)}, ${escapeSql(user.username)}, ${escapeSql(user.email)}, ${escapeSql(user.password)}, ${escapeSql(user.fullName)}, ${escapeSql(user.phone)}, ${escapeSql(user.role)}, ${escapeSql(user.isActive)}, ${escapeSql(user.branchId)}, ${escapeSql(user.createdAt)}, ${escapeSql(user.updatedAt)});\n`;
  });
}

// Insert customers
if (data.customers?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Customers (${data.customers.length})\n`;
  sql += `-- =====================================================\n`;
  data.customers.forEach(customer => {
    sql += `INSERT INTO customers (id, name, phone, address, notes, "isActive", "createdAt", "updatedAt")
VALUES (${escapeSql(customer.id)}, ${escapeSql(customer.name)}, ${escapeSql(customer.phone)}, ${escapeSql(customer.address)}, ${escapeSql(customer.notes)}, ${escapeSql(customer.isActive)}, ${escapeSql(customer.createdAt)}, ${escapeSql(customer.updatedAt)});\n`;
  });
}

// Insert suppliers
if (data.suppliers?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Suppliers (${data.suppliers.length})\n`;
  sql += `-- =====================================================\n`;
  data.suppliers.forEach(supplier => {
    sql += `INSERT INTO suppliers (id, name, phone, email, address, type, "totalPurchases", "totalPaid", balance, notes, "isActive", "createdAt", "updatedAt")
VALUES (${escapeSql(supplier.id)}, ${escapeSql(supplier.name)}, ${escapeSql(supplier.phone)}, ${escapeSql(supplier.email)}, ${escapeSql(supplier.address)}, ${escapeSql(supplier.type)}, ${escapeSql(supplier.totalPurchases)}, ${escapeSql(supplier.totalPaid)}, ${escapeSql(supplier.balance)}, ${escapeSql(supplier.notes)}, ${escapeSql(supplier.isActive)}, ${escapeSql(supplier.createdAt)}, ${escapeSql(supplier.updatedAt)});\n`;
  });
}

// Insert products
if (data.products?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Products (${data.products.length})\n`;
  sql += `-- =====================================================\n`;
  data.products.forEach(product => {
    sql += `INSERT INTO products (id, sku, barcode, name, description, "categoryId", attributes, "costPrice", "sellingPrice", "fabricCost", "fabricMetersUsed", "manufacturingCost", "washingCost", "totalPiecesProduced", size, color, brand, "taxRate", "reorderLevel", status, "imageUrl", "createdAt", "updatedAt")
VALUES (${escapeSql(product.id)}, ${escapeSql(product.sku)}, ${escapeSql(product.barcode)}, ${escapeSql(product.name)}, ${escapeSql(product.description)}, ${escapeSql(product.categoryId)}, ${escapeSql(product.attributes)}, ${escapeSql(product.costPrice)}, ${escapeSql(product.sellingPrice)}, ${escapeSql(product.fabricCost)}, ${escapeSql(product.fabricMetersUsed)}, ${escapeSql(product.manufacturingCost)}, ${escapeSql(product.washingCost)}, ${escapeSql(product.totalPiecesProduced)}, ${escapeSql(product.size)}, ${escapeSql(product.color)}, ${escapeSql(product.brand)}, ${escapeSql(product.taxRate)}, ${escapeSql(product.reorderLevel)}, ${escapeSql(product.status)}, ${escapeSql(product.imageUrl)}, ${escapeSql(product.createdAt)}, ${escapeSql(product.updatedAt)});\n`;
  });
}

// Insert inventory
if (data.inventory?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Inventory (${data.inventory.length})\n`;
  sql += `-- =====================================================\n`;
  data.inventory.forEach(inv => {
    sql += `INSERT INTO inventory (id, "productId", "branchId", quantity, "minQuantity", "lastRestockDate", "createdAt", "updatedAt")
VALUES (${escapeSql(inv.id)}, ${escapeSql(inv.productId)}, ${escapeSql(inv.branchId)}, ${escapeSql(inv.quantity)}, ${escapeSql(inv.minQuantity)}, ${escapeSql(inv.lastRestockDate)}, ${escapeSql(inv.createdAt)}, ${escapeSql(inv.updatedAt)});\n`;
  });
}

// Insert fabric types
if (data.fabricTypes?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Fabric Types (${data.fabricTypes.length})\n`;
  sql += `-- =====================================================\n`;
  data.fabricTypes.forEach(ft => {
    sql += `INSERT INTO fabric_types (id, name, "pricePerMeter", description, "isActive", "createdAt", "updatedAt")
VALUES (${escapeSql(ft.id)}, ${escapeSql(ft.name)}, ${escapeSql(ft.pricePerMeter)}, ${escapeSql(ft.description)}, ${escapeSql(ft.isActive)}, ${escapeSql(ft.createdAt)}, ${escapeSql(ft.updatedAt)});\n`;
  });
}

// Insert fabric purchases
if (data.fabricPurchases?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Fabric Purchases (${data.fabricPurchases.length})\n`;
  sql += `-- =====================================================\n`;
  data.fabricPurchases.forEach(fp => {
    sql += `INSERT INTO fabric_purchases (id, "invoiceNumber", "supplierId", "fabricTypeId", meters, "pricePerMeter", "totalCost", "paidAmount", "remainingAmount", "paymentStatus", "purchaseDate", notes, "createdBy", "createdAt", "updatedAt")
VALUES (${escapeSql(fp.id)}, ${escapeSql(fp.invoiceNumber)}, ${escapeSql(fp.supplierId)}, ${escapeSql(fp.fabricTypeId)}, ${escapeSql(fp.meters)}, ${escapeSql(fp.pricePerMeter)}, ${escapeSql(fp.totalCost)}, ${escapeSql(fp.paidAmount)}, ${escapeSql(fp.remainingAmount)}, ${escapeSql(fp.paymentStatus)}, ${escapeSql(fp.purchaseDate)}, ${escapeSql(fp.notes)}, ${escapeSql(fp.createdBy)}, ${escapeSql(fp.createdAt)}, ${escapeSql(fp.updatedAt)});\n`;
  });
}

// Insert fabric stock
if (data.fabricStock?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Fabric Stock (${data.fabricStock.length})\n`;
  sql += `-- =====================================================\n`;
  data.fabricStock.forEach(fs => {
    sql += `INSERT INTO fabric_stock (id, "fabricTypeId", "availableMeters", "reservedMeters", "totalPurchased", "totalUsed", "lastUpdated", "createdAt")
VALUES (${escapeSql(fs.id)}, ${escapeSql(fs.fabricTypeId)}, ${escapeSql(fs.availableMeters)}, ${escapeSql(fs.reservedMeters)}, ${escapeSql(fs.totalPurchased)}, ${escapeSql(fs.totalUsed)}, ${escapeSql(fs.lastUpdated)}, ${escapeSql(fs.createdAt)});\n`;
  });
}

// Insert manufacturing orders
if (data.manufacturingOrders?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Manufacturing Orders (${data.manufacturingOrders.length})\n`;
  sql += `-- =====================================================\n`;
  data.manufacturingOrders.forEach(mo => {
    sql += `INSERT INTO manufacturing_orders (id, "orderNumber", "supplierId", "fabricTypeId", "productId", "metersUsed", "fabricCostPerMeter", status, "sentDate", "sentBy", "piecesReceived", "manufacturingCostPerPiece", "totalManufacturingCost", "paidAmount", "remainingAmount", "paymentStatus", "receivedDate", "receivedBy", notes, "createdAt", "updatedAt")
VALUES (${escapeSql(mo.id)}, ${escapeSql(mo.orderNumber)}, ${escapeSql(mo.supplierId)}, ${escapeSql(mo.fabricTypeId)}, ${escapeSql(mo.productId)}, ${escapeSql(mo.metersUsed)}, ${escapeSql(mo.fabricCostPerMeter)}, ${escapeSql(mo.status)}, ${escapeSql(mo.sentDate)}, ${escapeSql(mo.sentBy)}, ${escapeSql(mo.piecesReceived)}, ${escapeSql(mo.manufacturingCostPerPiece)}, ${escapeSql(mo.totalManufacturingCost)}, ${escapeSql(mo.paidAmount)}, ${escapeSql(mo.remainingAmount)}, ${escapeSql(mo.paymentStatus)}, ${escapeSql(mo.receivedDate)}, ${escapeSql(mo.receivedBy)}, ${escapeSql(mo.notes)}, ${escapeSql(mo.createdAt)}, ${escapeSql(mo.updatedAt)});\n`;
  });
}

// Insert washing orders
if (data.washingOrders?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Washing Orders (${data.washingOrders.length})\n`;
  sql += `-- =====================================================\n`;
  data.washingOrders.forEach(wo => {
    sql += `INSERT INTO washing_orders (id, "orderNumber", "supplierId", "manufacturingOrderId", "piecesSent", status, "sentDate", "sentBy", "piecesReceived", "washingCostPerPiece", "totalWashingCost", "paidAmount", "remainingAmount", "paymentStatus", "receivedDate", "receivedBy", "productId", notes, "createdAt", "updatedAt")
VALUES (${escapeSql(wo.id)}, ${escapeSql(wo.orderNumber)}, ${escapeSql(wo.supplierId)}, ${escapeSql(wo.manufacturingOrderId)}, ${escapeSql(wo.piecesSent)}, ${escapeSql(wo.status)}, ${escapeSql(wo.sentDate)}, ${escapeSql(wo.sentBy)}, ${escapeSql(wo.piecesReceived)}, ${escapeSql(wo.washingCostPerPiece)}, ${escapeSql(wo.totalWashingCost)}, ${escapeSql(wo.paidAmount)}, ${escapeSql(wo.remainingAmount)}, ${escapeSql(wo.paymentStatus)}, ${escapeSql(wo.receivedDate)}, ${escapeSql(wo.receivedBy)}, ${escapeSql(wo.productId)}, ${escapeSql(wo.notes)}, ${escapeSql(wo.createdAt)}, ${escapeSql(wo.updatedAt)});\n`;
  });
}

// Insert shifts
if (data.shifts?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Shifts (${data.shifts.length})\n`;
  sql += `-- =====================================================\n`;
  data.shifts.forEach(shift => {
    sql += `INSERT INTO shifts (id, "shiftNumber", "userId", "branchId", status, "openingBalance", "closingBalance", "expectedCash", "actualCash", "cashDifference", "totalSales", "totalTransactions", "openedAt", "closedAt", notes)
VALUES (${escapeSql(shift.id)}, ${escapeSql(shift.shiftNumber)}, ${escapeSql(shift.userId)}, ${escapeSql(shift.branchId)}, ${escapeSql(shift.status)}, ${escapeSql(shift.openingBalance)}, ${escapeSql(shift.closingBalance)}, ${escapeSql(shift.expectedCash)}, ${escapeSql(shift.actualCash)}, ${escapeSql(shift.cashDifference)}, ${escapeSql(shift.totalSales)}, ${escapeSql(shift.totalTransactions)}, ${escapeSql(shift.openedAt)}, ${escapeSql(shift.closedAt)}, ${escapeSql(shift.notes)});\n`;
  });
}

// Insert sales and sale items
if (data.sales?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Sales (${data.sales.length})\n`;
  sql += `-- =====================================================\n`;
  data.sales.forEach(sale => {
    sql += `INSERT INTO sales (id, "invoiceNumber", "branchId", "shiftId", "cashierId", "customerId", "customerName", "customerPhone", subtotal, "taxAmount", "discountAmount", total, "paymentMethod", "amountPaid", "changeAmount", "cardConfirmed", "cardAmount", "cardDestinationBranch", status, "isReturn", "originalSaleId", "returnReason", "refundAmount", notes, "syncedAt", "createdAt", "updatedAt")
VALUES (${escapeSql(sale.id)}, ${escapeSql(sale.invoiceNumber)}, ${escapeSql(sale.branchId)}, ${escapeSql(sale.shiftId)}, ${escapeSql(sale.cashierId)}, ${escapeSql(sale.customerId)}, ${escapeSql(sale.customerName)}, ${escapeSql(sale.customerPhone)}, ${escapeSql(sale.subtotal)}, ${escapeSql(sale.taxAmount)}, ${escapeSql(sale.discountAmount)}, ${escapeSql(sale.total)}, ${escapeSql(sale.paymentMethod)}, ${escapeSql(sale.amountPaid)}, ${escapeSql(sale.changeAmount)}, ${escapeSql(sale.cardConfirmed)}, ${escapeSql(sale.cardAmount)}, ${escapeSql(sale.cardDestinationBranch)}, ${escapeSql(sale.status)}, ${escapeSql(sale.isReturn)}, ${escapeSql(sale.originalSaleId)}, ${escapeSql(sale.returnReason)}, ${escapeSql(sale.refundAmount)}, ${escapeSql(sale.notes)}, ${escapeSql(sale.syncedAt)}, ${escapeSql(sale.createdAt)}, ${escapeSql(sale.updatedAt)});\n`;
    
    // Insert sale items
    if (sale.items?.length > 0) {
      sale.items.forEach(item => {
        sql += `INSERT INTO sale_items (id, "saleId", "productId", "serialNumber", size, color, quantity, "unitPrice", discount, "taxRate", total, status, "isReturned")
VALUES (${escapeSql(item.id)}, ${escapeSql(sale.id)}, ${escapeSql(item.productId)}, ${escapeSql(item.serialNumber)}, ${escapeSql(item.size)}, ${escapeSql(item.color)}, ${escapeSql(item.quantity)}, ${escapeSql(item.unitPrice)}, ${escapeSql(item.discount)}, ${escapeSql(item.taxRate)}, ${escapeSql(item.total)}, ${escapeSql(item.status)}, ${escapeSql(item.isReturned)});\n`;
      });
    }
  });
}

// Insert transfers and transfer items
if (data.transfers?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Transfers (${data.transfers.length})\n`;
  sql += `-- =====================================================\n`;
  data.transfers.forEach(transfer => {
    sql += `INSERT INTO transfers (id, "transferNumber", "fromBranchId", "toBranchId", status, notes, "sentBy", "sentAt", "receivedBy", "receivedAt", "receiverNotes", "hasDiscrepancy", "discrepancyType", "discrepancyNotes", "createdAt", "updatedAt")
VALUES (${escapeSql(transfer.id)}, ${escapeSql(transfer.transferNumber)}, ${escapeSql(transfer.fromBranchId)}, ${escapeSql(transfer.toBranchId)}, ${escapeSql(transfer.status)}, ${escapeSql(transfer.notes)}, ${escapeSql(transfer.sentBy)}, ${escapeSql(transfer.sentAt)}, ${escapeSql(transfer.receivedBy)}, ${escapeSql(transfer.receivedAt)}, ${escapeSql(transfer.receiverNotes)}, ${escapeSql(transfer.hasDiscrepancy)}, ${escapeSql(transfer.discrepancyType)}, ${escapeSql(transfer.discrepancyNotes)}, ${escapeSql(transfer.createdAt)}, ${escapeSql(transfer.updatedAt)});\n`;
    
    // Insert transfer items
    if (transfer.items?.length > 0) {
      transfer.items.forEach(item => {
        sql += `INSERT INTO transfer_items (id, "transferId", "productId", "quantityRequested", "quantityReceived", status, notes, "createdAt", "updatedAt")
VALUES (${escapeSql(item.id)}, ${escapeSql(transfer.id)}, ${escapeSql(item.productId)}, ${escapeSql(item.quantityRequested)}, ${escapeSql(item.quantityReceived)}, ${escapeSql(item.status)}, ${escapeSql(item.notes)}, ${escapeSql(item.createdAt)}, ${escapeSql(item.updatedAt)});\n`;
      });
    }
  });
}

// Insert vault transactions
if (data.vaultTransactions?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Vault Transactions (${data.vaultTransactions.length})\n`;
  sql += `-- =====================================================\n`;
  data.vaultTransactions.forEach(vt => {
    sql += `INSERT INTO vault_transactions (id, "branchId", type, amount, "saleId", "invoiceNumber", "shiftId", "moneyTransferId", description, notes, "createdBy", "createdAt", "balanceBefore", "balanceAfter")
VALUES (${escapeSql(vt.id)}, ${escapeSql(vt.branchId)}, ${escapeSql(vt.type)}, ${escapeSql(vt.amount)}, ${escapeSql(vt.saleId)}, ${escapeSql(vt.invoiceNumber)}, ${escapeSql(vt.shiftId)}, ${escapeSql(vt.moneyTransferId)}, ${escapeSql(vt.description)}, ${escapeSql(vt.notes)}, ${escapeSql(vt.createdBy)}, ${escapeSql(vt.createdAt)}, ${escapeSql(vt.balanceBefore)}, ${escapeSql(vt.balanceAfter)});\n`;
  });
}

// Insert product serials (large dataset, may take time)
if (data.productSerials?.length > 0) {
  sql += `\n-- =====================================================\n`;
  sql += `-- Insert Product Serials (${data.productSerials.length})\n`;
  sql += `-- NOTE: This may take a while for large datasets\n`;
  sql += `-- =====================================================\n`;
  data.productSerials.forEach(ps => {
    sql += `INSERT INTO product_serials (id, "productId", "serialNumber", "branchId", "registeredBy", "registeredAt", status, "soldAt", "soldInSaleId", "purchaseId", "transferId", notes, "createdAt", "updatedAt")
VALUES (${escapeSql(ps.id)}, ${escapeSql(ps.productId)}, ${escapeSql(ps.serialNumber)}, ${escapeSql(ps.branchId)}, ${escapeSql(ps.registeredBy)}, ${escapeSql(ps.registeredAt)}, ${escapeSql(ps.status)}, ${escapeSql(ps.soldAt)}, ${escapeSql(ps.soldInSaleId)}, ${escapeSql(ps.purchaseId)}, ${escapeSql(ps.transferId)}, ${escapeSql(ps.notes)}, ${escapeSql(ps.createdAt)}, ${escapeSql(ps.updatedAt)});\n`;
  });
}

sql += `\n-- =====================================================\n`;
sql += `-- Restore Complete!\n`;
sql += `-- =====================================================\n`;

// Write to file
const outputFile = backupFile.replace('.json', '.sql');
fs.writeFileSync(outputFile, sql);

console.log('✅ تم إنشاء ملف SQL بنجاح!');
console.log(`📝 الملف: ${outputFile}`);
console.log(`📊 الحجم: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB`);
console.log();
console.log('🚀 الخطوات التالية:');
console.log('1. افتح pgAdmin');
console.log('2. اتصل بـ Railway Database');
console.log('3. افتح Query Tool');
console.log(`4. افتح الملف: ${outputFile}`);
console.log('5. شغّل الـ SQL');
