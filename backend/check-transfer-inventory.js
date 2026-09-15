const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransferInventory() {
  try {
    console.log('Checking transfer inventory status...\n');
    
    // Get the delivered transfer
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
    
    console.log('📦 Transfer Details:');
    console.log(`   Number: ${transfer.transferNumber}`);
    console.log(`   Status: ${transfer.status}`);
    console.log(`   From: ${transfer.fromBranch?.name || 'المخزن الرئيسي'}`);
    console.log(`   To: ${transfer.toBranch?.name}`);
    console.log(`   Received At: ${transfer.receivedAt}`);
    console.log(`   Received By: ${transfer.receivedBy}`);
    
    console.log('\n📋 Transfer Items:');
    for (const item of transfer.items) {
      console.log(`\n   Product: ${item.product?.name}`);
      console.log(`   Requested: ${item.quantityRequested}`);
      console.log(`   Received: ${item.quantityReceived || 'NULL'}`);
      console.log(`   Status: ${item.status}`);
      
      // Check source inventory (main branch)
      if (transfer.fromBranchId) {
        const sourceInv = await prisma.inventory.findUnique({
          where: {
            productId_branchId: {
              branchId: transfer.fromBranchId,
              productId: item.productId
            }
          }
        });
        console.log(`   Source Inventory (${transfer.fromBranch?.name}):`);
        console.log(`      Quantity: ${sourceInv?.quantity || 0}`);
      }
      
      // Check destination inventory (branch)
      const destInv = await prisma.inventory.findUnique({
        where: {
          productId_branchId: {
            branchId: transfer.toBranchId,
            productId: item.productId
          }
        }
      });
      console.log(`   Destination Inventory (${transfer.toBranch?.name}):`);
      console.log(`      Quantity: ${destInv?.quantity || 0}`);
      console.log(`      Last Restock: ${destInv?.lastRestockDate || 'Never'}`);
    }
    
    console.log('\n✅ Check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransferInventory();
