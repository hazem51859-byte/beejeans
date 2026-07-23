const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransferValues() {
  console.log('Checking transfer values...\n');

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
              name: true,
              costPrice: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  console.log(`Found ${transfers.length} transfers\n`);

  for (const transfer of transfers) {
    console.log(`📦 Transfer: ${transfer.transferNumber}`);
    console.log(`   From: ${transfer.fromBranch.name}`);
    console.log(`   To: ${transfer.toBranch.name}`);
    console.log(`   Status: ${transfer.status}`);
    
    let totalValue = 0;
    console.log(`   Items:`);
    
    for (const item of transfer.items) {
      const costPrice = parseFloat(item.product?.costPrice || 0);
      const quantity = parseInt(item.quantityReceived || item.quantityRequested || 0);
      const itemValue = costPrice * quantity;
      totalValue += itemValue;
      
      console.log(`      - ${item.product.name}`);
      console.log(`        Cost: ${costPrice} × ${quantity} = ${itemValue.toFixed(2)}`);
    }
    
    console.log(`   💰 Total Value: ${totalValue.toFixed(2)}\n`);
  }

  await prisma.$disconnect();
}

checkTransferValues().catch(console.error);
