const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMonthlyReportData() {
  try {
    console.log('🔍 Checking Monthly Report Data Source...\n');

    // Check what the monthly report API returns
    const invoices = await prisma.officeInvoice.findMany({
      include: {
        items: true
      }
    });

    // Group by status
    const byStatus = {};
    invoices.forEach(inv => {
      const status = inv.status || 'UNKNOWN';
      if (!byStatus[status]) {
        byStatus[status] = {
          count: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalPaid: 0
        };
      }
      byStatus[status].count++;
      byStatus[status].totalRevenue += (inv.total || 0);
      byStatus[status].totalCost += (inv.totalCost || 0);
      byStatus[status].totalProfit += (inv.profit || 0);
      byStatus[status].totalPaid += (inv.paidAmount || 0);
    });

    console.log('📊 Office Invoices by Status:\n');
    Object.keys(byStatus).forEach(status => {
      const data = byStatus[status];
      console.log(`${status}:`);
      console.log(`   Count: ${data.count}`);
      console.log(`   Revenue: ${data.totalRevenue.toFixed(2)} ج.م`);
      console.log(`   Cost: ${data.totalCost.toFixed(2)} ج.م`);
      console.log(`   Profit: ${data.totalProfit.toFixed(2)} ج.م`);
      console.log(`   Paid: ${data.totalPaid.toFixed(2)} ج.م`);
      console.log('');
    });

    // Simulate monthly report calculation
    const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalProfit = invoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    const totalCost = invoices.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);

    console.log('📈 Monthly Report Totals:');
    console.log(`   Total Sales: ${totalSales.toFixed(2)} ج.م`);
    console.log(`   Total Collected: ${totalCollected.toFixed(2)} ج.م`);
    console.log(`   Total Cost: ${totalCost.toFixed(2)} ج.م`);
    console.log(`   Total Profit (from invoices): ${totalProfit.toFixed(2)} ج.م\n`);

    // Check the COMPLETED invoices only
    const completedOnly = invoices.filter(inv => inv.status === 'COMPLETED');
    const completedProfit = completedOnly.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    const completedPaid = completedOnly.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

    console.log('✅ COMPLETED Invoices Only:');
    console.log(`   Count: ${completedOnly.length}`);
    console.log(`   Paid: ${completedPaid.toFixed(2)} ج.م`);
    console.log(`   Profit: ${completedProfit.toFixed(2)} ج.م\n`);

    console.log('💡 Conclusion:');
    console.log(`   Partners page shows: ${completedProfit.toFixed(2)} ج.م (COMPLETED invoices)`);
    console.log(`   Monthly report should show: ${totalProfit.toFixed(2)} ج.م (ALL invoices) or ${completedProfit.toFixed(2)} ج.م (COMPLETED only)`);

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMonthlyReportData();
