const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareProfitCalculations() {
  try {
    console.log('🔍 Comparing Profit Calculations...\n');

    // 1. Office Invoices (COMPLETED only - like Partners page)
    const completedInvoices = await prisma.officeInvoice.findMany({
      where: { status: 'COMPLETED' }
    });

    const completedRevenue = completedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const completedProfit = completedInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    const completedCost = completedInvoices.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);

    console.log('📊 Office Invoices (COMPLETED status only):');
    console.log(`   Count: ${completedInvoices.length}`);
    console.log(`   Revenue: ${completedRevenue.toFixed(2)} ج.م`);
    console.log(`   Cost: ${completedCost.toFixed(2)} ج.م`);
    console.log(`   Profit: ${completedProfit.toFixed(2)} ج.م\n`);

    // 2. All Office Invoices (like Monthly Report might use)
    const allInvoices = await prisma.officeInvoice.findMany();

    const allRevenue = allInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const allProfit = allInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    const allCost = allInvoices.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);
    const allPaid = allInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

    console.log('📊 Office Invoices (ALL statuses):');
    console.log(`   Count: ${allInvoices.length}`);
    console.log(`   Total Revenue: ${allRevenue.toFixed(2)} ج.م`);
    console.log(`   Total Cost: ${allCost.toFixed(2)} ج.م`);
    console.log(`   Total Profit: ${allProfit.toFixed(2)} ج.م`);
    console.log(`   Paid Amount: ${allPaid.toFixed(2)} ج.م\n`);

    // 3. Check branch sales
    const branchSales = await prisma.sale.findMany({
      where: { status: 'COMPLETED' },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    let branchRevenue = 0;
    let branchCost = 0;

    branchSales.forEach(sale => {
      branchRevenue += sale.total;
      sale.items.forEach(item => {
        const costPrice = parseFloat(item.unitCostPrice > 0 ? item.unitCostPrice : (item.product?.costPrice || 0));
        branchCost += costPrice * item.quantity;
      });
    });

    const branchProfit = branchRevenue - branchCost;

    console.log('🏪 Branch Sales:');
    console.log(`   Count: ${branchSales.length}`);
    console.log(`   Revenue: ${branchRevenue.toFixed(2)} ج.م`);
    console.log(`   Cost: ${branchCost.toFixed(2)} ج.م`);
    console.log(`   Profit: ${branchProfit.toFixed(2)} ج.م\n`);

    // 4. Expenses
    const expenses = await prisma.expense.findMany();
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    console.log(`💸 Total Expenses: ${totalExpenses.toFixed(2)} ج.م\n`);

    // 5. Audits Loss
    const audits = await prisma.inventoryAudit.findMany({
      where: { status: 'SETTLED' }
    });
    const auditsLoss = audits.reduce((sum, audit) => sum + (audit.totalLoss || 0), 0);

    console.log(`📉 Audits Loss: ${auditsLoss.toFixed(2)} ج.م\n`);

    // 6. Calculate both ways
    console.log('📈 CALCULATION COMPARISON:\n');

    // Partners page way (COMPLETED invoices only)
    const partnersNetProfit = completedProfit + branchProfit - totalExpenses;
    console.log('👥 Partners Page Method:');
    console.log(`   Office Profit: ${completedProfit.toFixed(2)} ج.م`);
    console.log(`   Branch Profit: ${branchProfit.toFixed(2)} ج.م`);
    console.log(`   Expenses: -${totalExpenses.toFixed(2)} ج.م`);
    console.log(`   NET PROFIT: ${partnersNetProfit.toFixed(2)} ج.م\n`);

    // Monthly report way (ALL paid amounts)
    const monthlyReportWholesaleProfit = allPaid - allCost;
    const monthlyReportNetProfit = monthlyReportWholesaleProfit + branchProfit - totalExpenses - auditsLoss;
    console.log('📊 Monthly Report Method:');
    console.log(`   Office Collected: ${allPaid.toFixed(2)} ج.م`);
    console.log(`   Office Cost: ${allCost.toFixed(2)} ج.م`);
    console.log(`   Office Profit: ${monthlyReportWholesaleProfit.toFixed(2)} ج.م`);
    console.log(`   Branch Profit: ${branchProfit.toFixed(2)} ج.م`);
    console.log(`   Expenses: -${totalExpenses.toFixed(2)} ج.م`);
    console.log(`   Audits Loss: -${auditsLoss.toFixed(2)} ج.م`);
    console.log(`   NET PROFIT: ${monthlyReportNetProfit.toFixed(2)} ج.م\n`);

    console.log(`❓ Difference: ${Math.abs(partnersNetProfit - monthlyReportNetProfit).toFixed(2)} ج.م\n`);

    console.log('✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareProfitCalculations();
