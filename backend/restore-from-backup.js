const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreFromBackup(backupFilePath) {
  try {
    console.log('🔄 Starting database restoration...\n');

    // Check if file exists
    if (!fs.existsSync(backupFilePath)) {
      console.error('❌ Backup file not found:', backupFilePath);
      console.log('\n📂 Available backup files:');
      const backupDir = path.join(__dirname, 'backup');
      const files = fs.readdirSync(backupDir);
      files.forEach(file => console.log(`   - ${file}`));
      process.exit(1);
    }

    console.log('📂 Using backup file:', backupFilePath);

    // Get database connection details from .env
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL not found in .env');
      process.exit(1);
    }

    // Parse database URL
    // Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
    const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
      console.error('❌ Invalid DATABASE_URL format');
      process.exit(1);
    }

    const [, user, password, host, port, database] = match;

    console.log('\n📊 Database connection:');
    console.log(`   Host: ${host}`);
    console.log(`   Port: ${port}`);
    console.log(`   Database: ${database}`);
    console.log(`   User: ${user}`);

    // Set PGPASSWORD environment variable
    process.env.PGPASSWORD = password;

    console.log('\n🗑️  Dropping and recreating tables...');
    
    // Execute the SQL file using psql
    const command = `psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${backupFilePath}"`;
    
    console.log('\n⚙️  Executing SQL restore...');
    execSync(command, { 
      stdio: 'inherit',
      env: process.env
    });

    console.log('\n✅ SQL executed successfully!');

    // Verify restoration
    console.log('\n🔍 Verifying data...');
    const branches = await prisma.branch.count();
    const users = await prisma.user.count();
    const products = await prisma.product.count();
    const sales = await prisma.sale.count();

    console.log('\n📊 Database Status:');
    console.log('==================');
    console.log(`   Branches: ${branches}`);
    console.log(`   Users: ${users}`);
    console.log(`   Products: ${products}`);
    console.log(`   Sales: ${sales}`);
    console.log('==================\n');

    if (branches > 0 && users > 0) {
      console.log('🎉 Database restored successfully!');
      
      // Show sample data
      const sampleBranches = await prisma.branch.findMany({ take: 3 });
      console.log('\n📍 Sample Branches:');
      sampleBranches.forEach(b => console.log(`   - ${b.name} (${b.code})`));
    } else {
      console.log('⚠️  Restoration completed but data verification failed.');
      console.log('   Please check the backup file and try again.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error restoring database:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];

if (!backupFile) {
  console.log('Usage: node restore-from-backup.js <backup-file-path>');
  console.log('\nExample:');
  console.log('  node restore-from-backup.js backup/restore.sql');
  console.log('  node restore-from-backup.js backup/database-backup-2026-07-23T17-44-59.sql');
  
  console.log('\n📂 Available backup files:');
  const backupDir = path.join(__dirname, 'backup');
  try {
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'));
    files.forEach(file => console.log(`   - backup/${file}`));
  } catch (err) {
    console.log('   (no backup directory found)');
  }
  
  process.exit(1);
}

const backupFilePath = path.isAbsolute(backupFile) 
  ? backupFile 
  : path.join(__dirname, backupFile);

restoreFromBackup(backupFilePath);
