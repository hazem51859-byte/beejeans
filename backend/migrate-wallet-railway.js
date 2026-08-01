// Migration script to add walletBalance to Railway database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function migrate() {
  try {
    console.log('🔧 Starting wallet balance migration on Railway...');
    
    // Check if column exists
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'branches' 
      AND column_name = 'walletBalance';
    `);
    
    if (result.length > 0) {
      console.log('✅ walletBalance column already exists!');
      
      // Show current data
      const branches = await prisma.branch.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          walletBalance: true
        }
      });
      
      console.log('\n📊 Current wallet balances:');
      branches.forEach(b => {
        console.log(`  ${b.code} (${b.name}): ${b.walletBalance} ج.م`);
      });
      
      return;
    }
    
    console.log('➕ Adding walletBalance column...');
    
    // Add the column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE branches 
      ADD COLUMN IF NOT EXISTS "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
    `);
    
    console.log('✅ walletBalance column added successfully!');
    
    // Verify
    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        vaultBalance: true,
        cardVaultBalance: true,
        walletBalance: true
      }
    });
    
    console.log('\n✅ Migration completed! All branches:');
    branches.forEach(b => {
      console.log(`\n  ${b.code} - ${b.name}:`);
      console.log(`    💵 Cash: ${b.vaultBalance} ج.م`);
      console.log(`    💳 Card: ${b.cardVaultBalance} ج.م`);
      console.log(`    📱 Wallet: ${b.walletBalance} ج.م`);
    });
    
    console.log('\n🎉 Wallet feature is now ready on Railway!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate()
  .catch(console.error)
  .finally(() => process.exit());
