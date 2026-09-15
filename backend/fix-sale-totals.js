const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSaleTotals() {
  console.log('Checking and fixing sale totals...\n');
  
  // Get all sales to check
  const sales = await prisma.sale.findMany({
    include: {
      items: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  console.log(`Found ${sales.length} sales\n`);
  
  let fixedCount = 0;
  
  for (const sale of sales) {
    console.log(`📄 Invoice: ${sale.invoiceNumber}`);
    console.log(`   Current total: ${sale.total}`);
    console.log(`   Current subtotal: ${sale.subtotal}`);
    console.log(`   Items: ${sale.items.length}`);
    
    // Calculate correct totals from items
    let calculatedSubtotal = 0;
    let calculatedTotal = 0;
    
    sale.items.forEach(item => {
      const itemTotal = parseFloat(item.total || 0);
      const unitPrice = parseFloat(item.unitPrice || 0);
      const quantity = parseInt(item.quantity || 0);
      
      console.log(`   - Item: ${itemTotal} ج.م (qty: ${quantity}, price: ${unitPrice})`);
      calculatedSubtotal += (unitPrice * quantity);
      calculatedTotal += itemTotal;
    });
    
    const taxAmount = parseFloat(sale.taxAmount || 0);
    const discountAmount = parseFloat(sale.discountAmount || 0);
    const expectedTotal = calculatedSubtotal + taxAmount - discountAmount;
    
    console.log(`   📊 Calculated:`);
    console.log(`      Subtotal: ${calculatedSubtotal.toFixed(2)} ج.م`);
    console.log(`      + Tax: ${taxAmount.toFixed(2)} ج.م`);
    console.log(`      - Discount: ${discountAmount.toFixed(2)} ج.م`);
    console.log(`      = Total: ${expectedTotal.toFixed(2)} ج.م`);
    
    // Check if needs fixing
    const needsFixing = 
      isNaN(sale.total) || 
      sale.total === null || 
      sale.total === 0 ||
      isNaN(sale.subtotal) ||
      sale.subtotal === null ||
      Math.abs(sale.total - expectedTotal) > 0.01;
    
    if (needsFixing) {
      console.log(`   ⚠️ Needs fixing!`);
      
      // Update the sale
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          subtotal: calculatedSubtotal,
          total: expectedTotal
        }
      });
      
      console.log(`   ✅ Fixed!\n`);
      fixedCount++;
    } else {
      console.log(`   ✓ OK\n`);
    }
  }
  
  console.log(`\n📊 Summary: Fixed ${fixedCount} out of ${sales.length} sales`);

  
  await prisma.$disconnect();
  console.log('\n✅ Done!');
}

fixSaleTotals().catch(console.error);
