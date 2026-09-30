const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateVaultsBalances() {
  try {
    console.log('🔄 تحديث أرصدة الخزن...\n');
    
    const updates = [
      { name: 'خزنة المكتب عبدالرحمن', increment: 5560 },
      { name: 'خزنة عم معتز', increment: 278475 },
      { name: 'خزنة مكتب روكسي', increment: 25365 },
      { name: 'فيزا محمود', increment: 4335 }
    ];
    
    console.log('═'.repeat(70));
    console.log('💰 تحديث الأرصدة:');
    console.log('═'.repeat(70));
    
    for (const update of updates) {
      // Get current vault
      const vault = await prisma.vault.findFirst({
        where: { name: update.name }
      });
      
      if (!vault) {
        console.log(`❌ لم يتم العثور على: ${update.name}`);
        continue;
      }
      
      const oldBalance = vault.balance;
      const newBalance = oldBalance + update.increment;
      
      // Update vault balance
      const updated = await prisma.vault.update({
        where: { id: vault.id },
        data: {
          balance: {
            increment: update.increment
          }
        }
      });
      
      console.log(`\n✅ ${update.name}`);
      console.log(`   الرصيد القديم: ${oldBalance.toFixed(2)} ج.م`);
      console.log(`   المضاف: +${update.increment.toFixed(2)} ج.م`);
      console.log(`   الرصيد الجديد: ${updated.balance.toFixed(2)} ج.م`);
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('📊 الأرصدة النهائية لكل الخزن:');
    console.log('═'.repeat(70));
    
    // Get all vaults with updated balances
    const allVaults = await prisma.vault.findMany({
      orderBy: { name: 'asc' }
    });
    
    let totalBalance = 0;
    allVaults.forEach((vault, index) => {
      console.log(`\n${index + 1}. ${vault.name}`);
      console.log(`   النوع: ${vault.type === 'CASH' ? 'نقدي' : vault.type === 'CARD' ? 'فيزا/بطاقة' : vault.type === 'WALLET' ? 'محفظة' : vault.type}`);
      console.log(`   الرصيد: ${vault.balance.toFixed(2)} ج.م`);
      totalBalance += vault.balance;
    });
    
    console.log('\n' + '═'.repeat(70));
    console.log(`💵 إجمالي أرصدة الخزن: ${totalBalance.toFixed(2)} ج.م`);
    console.log('═'.repeat(70));
    console.log('\n✅ تم تحديث الأرصدة بنجاح!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateVaultsBalances();
