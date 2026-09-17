const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateVaultBalances() {
  try {
    console.log('🔄 Updating Vault Balances...\n');

    const updates = [
      { name: 'خزنة عم معتز', balance: 278475 },
      { name: 'خزنة المكتب عبدالرحمن', balance: 49450 },
      { name: 'خزنة مكتب روكسي', balance: 25365 },
      { name: 'فيزا محمود', balance: 4335 },
    ];

    for (const update of updates) {
      // Find vault by name
      const vault = await prisma.vault.findFirst({
        where: { name: update.name }
      });

      if (!vault) {
        console.log(`❌ Vault "${update.name}" not found!`);
        continue;
      }

      const oldBalance = vault.balance;

      // Update balance
      await prisma.vault.update({
        where: { id: vault.id },
        data: { balance: update.balance }
      });

      console.log(`✅ ${update.name}`);
      console.log(`   Old: ${oldBalance.toFixed(2)} ج.م`);
      console.log(`   New: ${update.balance.toFixed(2)} ج.م`);
      console.log(`   Change: ${(update.balance - oldBalance).toFixed(2)} ج.م\n`);
    }

    console.log('✅ All vault balances updated!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateVaultBalances();
