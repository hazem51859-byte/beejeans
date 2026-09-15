const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSpecificTransfer() {
  try {
    console.log('Fixing transfer TRF-20260723-042192...\n');
    
    const transfer = await prisma.transfer.findFirst({
      where: {
        transferNumber: 'TRF-20260723-042192'
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
    
    if (!transfer) {
      console.log('❌ Transfer not found');
      return;
    }
    
    console.log('📦 Transfer found:');
    console.log(`   From: ${transfer.fromBranch?.name}`);
    console.log(`   To: ${transfer.toBranch?.name}`);
    console.log(`   Status: ${transfer.status}`);
    
    for (const item of transfer.items) {
      console.log(`\n📦 Processing: ${item.product?.name}`);
      console.log(`   Quantity Received: ${item.quantityReceived}`);
      
      // Add to destination branch
      const destInventory = await prisma.inventory.upsert({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: transfer.toBranchId
          }
        },
        update: {
          quantity: {
            increment: item.quantityReceived
          },
          lastRestockDate: new Date()
        },
        create: {
          productId: item.productId,
          branchId: transfer.toBranchId,
          quantity: item.quantityReceived,
          minQuantity: 10,
          lastRestockDate: new Date()
        }
      });
      
      console.log(`   ✅ Added ${item.quantityReceived} to ${transfer.toBranch?.name}`);
      console.log(`   New quantity: ${destInventory.quantity}`);
    }
    
    console.log('\n✅ Transfer fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSpecificTransfer();
