const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTransferItems() {
  try {
    console.log('🔧 Fixing transfer items...\n');
    
    const transferId = 'a86406ff-2434-4951-8bef-731e657a32c0';
    
    // Get the transfer
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        fromBranch: true,
        toBranch: true
      }
    });
    
    if (!transfer) {
      console.log('❌ Transfer not found!');
      return;
    }
    
    console.log(`📦 Transfer: ${transfer.fromBranch.name} → ${transfer.toBranch.name}`);
    console.log(`Status: ${transfer.status}`);
    console.log(`Date: ${transfer.createdAt}\n`);
    
    // Check inventory in the target branch
    console.log('📊 Checking inventory in امبابه الصغير...\n');
    
    const inventory = await prisma.inventory.findMany({
      where: {
        branchId: transfer.toBranchId
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            barcode: true,
            costPrice: true,
            sellingPrice: true
          }
        }
      }
    });
    
    console.log(`Found ${inventory.length} products in inventory:\n`);
    
    inventory.forEach((item, index) => {
      console.log(`${index + 1}. ${item.product.name}`);
      console.log(`   Barcode: ${item.product.barcode}`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Cost: ${item.product.costPrice}`);
      console.log(`   Selling: ${item.product.sellingPrice}`);
      console.log('');
    });
    
    console.log('\n════════════════════════════════════════');
    console.log('⚠️  MANUAL ACTION REQUIRED');
    console.log('════════════════════════════════════════\n');
    console.log('Please tell me which products were in the transfer and their quantities.');
    console.log('For example:');
    console.log('  Product ID: xxx, Quantity: 10');
    console.log('  Product ID: yyy, Quantity: 5');
    console.log('\nOr the easier way: Delete this transfer and create a new one! 🚀');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTransferItems();
