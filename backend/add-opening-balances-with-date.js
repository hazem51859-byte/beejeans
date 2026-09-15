const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addOpeningBalancesWithDate() {
  try {
    console.log('🚀 بدء إضافة الأرصدة الافتتاحية بتاريخ 1/9/2026...\n');

    // التاريخ المحدد: 1 سبتمبر 2026
    const openingDate = new Date('2026-09-01T00:00:00.000Z');
    
    console.log(`📅 التاريخ: ${openingDate.toLocaleDateString('ar-EG')}\n`);

    // ════════════════════════════════════════════════════════════
    // 1. أرصدة الموردين (Supplier Payments)
    // ════════════════════════════════════════════════════════════
    
    console.log('💰 إضافة أرصدة الموردين...\n');
    
    const suppliers = [
      { name: 'مصنع معتز', balance: 27000 },
      { name: 'مغسله (عم معتز جديد)', balance: 75318 },
      { name: 'مينا فوكس جينز', balance: -4905 },
      { name: 'كلوبالي (تبع سامح)', balance: 15875 },
      { name: 'شيكابالا', balance: 29685 },
      { name: 'مغسله اورانج ابو محمود', balance: 0 },
      { name: 'الرباعيه شيكات عم معتز', balance: 450000 }
    ];

    for (const sup of suppliers) {
      if (sup.balance === 0) continue; // تخطي المسدد

      const supplier = await prisma.supplier.findFirst({
        where: { name: sup.name }
      });

      if (!supplier) {
        console.log(`⚠️ المورد "${sup.name}" غير موجود`);
        continue;
      }

      // إضافة دفعة بتاريخ 1/9
      await prisma.supplierPayment.create({
        data: {
          supplierId: supplier.id,
          amount: Math.abs(sup.balance),
          paymentMethod: 'CASH',
          paymentDate: openingDate,
          referenceNumber: 'OPENING-BALANCE',
          notes: `رصيد افتتاحي - ${sup.balance > 0 ? 'لينا عنده' : 'علينا له'}`,
          createdBy: 'SYSTEM'
        }
      });

      // تحديث الـ totalPaid
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: {
          totalPaid: Math.abs(sup.balance)
        }
      });

      console.log(`✅ ${supplier.name}: ${sup.balance.toLocaleString('ar-EG')} ج.م`);
    }

    // ════════════════════════════════════════════════════════════
    // 2. مشتريات القماش (Fabric Purchases)
    // ════════════════════════════════════════════════════════════
    
    console.log('\n🧵 إضافة مشتريات القماش الافتتاحية...\n');

    const fabricStocks = [
      { name: 'نيو فيجن كحلي', meters: 2511, pricePerMeter: 175 },
      { name: 'سلوشي', meters: 822, pricePerMeter: 192 },
      { name: 'نيو فيجن محجر', meters: 401, pricePerMeter: 175 },
      { name: 'بوي فريند مخلوط', meters: 26, pricePerMeter: 155 },
      { name: 'كارين', meters: 116, pricePerMeter: 147 }
    ];

    // استخدام مورد وهمي للرصيد الافتتاحي
    let openingSupplier = await prisma.supplier.findFirst({
      where: { name: 'رصيد افتتاحي - قماش' }
    });

    if (!openingSupplier) {
      openingSupplier = await prisma.supplier.create({
        data: {
          name: 'رصيد افتتاحي - قماش',
          type: 'FABRIC',
          balance: 0,
          totalPurchases: 0,
          totalPaid: 0,
          notes: 'مورد وهمي للرصيد الافتتاحي',
          isActive: false
        }
      });
    }

    let fabricInvoiceNumber = 1;

    for (const fabric of fabricStocks) {
      const fabricType = await prisma.fabricType.findUnique({
        where: { name: fabric.name }
      });

      if (!fabricType) {
        console.log(`⚠️ نوع القماش "${fabric.name}" غير موجود`);
        continue;
      }

      const totalCost = fabric.meters * fabric.pricePerMeter;

      // إضافة فاتورة شراء قماش
      await prisma.fabricPurchase.create({
        data: {
          invoiceNumber: `OPENING-FABRIC-${fabricInvoiceNumber++}`,
          supplierId: openingSupplier.id,
          fabricTypeId: fabricType.id,
          meters: fabric.meters,
          pricePerMeter: fabric.pricePerMeter,
          totalCost: totalCost,
          paidAmount: totalCost,
          remainingAmount: 0,
          paymentStatus: 'PAID',
          purchaseDate: openingDate,
          notes: 'رصيد افتتاحي',
          createdBy: 'SYSTEM'
        }
      });

      console.log(`✅ ${fabric.name}: ${fabric.meters.toLocaleString('ar-EG')} متر × ${fabric.pricePerMeter} = ${totalCost.toLocaleString('ar-EG')} ج.م`);
    }

    // ════════════════════════════════════════════════════════════
    // الملخص النهائي
    // ════════════════════════════════════════════════════════════
    
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📊 ملخص الأرصدة الافتتاحية:');
    console.log('═══════════════════════════════════════════════════════════');
    
    const totalSupplierBalance = suppliers.reduce((sum, s) => sum + s.balance, 0);
    const totalFabricValue = fabricStocks.reduce((sum, f) => sum + (f.meters * f.pricePerMeter), 0);
    
    console.log(`💰 إجمالي أرصدة الموردين: ${totalSupplierBalance.toLocaleString('ar-EG')} ج.م`);
    console.log(`🧵 إجمالي قيمة القماش: ${totalFabricValue.toLocaleString('ar-EG')} ج.م`);
    console.log('═══════════════════════════════════════════════════════════');
    
    console.log('\n✅ تم تسجيل جميع الأرصدة الافتتاحية بتاريخ 1/9/2026 بنجاح! 🎉');
    console.log('📊 الآن ستظهر في التقرير الشهري لشهر سبتمبر 2026\n');
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addOpeningBalancesWithDate();
