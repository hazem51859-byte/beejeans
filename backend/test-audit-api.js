const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAuditAPI() {
  try {
    console.log('🔍 Testing Audit System...\n');
    
    // Test 1: Check if InventoryAudit model exists
    console.log('1️⃣ Checking InventoryAudit model...');
    if (prisma.inventoryAudit) {
      console.log('✅ InventoryAudit model exists in Prisma Client');
      
      // Try to count
      const count = await prisma.inventoryAudit.count();
      console.log(`✅ Found ${count} audits in database\n`);
    } else {
      console.log('❌ InventoryAudit model NOT found in Prisma Client');
      console.log('   Run: npx prisma generate\n');
    }
    
    // Test 2: Check InventoryAuditItem
    console.log('2️⃣ Checking InventoryAuditItem model...');
    if (prisma.inventoryAuditItem) {
      console.log('✅ InventoryAuditItem model exists in Prisma Client');
      
      const itemCount = await prisma.inventoryAuditItem.count();
      console.log(`✅ Found ${itemCount} audit items in database\n`);
    } else {
      console.log('❌ InventoryAuditItem model NOT found in Prisma Client\n');
    }
    
    // Test 3: List all available models
    console.log('3️⃣ Available Prisma models:');
    const models = Object.keys(prisma).filter(key => 
      typeof prisma[key] === 'object' && 
      prisma[key] !== null &&
      !key.startsWith('_') &&
      !key.startsWith('$')
    );
    console.log(models.sort().join(', '));
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuditAPI();
