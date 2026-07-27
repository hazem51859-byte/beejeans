const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function restoreComplete() {
  console.log('🔄 Starting complete database restore...\n');

  try {
    // Read backup file
    const backupPath = path.join(__dirname, '..', 'backup', 'restore.sql');
    console.log('📂 Reading backup from:', backupPath);
    
    const sqlContent = fs.readFileSync(backupPath, 'utf8');
    
    // Delete existing data (keep office_invoices and shipments tables)
    console.log('\n🗑️  Deleting existing data...\n');
    
    await prisma.$executeRaw`DELETE FROM "return_items"`;
    await prisma.$executeRaw`DELETE FROM "returns"`;
    await prisma.$executeRaw`DELETE FROM "sale_items"`;
    await prisma.$executeRaw`DELETE FROM "sales"`;
    await prisma.$executeRaw`DELETE FROM "product_serials"`;
    await prisma.$executeRaw`DELETE FROM "transfer_items"`;
    await prisma.$executeRaw`DELETE FROM "transfers"`;
    await prisma.$executeRaw`DELETE FROM "washing_orders"`;
    await prisma.$executeRaw`DELETE FROM "manufacturing_orders"`;
    await prisma.$executeRaw`DELETE FROM "fabric_purchases"`;
    await prisma.$executeRaw`DELETE FROM "fabric_stock"`;
    await prisma.$executeRaw`DELETE FROM "purchase_items"`;
    await prisma.$executeRaw`DELETE FROM "purchases"`;
    await prisma.$executeRaw`DELETE FROM "supplier_payments"`;
    await prisma.$executeRaw`DELETE FROM "customer_payments"`;
    await prisma.$executeRaw`DELETE FROM "vault_transactions"`;
    await prisma.$executeRaw`DELETE FROM "money_transfers"`;
    await prisma.$executeRaw`DELETE FROM "expenses"`;
    await prisma.$executeRaw`DELETE FROM "shifts"`;
    await prisma.$executeRaw`DELETE FROM "inventory"`;
    await prisma.$executeRaw`DELETE FROM "products"`;
    await prisma.$executeRaw`DELETE FROM "customers"`;
    await prisma.$executeRaw`DELETE FROM "fabric_types"`;
    await prisma.$executeRaw`DELETE FROM "suppliers"`;
    await prisma.$executeRaw`DELETE FROM "activity_logs"`;
    await prisma.$executeRaw`DELETE FROM "users"`;
    await prisma.$executeRaw`DELETE FROM "branches"`;
    
    console.log('✅ Existing data deleted\n');
    
    // Parse and execute COPY statements
    console.log('📥 Restoring data from backup...\n');
    
    const lines = sqlContent.split('\n');
    let currentTable = null;
    let currentColumns = null;
    let dataLines = [];
    let restored = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('COPY public.')) {
        // Extract table and columns
        const match = line.match(/COPY public\.(\w+) \(([^)]+)\) FROM stdin;/);
        if (match) {
          currentTable = match[1];
          currentColumns = match[2].replace(/"/g, ''); // Remove quotes
          dataLines = [];
        }
      } else if (line === '\\.') {
        // End of data for current table
        if (currentTable && dataLines.length > 0) {
          // Insert data
          try {
            for (const dataLine of dataLines) {
              const values = dataLine.split('\t');
              const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
              const processedValues = values.map(v => v === '\\N' ? null : v);
              
              const columnList = currentColumns.split(', ').map(c => `"${c}"`).join(', ');
              const query = `INSERT INTO "${currentTable}" (${columnList}) VALUES (${placeholders})`;
              
              await prisma.$executeRawUnsafe(query, ...processedValues);
            }
            console.log(`  ✓ ${currentTable}: ${dataLines.length} rows`);
            restored++;
          } catch (err) {
            console.log(`  ✗ ${currentTable}: ${err.message.substring(0, 100)}`);
          }
        }
        currentTable = null;
        currentColumns = null;
        dataLines = [];
      } else if (currentTable && line) {
        dataLines.push(line);
      }
    }
    
    console.log(`\n✅ Restored data from ${restored} tables\n`);
    
    // Verify restoration
    const counts = {
      branches: await prisma.branch.count(),
      users: await prisma.user.count(),
      products: await prisma.product.count(),
      suppliers: await prisma.supplier.count(),
      fabricTypes: await prisma.fabricType.count(),
      customers: await prisma.customer.count(),
      sales: await prisma.sale.count(),
      inventory: await prisma.inventory.count(),
      transfers: await prisma.transfer.count(),
      manufacturingOrders: await prisma.manufacturingOrder.count()
    };
    
    console.log('📊 Verification Counts:');
    console.log('  Branches:', counts.branches);
    console.log('  Users:', counts.users);
    console.log('  Products:', counts.products);
    console.log('  Suppliers:', counts.suppliers);
    console.log('  Fabric Types:', counts.fabricTypes);
    console.log('  Customers:', counts.customers);
    console.log('  Sales:', counts.sales);
    console.log('  Inventory:', counts.inventory);
    console.log('  Transfers:', counts.transfers);
    console.log('  Manufacturing Orders:', counts.manufacturingOrders);
    
  } catch (error) {
    console.error('\n❌ Error during restore:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreComplete().catch(console.error);
