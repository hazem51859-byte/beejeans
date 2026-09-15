const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransfersValue() {
  try {
    console.log('🔍 Checking transfers and their values...\n');
    
    // Get all delivered transfers
    const transfers = await prisma.transfer.findMany({
      where: {
        status: { in: ['DELIVERED', 'RECEIVED', 'COMPLETED'] }
      },
      include: {
        fromBranch: { select: { name: true } },
        toBranch: { select: { name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                costPrice: true
              }
            }
          }
        }
      }
    });

    console.log(`📦 Found ${transfers.length} delivered transfers\n`);

    if (transfers.length === 0) {
      console.log('⚠️  No delivered transfers found!');
      return;
    }

    transfers.forEach(transfer => {
      console.log(`\n════════════════════════════════════════`);
      console.log(`Transfer #${transfer.id}`);
      console.log(`From: ${transfer.fromBranch.name} → To: ${transfer.toBranch.name}`);
      console.log(`Status: ${transfer.status}`);
      console.log(`Date: ${transfer.createdAt}`);
      console.log(`\n📋 Items Count: ${transfer.items?.length || 0}`);
      
      if (!transfer.items || transfer.items.length === 0) {
        console.log(`⚠️  WARNING: No items found for this transfer!`);
        console.log(`This transfer has no items attached.`);
        return;
      }
      
      console.log(`\nItems:`);
      
      let totalValue = 0;
      
      transfer.items.forEach(item => {
        const costPrice = parseFloat(item.product?.costPrice || 0);
        const qty = parseInt(item.quantityReceived || item.quantityRequested || 0);
        const itemValue = costPrice * qty;
        totalValue += itemValue;
        
        console.log(`  - ${item.product?.name || 'Unknown'}`);
        console.log(`    Cost Price: ${costPrice.toFixed(2)}`);
        console.log(`    Quantity Requested: ${item.quantityRequested}`);
        console.log(`    Quantity Received: ${item.quantityReceived || 'NULL'}`);
        console.log(`    Item Value: ${itemValue.toFixed(2)}`);
      });
      
      console.log(`\n💰 Total Transfer Value: ${totalValue.toFixed(2)}`);
    });

    console.log('\n\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransfersValue();
