const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMinaBalance() {
  try {
    console.log('🔄 Fixing مينا فوكس جينز balance...');
    
    // Update مينا فوكس جينز balance to positive (we have credit with them)
    const result = await prisma.supplier.updateMany({
      where: {
        name: 'مينا فوكس جينز'
      },
      data: {
        balance: -4905  // Negative = we have credit with them (لنا فلوس عندهم)
      }
    });
    
    console.log(`✅ Successfully updated ${result.count} supplier(s)`);
    
    // Verify all supplier balances
    const suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        name: true,
        balance: true,
        totalPurchases: true,
        totalPaid: true
      },
      orderBy: { name: 'asc' }
    });
    
    console.log('\n📊 Current supplier balances:');
    console.log('═══════════════════════════════════════════════════════════');
    let totalBalance = 0;
    
    suppliers.forEach(supplier => {
      const status = supplier.balance > 0 ? '(مدين - لهم فلوس عندنا)' : 
                     supplier.balance < 0 ? '(دائن - لنا فلوس عندهم)' : 
                     '(متزن)';
      console.log(`${supplier.name}: ${supplier.balance} ج.م ${status}`);
      totalBalance += supplier.balance;
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n💰 Total Supplier Balance: ${totalBalance} ج.م`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixMinaBalance();
