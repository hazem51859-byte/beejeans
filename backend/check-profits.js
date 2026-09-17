const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProfits() {
  try {
    console.log('💰 Checking Profits and Sales Data...\n');

    // 1. Check Sales
    const sales = await prisma.sale.findMany({
      where: { status: 'COMPLETED' }
    });

    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    console.log(`📊 Total Sales (COMPLETED): ${totalSales.toFixed(2)} ج.م`);
    console.log(`   Number of Sales: ${sales.length}\n`);

    // 2. Check COGS
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: { status: 'COMPLETED' }
      },
      include: {
        product: true
      }
    });

    const totalCOGS = saleItems.reduce((sum, item) => {
      const costPrice = parseFloat(item.unitCostPrice > 0 ? item.unitCostPrice : (item.product?.costPrice || 0));
      return sum + (costPrice * (item.quantity || 0));
    }, 0);

    console.log(`📦 Total COGS: ${totalCOGS.toFixed(2)} ج.م\n`);

    // 3. Check Expenses
    const expenses = await prisma.expense.findMany();
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    console.log(`💸 Total Expenses: ${totalExpenses.toFixed(2)} ج.م`);
    console.log(`   Number of Expenses: ${expenses.length}\n`);

    // 4. Calculate Profits
    const grossProfit = totalSales - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100) : 0;

    console.log('📈 Profit Summary:');
    console.log(`   Gross Profit: ${grossProfit.toFixed(2)} ج.م`);
    console.log(`   Net Profit: ${netProfit.toFixed(2)} ج.م`);
    console.log(`   Profit Margin: ${profitMargin.toFixed(2)}%\n`);

    // 5. Check if there are any partner profit withdrawals
    const partnerTransactions = await prisma.partnerTransaction.findMany({
      where: {
        OR: [
          { type: 'WITHDRAWAL' },
          { type: 'PROFIT_DISTRIBUTION' }
        ]
      }
    });

    console.log(`🔄 Partner Withdrawal Transactions: ${partnerTransactions.length}\n`);

    // 6. Show net profit distribution per partner
    const partners = await prisma.partner.findMany({
      where: { isActive: true }
    });

    console.log('👥 Partner Profit Shares (if distributed now):\n');
    
    partners.forEach(partner => {
      const shareAmount = (netProfit * partner.sharePercentage) / 100;
      console.log(`   ${partner.name} (${partner.sharePercentage}%): ${shareAmount.toFixed(2)} ج.م`);
    });

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProfits();
