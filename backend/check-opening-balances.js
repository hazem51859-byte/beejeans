const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOpeningBalances() {
  try {
    console.log('🔍 التحقق من الأرصدة الافتتاحية المسجلة...\n');

    // 1. أرصدة الموردين
    console.log('═══════════════════════════════════════════════════════════');
    console.log('💰 أرصدة الموردين (المسجلة كدفعات):');
    console.log('═══════════════════════════════════════════════════════════');
    
    const supplierPayments = await prisma.supplierPayment.findMany({
      where: {
        referenceNumber: 'OPENING-BALANCE'
      },
      include: {
        supplier: true
      }
    });

    let totalSuppliers = 0;
    for (const payment of supplierPayments) {
      console.log(`✅ ${payment.supplier.name}: ${payment.amount.toLocaleString('ar-EG')} ج.م`);
      totalSuppliers += payment.amount;
    }
    
    console.log(`\n📊 إجمالي أرصدة الموردين: ${totalSuppliers.toLocaleString('ar-EG')} ج.م`);

    // 2. مشتريات القماش
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧵 فواتير شراء القماش:');
    console.log('═══════════════════════════════════════════════════════════');
    
    const fabricPurchases = await prisma.fabricPurchase.findMany({
      where: {
        invoiceNumber: { startsWith: 'OPENING-FABRIC-' }
      },
      include: {
        fabricType: true
      }
    });

    let totalFabricPurchases = 0;
    if (fabricPurchases.length === 0) {
      console.log('✅ لا توجد فواتير شراء قماش (رصيد افتتاحي فقط)');
    } else {
      for (const purchase of fabricPurchases) {
        console.log(`📦 ${purchase.fabricType.name}: ${purchase.totalCost.toLocaleString('ar-EG')} ج.م`);
        totalFabricPurchases += purchase.totalCost;
      }
      console.log(`\n📊 إجمالي مشتريات القماش: ${totalFabricPurchases.toLocaleString('ar-EG')} ج.م`);
    }

    // 3. مخزون القماش
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📦 مخزون القماش الحالي:');
    console.log('═══════════════════════════════════════════════════════════');
    
    const fabricStock = await prisma.fabricType.findMany({
      include: {
        fabricStock: true
      }
    });

    let totalStockValue = 0;
    for (const fabric of fabricStock) {
      const stock = fabric.fabricStock && fabric.fabricStock.length > 0 ? fabric.fabricStock[0] : null;
      if (stock && stock.availableMeters > 0) {
        const value = stock.availableMeters * fabric.pricePerMeter;
        totalStockValue += value;
        console.log(`📏 ${fabric.name}: ${stock.availableMeters.toLocaleString('ar-EG')} متر × ${fabric.pricePerMeter} = ${value.toLocaleString('ar-EG')} ج.م`);
      }
    }
    
    console.log(`\n📊 إجمالي قيمة مخزون القماش: ${totalStockValue.toLocaleString('ar-EG')} ج.م`);

    // الملخص
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📊 الملخص النهائي:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`💰 إجمالي المسجل كمصروفات (الموردين): ${totalSuppliers.toLocaleString('ar-EG')} ج.م`);
    console.log(`🧵 إجمالي مشتريات القماش المسجلة: ${totalFabricPurchases.toLocaleString('ar-EG')} ج.م`);
    console.log(`📦 قيمة مخزون القماش (افتتاحي): ${totalStockValue.toLocaleString('ar-EG')} ج.م`);
    console.log('\n✅ المصروفات اللي هتظهر في التقرير = أرصدة الموردين فقط');
    console.log('✅ القماش موجود كرصيد افتتاحي بدون مشتريات مسجلة');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOpeningBalances();
