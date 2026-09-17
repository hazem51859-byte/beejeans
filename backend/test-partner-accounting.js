const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPartnerAccounting() {
  try {
    console.log('🔍 Testing Partner Accounting with Office Invoices...\n');

    // 1. Get branch sales
    const sales = await prisma.sale.findMany({
      where: { status: 'COMPLETED' }
    });
    const totalBranchSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    console.log(`🏪 Branch Sales: ${totalBranchSales.toFixed(2)} ج.م (${sales.length} sales)\n`);

    // 2. Get office invoices
    const officeInvoices = await prisma.officeInvoice.findMany({
      where: { status: 'COMPLETED' }
    });

    const totalOfficeRevenue = officeInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalOfficeProfit = officeInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    const totalOfficeCost = officeInvoices.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);

    console.log(`🏢 Office Invoices:`);
    console.log(`   Total Invoices: ${officeInvoices.length}`);
    console.log(`   Total Revenue: ${totalOfficeRevenue.toFixed(2)} ج.م`);
    console.log(`   Total Cost: ${totalOfficeCost.toFixed(2)} ج.م`);
    console.log(`   Total Profit: ${totalOfficeProfit.toFixed(2)} ج.م\n`);

    // 3. Get expenses
    const expenses = await prisma.expense.findMany();
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    console.log(`💸 Total Expenses: ${totalExpenses.toFixed(2)} ج.م\n`);

    // 4. Calculate net profit
    const totalSales = totalBranchSales + totalOfficeRevenue;
    const grossProfit = totalOfficeProfit; // Since we already have profit from office invoices
    const netProfit = grossProfit - totalExpenses;

    console.log(`📊 Summary:`);
    console.log(`   Total Sales: ${totalSales.toFixed(2)} ج.م`);
    console.log(`   Gross Profit: ${grossProfit.toFixed(2)} ج.م`);
    console.log(`   Net Profit: ${netProfit.toFixed(2)} ج.م\n`);

    // 5. Get partners
    const partners = await prisma.partner.findMany({
      where: { isActive: true }
    });

    console.log(`👥 Partner Shares:\n`);
    partners.forEach(partner => {
      const shareAmount = (netProfit * partner.sharePercentage) / 100;
      console.log(`   ${partner.name} (${partner.sharePercentage}%): ${shareAmount.toFixed(2)} ج.م`);
    });

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPartnerAccounting();
