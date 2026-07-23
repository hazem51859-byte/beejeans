require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTransferCreation() {
  try {
    console.log('Testing transfer creation...\n');
    
    // Get main branch
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });
    
    if (!mainBranch) {
      console.log('❌ Main branch not found!');
      return;
    }
    
    console.log('✅ Main branch found:', mainBranch.name);
    
    // Get a test branch (not main)
    const testBranch = await prisma.branch.findFirst({
      where: { 
        code: { not: 'MAIN' }
      }
    });
    
    if (!testBranch) {
      console.log('❌ No test branch found!');
      return;
    }
    
    console.log('✅ Test branch found:', testBranch.name);
    
    // Get a test product
    const testProduct = await prisma.product.findFirst({
      where: { status: 'ACTIVE' }
    });
    
    if (!testProduct) {
      console.log('❌ No active product found!');
      return;
    }
    
    console.log('✅ Test product found:', testProduct.name);
    
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!adminUser) {
      console.log('❌ No admin user found!');
      return;
    }
    
    console.log('✅ Admin user found:', adminUser.fullName);
    
    // Try to create transfer
    console.log('\n📦 Creating test transfer...\n');
    
    const transferNumber = `TEST-${Date.now()}`;
    
    const transfer = await prisma.transfer.create({
      data: {
        transferNumber,
        fromBranchId: mainBranch.id,
        toBranchId: testBranch.id,
        sentBy: adminUser.id,
        status: 'PENDING',
        sentAt: new Date(),
        notes: 'Test transfer',
        items: {
          create: [
            {
              productId: testProduct.id,
              quantityRequested: 10,
              status: 'PENDING',
              notes: 'Test item'
            }
          ]
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        fromBranch: true,
        toBranch: true
      }
    });
    
    console.log('✅ Transfer created successfully!');
    console.log('\nTransfer details:');
    console.log('- Number:', transfer.transferNumber);
    console.log('- From:', transfer.fromBranch.name);
    console.log('- To:', transfer.toBranch.name);
    console.log('- Items:', transfer.items.length);
    console.log('- Product:', transfer.items[0].product.name);
    console.log('- Quantity:', transfer.items[0].quantityRequested);
    
    // Clean up - delete test transfer
    console.log('\n🧹 Cleaning up...');
    await prisma.transfer.delete({
      where: { id: transfer.id }
    });
    console.log('✅ Test transfer deleted');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testTransferCreation();
