const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDeliveredTransfers() {
  try {
    console.log('Fixing delivered transfers that were not deducted from source...\n');
    
    // Get all delivered transfers
    const deliveredTransfers = await prisma.transfer.findMany({
      where: {
        status: 'DELIVERED'
      },
      include: {
        items: true,
        fromBranch: true,
        toBranch: true
      }
    });
    
    console.log(`Found ${deliveredTransfers.length} delivered transfers\n`);
    
    for (const transfer of deliveredTransfers) {
      console.log(`\n📦 Transfer: ${transfer.transferNumber}`);
      console.log(`   From: ${transfer.fromBranch?.name || 'المخزن الرئيسي'}`);
      console.log(`   To: ${transfer.toBranch?.name}`);
      console.log(`   Items: ${transfer.items.length}`);
      
      for (const item of transfer.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });
        
        console.log(`\n   📍 Product: ${product?.name}`);
        console.log(`      Requested: ${item.quantityRequested}`);
        console.log(`      Received: ${item.quantityReceived || item.quantityRequested}`);
        
        // Check source inventory
        if (transfer.fromBranchId) {
          const sourceInv = await prisma.inventory.findUnique({
            where: {
              productId_branchId: {
                branchId: transfer.fromBranchId,
                productId: item.productId
              }
            }
          });
          
          console.log(`      Source inventory before: ${sourceInv?.quantity || 0}`);
          
          // Deduct the requested quantity from source
          if (sourceInv && sourceInv.quantity >= item.quantityRequested) {
            await prisma.inventory.update({
              where: { id: sourceInv.id },
              data: {
                quantity: {
                  decrement: item.quantityRequested
                }
              }
            });
            console.log(`      ✅ Deducted ${item.quantityRequested} from source`);
          } else {
            console.log(`      ⚠️  Not enough inventory to deduct (has: ${sourceInv?.quantity || 0}, needs: ${item.quantityRequested})`);
          }
        }
      }
    }
    
    console.log('\n✅ Done fixing delivered transfers!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDeliveredTransfers();
