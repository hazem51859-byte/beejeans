const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreDatabase() {
  try {
    console.log('🔄 Restoring database from backup...\n');

    // Read the SQL backup
    const sqlFile = path.join(__dirname, 'backup', 'database-backup-2026-07-23T17-44-59.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

    console.log('📂 Reading backup file...');
    console.log('📝 Executing SQL statements...\n');

    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let executed = 0;
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        executed++;
      } catch (error) {
        // Ignore errors for statements that might not work (like DROP, CREATE, etc.)
        if (!error.message.includes('already exists') && 
            !error.message.includes('does not exist') &&
            !error.message.includes('syntax error')) {
          console.error('Error executing:', statement.substring(0, 50) + '...');
          console.error(error.message);
        }
      }
    }

    console.log(`✅ Executed ${executed} SQL statements`);

    // Verify restoration
    const branches = await prisma.branch.count();
    const users = await prisma.user.count();
    const products = await prisma.product.count();

    console.log('\n📊 Verification:');
    console.log(`   Branches: ${branches}`);
    console.log(`   Users: ${users}`);
    console.log(`   Products: ${products}`);

    if (branches > 0) {
      console.log('\n🎉 Database restored successfully!');
    } else {
      console.log('\n⚠️  Restoration might have failed. Try manual restore.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error restoring database:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

restoreDatabase();
