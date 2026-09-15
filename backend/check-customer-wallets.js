const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomerWallets() {
  try {
    console.log('\n🔍 Checking customer wallet balances...\n');
    
    const customers = await prisma.customer.findMany({
      where: { 
        isActive: true,
        walletBalance: { gt: 0 }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        walletBalance: true
      },
      orderBy: { walletBalance: 'desc' }
    });
    
    if (customers.length === 0) {
      console.log('❌ No customers with wallet balance > 0 found!');
      console.log('   This is why customerCredit = 0 in the report.\n');
      
      // Check all customers
      const allCustomers = await prisma.customer.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          walletBalance: true
        }
      });
      
      console.log(`📊 Total active customers: ${allCustomers.length}`);
      console.log(`   All have walletBalance = 0 or NULL\n`);
      
    } else {
      console.log(`✅ Found ${customers.length} customers with wallet balance:\n`);
      
      let totalWallet = 0;
      customers.forEach(c => {
        const balance = c.walletBalance || 0;
        totalWallet += balance;
        console.log(`   ${c.name} (${c.phone || 'no phone'})`);
        console.log(`      Wallet: ${balance.toFixed(2)} EGP`);
        console.log('');
      });
      
      console.log(`💰 Total wallet balance: ${totalWallet.toFixed(2)} EGP\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomerWallets();
