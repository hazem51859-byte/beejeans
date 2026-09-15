/**
 * Generate SQL INSERT statements from local database
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

function escapeValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  // String - escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateInsert(tableName, records) {
  if (records.length === 0) return '';
  
  const columns = Object.keys(records[0]);
  let sql = '';
  
  for (const record of records) {
    const values = columns.map(col => escapeValue(record[col])).join(', ');
    sql += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values}) ON CONFLICT (id) DO NOTHING;\n`;
  }
  
  return sql;
}

async function dump() {
  console.log('📦 Dumping database to SQL...\n');
  
  let sql = `-- Bee Jeans POS Database Dump\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;
  sql += `-- Disable triggers temporarily\n`;
  sql += `SET session_replication_role = 'replica';\n\n`;
  
  try {
    // Define table order (respecting foreign keys)
    const tables = [
      { name: 'users', model: 'user' },
      { name: 'branches', model: 'branch' },
      { name: 'categories', model: 'category' },
      { name: 'products', model: 'product' },
      { name: 'customers', model: 'customer' },
      { name: 'suppliers', model: 'supplier' },
      { name: 'partners', model: 'partner' },
      { name: 'fabric_types', model: 'fabricType' },
      { name: 'office_invoices', model: 'officeInvoice' },
      { name: 'supplier_payments', model: 'supplierPayment' },
      { name: 'inventory', model: 'inventory' },
      { name: 'fabric_stock', model: 'fabricStock' },
    ];
    
    for (const table of tables) {
      console.log(`📝 Dumping ${table.name}...`);
      const records = await prisma[table.model].findMany();
      
      if (records.length > 0) {
        sql += `\n-- ${table.name} (${records.length} records)\n`;
        sql += generateInsert(table.name, records);
        console.log(`   ✅ ${records.length} records`);
      } else {
        console.log(`   ⏭️  Empty`);
      }
    }
    
    sql += `\n-- Re-enable triggers\n`;
    sql += `SET session_replication_role = 'origin';\n`;
    
    // Write to file
    const filename = 'railway-import.sql';
    fs.writeFileSync(filename, sql);
    console.log(`\n✅ SQL dump saved to: ${filename}\n`);
    
    return filename;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

dump();
