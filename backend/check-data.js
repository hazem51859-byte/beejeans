const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log('📊 Checking current database state...\n');
  
  const branches = await prisma.branch.findMany();
  const users = await prisma.user.findMany();
  const suppliers = await prisma.supplier.findMany();
  
  console.log('🏢 Branches:');
  branches.forEach(b => {
    console.log(`  - ${b.name} (${b.code}) - ${b.url}`);
  });
  
  console.log('\n👥 Users:');
  users.forEach(u => {
    console.log(`  - ${u.username} (${u.role}) - ${u.fullName}`);
  });
  
  console.log('\n🚚 Suppliers:', suppliers.length);
  
  console.log('\n✅ Current state checked!');
  console.log('\n💡 Suggestion:');
  console.log('   The system is ready to use with the Production Management features!');
  console.log('   You can start by:');
  console.log('   1. Adding Fabric Types (أنواع الخامات)');
  console.log('   2. Adding Suppliers (موردين)');
  console.log('   3. Adding Products (الأصناف)\n');
  
  await prisma.$disconnect();
}

checkData();
