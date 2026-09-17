const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOfficeInvoices() {
  try {
    console.log('🔍 Checking Office Invoices on Railway...\n');

    // 1. Check Office Invoices
    const invoices = await prisma.officeInvoice.findMany({
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📋 Total Office Invoices: ${invoices.length}\n`);

    if (invoices.length === 0) {
      console.log('⚠️  No office invoices found!\n');
    } else {
      let totalAmount = 0;
      
      invoices.forEach((inv, idx) => {
        const amount = parseFloat(inv.totalAmount || 0);
        console.log(`${idx + 1}. Invoice #${inv.invoiceNumber || inv.id}`);
        console.log(`   Customer: ${inv.customer?.name || 'N/A'}`);
        console.log(`   Total: ${amount.toFixed(2)} ج.م`);
        console.log(`   Payment: ${inv.paymentMethod || 'N/A'}`);
        console.log(`   Status: ${inv.paymentStatus || 'N/A'}`);
        console.log(`   Date: ${inv.createdAt ? inv.createdAt.toISOString() : 'N/A'}`);
        console.log(`   Items: ${inv.items?.length || 0}`);
        totalAmount += amount;
        console.log('');
      });

      console.log(`💰 Total Revenue from Office Invoices: ${totalAmount.toFixed(2)} ج.م\n`);
    }

    // 2. Check regular Sales (from branches)
    const sales = await prisma.sale.findMany({
      where: { status: 'COMPLETED' }
    });

    console.log(`🏪 Total Branch Sales (COMPLETED): ${sales.length}`);
    
    if (sales.length > 0) {
      const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
      console.log(`   Total Sales Amount: ${totalSales.toFixed(2)} ج.م\n`);
    } else {
      console.log(`   No branch sales found\n`);
    }

    // 3. Check Vault Transactions
    const vaultTransactions = await prisma.vaultTransaction.findMany({
      include: {
        vault: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`💵 Recent Vault Transactions (last 10):\n`);
    
    if (vaultTransactions.length === 0) {
      console.log('⚠️  No vault transactions found!\n');
    } else {
      vaultTransactions.forEach((vt, idx) => {
        console.log(`${idx + 1}. ${vt.type} - ${vt.amount.toFixed(2)} ج.م`);
        console.log(`   Vault: ${vt.vault?.name || 'N/A'}`);
        console.log(`   Description: ${vt.description || 'N/A'}`);
        console.log(`   Date: ${vt.createdAt.toISOString()}`);
        console.log(`   Balance: ${vt.balanceBefore} → ${vt.balanceAfter}`);
        console.log('');
      });
    }

    // 4. Check current vault balances
    const vaults = await prisma.vault.findMany({
      where: { isActive: true }
    });

    console.log('💰 Current Vault Balances:\n');
    let totalVaultBalance = 0;
    
    vaults.forEach(vault => {
      console.log(`   ${vault.name} (${vault.type}): ${vault.balance.toFixed(2)} ج.م`);
      totalVaultBalance += vault.balance;
    });
    
    console.log(`\n   📊 Total in All Vaults: ${totalVaultBalance.toFixed(2)} ج.م\n`);

    // 5. Check expenses
    const expenses = await prisma.expense.findMany();
    console.log(`💸 Total Expenses: ${expenses.length}`);
    
    if (expenses.length > 0) {
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      console.log(`   Total Amount: ${totalExpenses.toFixed(2)} ج.م`);
    }

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOfficeInvoices();
