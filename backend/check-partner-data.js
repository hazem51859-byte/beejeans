const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPartnerData() {
  try {
    console.log('🔍 Checking Partner Data...\n');

    // 1. Get all partners
    const partners = await prisma.partner.findMany({
      include: {
        transactions: true
      }
    });

    console.log(`📊 Total Partners: ${partners.length}\n`);

    // 2. Check each partner's transactions
    for (const partner of partners) {
      console.log(`\n👤 Partner: ${partner.name}`);
      console.log(`   Share %: ${partner.sharePercentage}%`);
      console.log(`   Capital: ${partner.capitalPaid} ج.م`);
      console.log(`   Total Transactions: ${partner.transactions.length}`);
      
      // Filter withdrawal transactions
      const withdrawals = partner.transactions.filter(t => 
        t.type === 'WITHDRAWAL' || t.type === 'PROFIT_DISTRIBUTION'
      );
      
      console.log(`   Withdrawal Transactions: ${withdrawals.length}`);
      
      if (withdrawals.length > 0) {
        console.log(`   \n   Withdrawal Details:`);
        withdrawals.forEach((t, idx) => {
          console.log(`   ${idx + 1}. Type: ${t.type}, Amount: ${t.amount} ج.م, Date: ${t.transactionDate.toISOString()}`);
          console.log(`      Description: ${t.description || 'N/A'}`);
          console.log(`      Notes: ${t.notes || 'N/A'}`);
        });
        
        const totalWithdrawn = withdrawals.reduce((sum, t) => sum + t.amount, 0);
        console.log(`   \n   💰 Total Withdrawn: ${totalWithdrawn.toFixed(2)} ج.م`);
      }
    }

    // 3. Check VaultTransactions related to profit withdrawals
    console.log('\n\n💵 Checking Vault Transactions for Profit Withdrawals...\n');
    
    const vaultTransactions = await prisma.vaultTransaction.findMany({
      where: {
        type: 'CASH_WITHDRAWAL',
        description: {
          contains: 'سحب أرباح'
        }
      },
      include: {
        vault: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📋 Total Vault Profit Withdrawal Transactions: ${vaultTransactions.length}\n`);
    
    vaultTransactions.forEach((vt, idx) => {
      console.log(`${idx + 1}. Vault: ${vt.vault?.name || 'N/A'}`);
      console.log(`   Amount: ${vt.amount} ج.م`);
      console.log(`   Date: ${vt.createdAt.toISOString()}`);
      console.log(`   Description: ${vt.description}`);
      console.log(`   Balance Before: ${vt.balanceBefore} ج.م`);
      console.log(`   Balance After: ${vt.balanceAfter} ج.م`);
      console.log('');
    });

    // 4. Check Vaults current balances
    console.log('\n💰 Current Vault Balances:\n');
    
    const vaults = await prisma.vault.findMany({
      where: { isActive: true }
    });

    vaults.forEach(vault => {
      console.log(`${vault.name} (${vault.type}): ${vault.balance.toFixed(2)} ج.م`);
    });

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPartnerData();
