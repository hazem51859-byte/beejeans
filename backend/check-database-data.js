const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('🔍 Checking database data...\n');

    const branches = await prisma.branch.count();
    const users = await prisma.user.count();
    const products = await prisma.product.count();
    const sales = await prisma.sale.count();
    const transfers = await prisma.transfer.count();
    const customers = await prisma.customer.count();

    console.log('📊 Database Status:');
    console.log('==================');
    console.log(`Branches: ${branches}`);
    console.log(`Users: ${users}`);
    console.log(`Products: ${products}`);
    console.log(`Sales: ${sales}`);
    console.log(`Transfers: ${transfers}`);
    console.log(`Customers: ${customers}`);
    console.log('==================\n');

    if (branches > 0 && users > 0) {
      console.log('✅ DATA EXISTS! Your database has data.');
      
      // Show some sample data
      const sampleBranches = await prisma.branch.findMany({ take: 3 });
      console.log('\n📍 Sample Branches:');
      sampleBranches.forEach(b => console.log(`  - ${b.name} (${b.code})`));
      
      const sampleProducts = await prisma.product.findMany({ take: 3 });
      console.log('\n📦 Sample Products:');
      sampleProducts.forEach(p => console.log(`  - ${p.name} (${p.costPrice} ج)`));
    } else {
      console.log('❌ DATABASE IS EMPTY! Need to restore from backup.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkData();
