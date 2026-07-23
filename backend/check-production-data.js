const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProductionData() {
  console.log('Checking production-related purchases...\n');

  // Check Fabric Purchases
  const fabricPurchases = await prisma.fabricPurchase.findMany({
    include: {
      supplier: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(`🧵 Fabric Purchases: ${fabricPurchases.length}`);
  if (fabricPurchases.length > 0) {
    fabricPurchases.forEach(fp => {
      console.log(`   - ${fp.supplier?.name || 'Unknown'}: ${fp.totalCost} ج.م (${fp.meters} متر)`);
    });
  }
  console.log();

  // Check Manufacturing Orders
  const manufacturingOrders = await prisma.manufacturingOrder.findMany({
    include: {
      supplier: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(`🏭 Manufacturing Orders: ${manufacturingOrders.length}`);
  if (manufacturingOrders.length > 0) {
    manufacturingOrders.forEach(mo => {
      console.log(`   - ${mo.supplier?.name || 'Unknown'}: ${mo.totalManufacturingCost} ج.م (${mo.piecesRequested} قطعة)`);
    });
  }
  console.log();

  // Check Washing Orders
  const washingOrders = await prisma.washingOrder.findMany({
    include: {
      supplier: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(`🧼 Washing Orders: ${washingOrders.length}`);
  if (washingOrders.length > 0) {
    washingOrders.forEach(wo => {
      console.log(`   - ${wo.supplier?.name || 'Unknown'}: ${wo.totalWashingCost} ج.م (${wo.piecesRequested} قطعة)`);
    });
  }
  console.log();

  // Summary
  const totalFabricCost = fabricPurchases.reduce((sum, fp) => sum + (fp.totalCost || 0), 0);
  const totalManufacturingCost = manufacturingOrders.reduce((sum, mo) => sum + (mo.totalManufacturingCost || 0), 0);
  const totalWashingCost = washingOrders.reduce((sum, wo) => sum + (wo.totalWashingCost || 0), 0);
  
  console.log('💰 Summary:');
  console.log(`   Fabric Purchases: ${totalFabricCost.toFixed(2)} ج.م`);
  console.log(`   Manufacturing: ${totalManufacturingCost.toFixed(2)} ج.م`);
  console.log(`   Washing: ${totalWashingCost.toFixed(2)} ج.م`);
  console.log(`   Total Production Cost: ${(totalFabricCost + totalManufacturingCost + totalWashingCost).toFixed(2)} ج.م`);
  console.log();
  
  console.log('🔍 Expected vs Actual:');
  console.log(`   Suppliers Balance: ${142400 + 32500 + 16250} ج.م`);
  console.log(`   Production Cost: ${(totalFabricCost + totalManufacturingCost + totalWashingCost).toFixed(2)} ج.م`);

  await prisma.$disconnect();
}

checkProductionData().catch(console.error);
