const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSuppliersPurchases() {
  console.log('Checking suppliers and purchases...\n');

  // Check suppliers
  const suppliers = await prisma.supplier.findMany({
    include: {
      _count: {
        select: { purchases: true }
      }
    }
  });

  console.log(`📋 Found ${suppliers.length} suppliers:\n`);
  
  for (const supplier of suppliers) {
    console.log(`   ${supplier.name}`);
    console.log(`      Phone: ${supplier.phone || 'N/A'}`);
    console.log(`      Balance: ${supplier.balance || 0}`);
    console.log(`      Purchases Count: ${supplier._count.purchases}`);
    console.log();
  }

  // Check purchases
  const purchases = await prisma.purchase.findMany({
    include: {
      supplier: {
        select: { name: true }
      }
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n📦 Found ${purchases.length} purchases (latest 10):\n`);
  
  if (purchases.length === 0) {
    console.log('   ❌ NO PURCHASES FOUND IN DATABASE!');
    console.log('   This explains why suppliers show 0 invoices.\n');
  } else {
    for (const purchase of purchases) {
      console.log(`   Purchase #${purchase.invoiceNumber || purchase.id.slice(0, 8)}`);
      console.log(`      Supplier: ${purchase.supplier?.name || 'Unknown'}`);
      console.log(`      Date: ${purchase.purchaseDate?.toLocaleDateString('ar-EG') || 'N/A'}`);
      console.log(`      Total: ${purchase.totalAmount || 0}`);
      console.log(`      Paid: ${purchase.paidAmount || 0}`);
      console.log();
    }
  }

  // Check if Purchase model exists
  try {
    const purchaseCount = await prisma.purchase.count();
    console.log(`\n📊 Total purchases in database: ${purchaseCount}`);
  } catch (error) {
    console.log(`\n❌ Error accessing purchases: ${error.message}`);
  }

  await prisma.$disconnect();
}

checkSuppliersPurchases().catch(console.error);
