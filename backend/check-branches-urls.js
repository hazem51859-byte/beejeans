const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDailyReport() {
  console.log('Testing daily report API logic...\n');
  
  const branchId = '550e8400-e29b-41d4-a716-446655440004'; // امبابه الصغير
  const today = new Date('2026-07-23');
  
  console.log('Branch ID:', branchId);
  console.log('Date:', today.toISOString());
  
  // Simulate the report controller logic
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  console.log('\nDate Range:');
  console.log('Start:', startOfDay.toISOString());
  console.log('End:', endOfDay.toISOString());
  
  // Get sales
  const sales = await prisma.sale.findMany({
    where: {
      branchId: branchId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      items: true
    }
  });
  
  console.log('\n📊 Sales Found:', sales.length);
  
  if (sales.length > 0) {
    sales.forEach(sale => {
      console.log(`- ${sale.invoiceNumber}: ${sale.totalAmount} ج.م`);
      console.log(`  Time: ${sale.createdAt}`);
      console.log(`  Items: ${sale.items.length}`);
    });
    
    const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
    const totalTax = sales.reduce((sum, s) => sum + parseFloat(s.taxAmount || 0), 0);
    const totalDiscount = sales.reduce((sum, s) => sum + parseFloat(s.discountAmount || 0), 0);
    
    console.log('\n💰 Summary:');
    console.log('Total Sales:', totalSales.toFixed(2), 'ج.م');
    console.log('Total Tax:', totalTax.toFixed(2), 'ج.م');
    console.log('Total Discount:', totalDiscount.toFixed(2), 'ج.م');
  } else {
    console.log('❌ No sales found!');
  }
  
  await prisma.$disconnect();
}

checkDailyReport().catch(console.error);
