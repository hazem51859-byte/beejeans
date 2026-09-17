const dayjs = require('dayjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMonthlyReportProfit() {
  try {
    const start = dayjs().startOf('month').toDate();
    const end = dayjs().endOf('month').toDate();
    
    console.log(`📅 Period: ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}\n`);
    
    const invoices = await prisma.officeInvoice.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: 'CANCELLED' }
      }
    });
    
    console.log(`📋 Total invoices in period: ${invoices.length}\n`);
    
    const actualInvoices = invoices.filter(inv => !inv.notes?.includes('رصيد افتتاحي'));
    console.log(`📋 Actual invoices (non-opening): ${actualInvoices.length}\n`);
    
    const totalProfit = actualInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    const totalSales = actualInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalCost = actualInvoices.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);
    
    console.log(`💰 Total Sales: ${totalSales.toFixed(2)} ج.م`);
    console.log(`💰 Total Cost: ${totalCost.toFixed(2)} ج.م`);
    console.log(`📈 Total Profit (Monthly Report): ${totalProfit.toFixed(2)} ج.م\n`);
    
    // Check COMPLETED only
    const completedOnly = actualInvoices.filter(inv => inv.status === 'COMPLETED');
    const completedProfit = completedOnly.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    
    console.log(`✅ COMPLETED invoices: ${completedOnly.length}`);
    console.log(`📈 COMPLETED Profit (Partners Page): ${completedProfit.toFixed(2)} ج.م\n`);
    
    console.log(`❓ Difference: ${Math.abs(totalProfit - completedProfit).toFixed(2)} ج.م`);
    console.log(`   (This is from ${actualInvoices.length - completedOnly.length} PENDING invoices)\n`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

testMonthlyReportProfit();
