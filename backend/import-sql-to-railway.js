/**
 * Import SQL file to Railway database
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const railwayDbUrl = process.env.RAILWAY_DATABASE_URL;

if (!railwayDbUrl) {
  console.error('❌ Error: RAILWAY_DATABASE_URL not set!');
  console.log('Run: RAILWAY_DATABASE_URL="your-url" node import-sql-to-railway.js');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: railwayDbUrl } }
});

async function importSql() {
  console.log('🚂 Importing SQL to Railway...\n');
  
  try {
    // Read SQL file
    const sqlFile = 'railway-import.sql';
    console.log(`📖 Reading ${sqlFile}...`);
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    
    // Split into individual statements
    const statements = sql
      .split('\n')
      .filter(line => !line.startsWith('--') && line.trim().length > 0);
    
    console.log(`⬆️  Executing ${statements.length} SQL statements...`);
    
    let success = 0;
    let failed = 0;
    
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        success++;
        if (success % 10 === 0) {
          process.stdout.write(`   ✓ ${success}/${statements.length}\r`);
        }
      } catch (error) {
        failed++;
        if (error.code !== 'P2002') { // Ignore duplicate key errors
          console.error(`   ⚠️  Failed: ${statement.substring(0, 50)}...`);
        }
      }
    }
    
    console.log(`\n   ✅ ${success} statements executed, ${failed} skipped\n`);
    
    // Verify
    console.log('🔍 Verifying data...');
    const users = await prisma.user.count();
    const branches = await prisma.branch.count();
    const products = await prisma.product.count();
    const customers = await prisma.customer.count();
    const suppliers = await prisma.supplier.count();
    
    console.log(`   Users: ${users}`);
    console.log(`   Branches: ${branches}`);
    console.log(`   Products: ${products}`);
    console.log(`   Customers: ${customers}`);
    console.log(`   Suppliers: ${suppliers}`);
    
    console.log('\n🎉 Migration completed!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importSql();
