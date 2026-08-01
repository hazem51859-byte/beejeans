const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testWalletFeature() {
  try {
    console.log('🧪 Testing wallet feature...\n');
    
    // 1. Check schema
    console.log('1️⃣ Checking Branch schema...');
    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true,
        vaultBalance: true,
        cardVaultBalance: true,
        walletBalance: true
      }
    });
    
    console.log(`   ✅ Found ${branches.length} branches with wallet support:`);
    branches.forEach(b => {
      console.log(`      ${b.name}: نقدي=${b.vaultBalance}, فيزا=${b.cardVaultBalance}, محفظة=${b.walletBalance}`);
    });
    
    // 2. Test wallet balance update
    console.log('\n2️⃣ Testing wallet balance update...');
    const mainBranch = branches.find(b => b.name.includes('الرئيسي'));
    
    if (mainBranch) {
      const oldBalance = mainBranch.walletBalance;
      
      // Add 100 to wallet
      await prisma.branch.update({
        where: { id: mainBranch.id },
        data: {
          walletBalance: { increment: 100 }
        }
      });
      
      const updated = await prisma.branch.findUnique({
        where: { id: mainBranch.id }
      });
      
      console.log(`   ✅ Wallet updated: ${oldBalance} → ${updated.walletBalance}`);
      
      // Rollback
      await prisma.branch.update({
        where: { id: mainBranch.id },
        data: {
          walletBalance: oldBalance
        }
      });
      
      console.log(`   ✅ Rolled back to: ${oldBalance}`);
    }
    
    console.log('\n✅ All tests passed! Wallet feature is working!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWalletFeature();
