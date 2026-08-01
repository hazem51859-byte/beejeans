const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testVaultConversions() {
  try {
    console.log('🧪 Testing vault conversion features...\n');
    
    // Get main branch
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });
    
    if (!mainBranch) {
      console.log('❌ Main branch not found');
      return;
    }
    
    console.log(`📊 المخزن الرئيسي - الأرصدة الحالية:`);
    console.log(`   نقدي: ${mainBranch.vaultBalance}`);
    console.log(`   فيزا: ${mainBranch.cardVaultBalance}`);
    console.log(`   محفظة: ${mainBranch.walletBalance}`);
    
    // Test 1: Add some balance to card vault
    console.log('\n1️⃣ Adding 500 to CARD vault...');
    await prisma.branch.update({
      where: { id: mainBranch.id },
      data: { cardVaultBalance: { increment: 500 } }
    });
    
    // Test 2: Convert CARD to WALLET
    console.log('2️⃣ Converting 200 from CARD to WALLET...');
    const updated1 = await prisma.branch.findUnique({
      where: { id: mainBranch.id }
    });
    
    await prisma.branch.update({
      where: { id: mainBranch.id },
      data: {
        cardVaultBalance: updated1.cardVaultBalance - 200,
        walletBalance: updated1.walletBalance + 200
      }
    });
    
    // Verify
    const result = await prisma.branch.findUnique({
      where: { id: mainBranch.id }
    });
    
    console.log('\n✅ النتيجة النهائية:');
    console.log(`   نقدي: ${result.vaultBalance}`);
    console.log(`   فيزا: ${result.cardVaultBalance} (كان ${mainBranch.cardVaultBalance})`);
    console.log(`   محفظة: ${result.walletBalance} (كان ${mainBranch.walletBalance})`);
    
    // Rollback
    console.log('\n🔄 Restoring original balances...');
    await prisma.branch.update({
      where: { id: mainBranch.id },
      data: {
        vaultBalance: mainBranch.vaultBalance,
        cardVaultBalance: mainBranch.cardVaultBalance,
        walletBalance: mainBranch.walletBalance
      }
    });
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testVaultConversions();
