const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMainWarehouse() {
  try {
    console.log('🔍 Checking Main Warehouse...\n');
    
    // Check for MAIN warehouse
    let mainWarehouse = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });
    
    if (mainWarehouse) {
      console.log('✅ Main Warehouse Found:');
      console.log(`   ID: ${mainWarehouse.id}`);
      console.log(`   Name: ${mainWarehouse.name}`);
      console.log(`   Code: ${mainWarehouse.code}`);
      console.log(`   URL: ${mainWarehouse.url}`);
    } else {
      console.log('❌ Main Warehouse NOT found!');
      console.log('\n📋 Available Branches:');
      
      const allBranches = await prisma.branch.findMany();
      allBranches.forEach((b, i) => {
        console.log(`   ${i + 1}. ${b.name} (${b.code}) - ID: ${b.id}`);
      });
      
      if (allBranches.length === 0) {
        console.log('\n⚠️  No branches exist! Creating Main Warehouse...');
        
        mainWarehouse = await prisma.branch.create({
          data: {
            code: 'MAIN',
            name: 'المخزن الرئيسي',
            url: 'http://localhost:5173',
            isActive: true,
            vaultBalance: 0,
            cardVaultBalance: 0
          }
        });
        
        console.log('✅ Main Warehouse Created Successfully!');
        console.log(`   ID: ${mainWarehouse.id}`);
      } else {
        console.log('\n💡 Solution: Update the first branch to be MAIN:');
        const firstBranch = allBranches[0];
        
        const updated = await prisma.branch.update({
          where: { id: firstBranch.id },
          data: { code: 'MAIN' }
        });
        
        console.log(`✅ Updated branch "${updated.name}" to code "MAIN"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMainWarehouse();
