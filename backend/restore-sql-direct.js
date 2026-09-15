const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreFromSQL(sqlFile) {
  try {
    console.log('🔄 Restoring database from SQL file...\n');

    const fullPath = path.isAbsolute(sqlFile) ? sqlFile : path.join(__dirname, sqlFile);
    
    if (!fs.existsSync(fullPath)) {
      console.error('❌ File not found:', fullPath);
      process.exit(1);
    }

    console.log('📂 Reading SQL file:', fullPath);
    const sqlContent = fs.readFileSync(fullPath, 'utf-8');

    console.log('📝 Parsing SQL statements...');
    
    // Split into statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        // Skip empty lines and comments
        if (!s) return false;
        if (s.startsWith('--')) return false;
        if (s.startsWith('/*')) return false;
        return true;
      });

    console.log(`\n⚙️  Found ${statements.length} SQL statements`);
    console.log('🔄 Executing...\n');

    let executed = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Show progress every 100 statements
      if (i % 100 === 0 && i > 0) {
        console.log(`   Progress: ${i}/${statements.length} (${executed} executed, ${skipped} skipped, ${errors} errors)`);
      }

      try {
        await prisma.$executeRawUnsafe(statement + ';');
        executed++;
      } catch (error) {
        // Skip certain expected errors
        const msg = error.message.toLowerCase();
        if (msg.includes('already exists') || 
            msg.includes('does not exist') ||
            msg.includes('constraint') ||
            msg.includes('duplicate')) {
          skipped++;
        } else {
          errors++;
          if (errors < 5) { // Only show first 5 errors
            console.error(`\n⚠️  Error in statement ${i}:`, statement.substring(0, 50) + '...');
            console.error('   ', error.message.substring(0, 100));
          }
        }
      }
    }

    console.log(`\n✅ Execution complete!`);
    console.log(`   Executed: ${executed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}\n`);

    // Verify data
    console.log('🔍 Verifying restoration...');
    const branches = await prisma.branch.count();
    const users = await prisma.user.count();
    const products = await prisma.product.count();
    const sales = await prisma.sale.count();
    const transfers = await prisma.transfer.count();

    console.log('\n📊 Database Status:');
    console.log('==================');
    console.log(`   Branches: ${branches}`);
    console.log(`   Users: ${users}`);
    console.log(`   Products: ${products}`);
    console.log(`   Sales: ${sales}`);
    console.log(`   Transfers: ${transfers}`);
    console.log('==================\n');

    if (branches > 0 && users > 0) {
      console.log('🎉 Database restored successfully!');
      
      const sampleBranches = await prisma.branch.findMany({ take: 3 });
      console.log('\n📍 Sample Branches:');
      sampleBranches.forEach(b => console.log(`   - ${b.name} (${b.code})`));
      
      const sampleUsers = await prisma.user.findMany({ take: 3 });
      console.log('\n👤 Sample Users:');
      sampleUsers.forEach(u => console.log(`   - ${u.fullName} (${u.username})`));
    } else {
      console.log('⚠️  Data verification failed. Please check the backup file.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

const sqlFile = process.argv[2] || '../backup/restore.sql';
restoreFromSQL(sqlFile);
