const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('Running wallet balance migration...');
    
    const sql = fs.readFileSync('./add-wallet-balance.sql', 'utf8');
    
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify
    const branches = await prisma.branch.findMany();
    console.log(`\n📊 Found ${branches.length} branches:`);
    branches.forEach(b => {
      console.log(`  ${b.name}: نقدي=${b.vaultBalance}, فيزا=${b.cardVaultBalance}, محفظة=${b.walletBalance || 0}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
