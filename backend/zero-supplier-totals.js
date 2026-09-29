const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function zeroSupplierTotals() {
  try {
    console.log('🔄 Clearing totalPurchases and totalPaid for all suppliers...');
    
    // Update all suppliers to zero out totalPurchases and totalPaid
    const result = await prisma.supplier.updateMany({
      data: {
        totalPurchases: 0,
        totalPaid: 0
      }
    });
    
    console.log(`✅ Successfully zeroed totalPurchases and totalPaid for ${result.count} suppliers`);
    
    // Verify the changes
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
      console.log(`${supplier.name}:`);
      console.log(`  Balance: ${supplier.balance} ج.م`);
      console.log(`  Total Purchases: ${supplier.totalPurchases}`);
      console.log(`  Total Paid: ${supplier.totalPaid}`);
      console.log('───────────────────────────────────────────────────────────');
      totalBalance += supplier.balance;
    });
    
    console.log(`\n💰 Total Supplier Balance: ${totalBalance} ج.م`);
    console.log(`   (موجب = لهم فلوس عندنا، سالب = لنا فلوس عندهم)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

zeroSupplierTotals();
