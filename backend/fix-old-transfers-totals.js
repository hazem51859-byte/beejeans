const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOldTransfersTotals() {
  console.log('🔧 بدء إعادة حساب أرقام التوريدات المكتملة...\n');

  try {
    // Get all delivered transfers
    const transfers = await prisma.transfer.findMany({
      where: {
        status: 'DELIVERED'
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    console.log(`📦 وجدنا ${transfers.length} توريد مكتمل\n`);

    for (const transfer of transfers) {
      console.log(`\n⚙️ معالجة التوريد: ${transfer.transferNumber}`);
      
      let totalCost = 0;
      let totalSellingPrice = 0;
      let hasDiscrepancy = false;
      let discrepancyType = null;

      // Process each item
      for (const item of transfer.items) {
        const quantityRequested = item.quantityRequested || 0;
        const quantityReceived = item.quantityReceived || quantityRequested;
        
        // Check for discrepancies
        if (quantityReceived !== quantityRequested) {
          hasDiscrepancy = true;
          if (quantityReceived < quantityRequested) {
            discrepancyType = 'SHORTAGE';
          } else {
            discrepancyType = 'EXCESS';
          }
        }

        // Calculate totals based on RECEIVED quantity
        const costPrice = item.costPrice || item.product?.costPrice || 0;
        const sellingPrice = item.sellingPrice || item.product?.sellingPrice || 0;
        
        totalCost += costPrice * quantityReceived;
        totalSellingPrice += sellingPrice * quantityReceived;

        console.log(`  📊 ${item.product?.name}: طلب ${quantityRequested} | استلم ${quantityReceived} | فرق: ${quantityReceived - quantityRequested}`);
      }

      const profit = totalSellingPrice - totalCost;

      // Update transfer with correct totals
      await prisma.transfer.update({
        where: { id: transfer.id },
        data: {
          totalCost: totalCost,
          totalSellingPrice: totalSellingPrice,
          hasDiscrepancy: hasDiscrepancy,
          discrepancyType: discrepancyType
        }
      });

      console.log(`  ✅ تم التحديث:`);
      console.log(`     - التكلفة: ${totalCost.toFixed(2)} ج.م`);
      console.log(`     - البيع: ${totalSellingPrice.toFixed(2)} ج.م`);
      console.log(`     - الربح: ${profit.toFixed(2)} ج.م`);
      console.log(`     - فروقات: ${hasDiscrepancy ? 'نعم (' + discrepancyType + ')' : 'لا'}`);
    }

    console.log('\n✨ تم إعادة حساب جميع التوريدات بنجاح!\n');

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOldTransfersTotals();
