const prisma = require('./src/config/database');

async function fixSaleItems() {
  try {
    console.log('Fixing sale items subtotal...\n');

    // Get all sale items
    const items = await prisma.saleItem.findMany({
      include: {
        product: true
      }
    });

    console.log(`Found ${items.length} sale items\n`);

    for (const item of items) {
      // Calculate subtotal if missing or wrong
      const calculatedSubtotal = item.quantity * item.unitPrice;
      
      if (item.total !== calculatedSubtotal) {
        console.log(`Fixing item ${item.id}:`);
        console.log(`  Product: ${item.product?.name}`);
        console.log(`  Quantity: ${item.quantity}`);
        console.log(`  Unit Price: ${item.unitPrice}`);
        console.log(`  Old subtotal: ${item.total}`);
        console.log(`  New subtotal: ${calculatedSubtotal}`);

        await prisma.saleItem.update({
          where: { id: item.id },
          data: {
            total: calculatedSubtotal
          }
        });
        
        console.log('  ✅ Fixed!\n');
      }
    }

    console.log('All items fixed!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

fixSaleItems();
