const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// بيانات الموردين من الصورة فقط
const suppliersData = [
  { name: "مصنع معتز", balance: 27000 },
  { name: "مغسله (عم معتز جديد)", balance: 75318 },
  { name: "مينا فوكس جينز", balance: -4905 },
  { name: "كلوبالي (تبع سامح)", balance: 15875 },
  { name: "شيكابالا", balance: 29685 },
  { name: "مغسله اورانج ابو محمود", balance: 0 },
  { name: "الرباعيه شيكات عم معتز", balance: 450000 }
];

async function resetSuppliersBalances() {
  try {
    console.log('🔄 إعادة تعيين أرصدة الموردين...\n');

    // 1. تصفير أرصدة جميع الموردين الموجودين
    await prisma.supplier.updateMany({
      data: { balance: 0 }
    });
    console.log('✅ تم تصفير أرصدة جميع الموردين\n');

    let createdCount = 0;
    let totalBalance = 0;

    // 2. تحديث/إضافة الموردين من القائمة
    for (const supplierData of suppliersData) {
      // البحث عن المورد
      const existing = await prisma.supplier.findFirst({
        where: { name: supplierData.name }
      });

      if (existing) {
        // تحديث المورد الموجود
        await prisma.supplier.update({
          where: { id: existing.id },
          data: {
            balance: supplierData.balance,
            isActive: true
          }
        });
      } else {
        // إضافة مورد جديد
        await prisma.supplier.create({
          data: {
            name: supplierData.name,
            balance: supplierData.balance,
            isActive: true,
            phone: '',
            email: null,
            address: null,
            taxNumber: null,
            paymentTerms: null,
            notes: null
          }
        });
      }
      
      const status = supplierData.balance > 0 ? '(دين علينا)' : 
                    supplierData.balance < 0 ? '(دين له)' : 
                    '(متصفر)';
      
      console.log(`✅ ${supplierData.name}`);
      console.log(`   الرصيد: ${supplierData.balance.toLocaleString()} ج.م ${status}\n`);
      createdCount++;
      totalBalance += supplierData.balance;
    }

    console.log('\n📊 الملخص:');
    console.log(`   🆕 تم إضافة ${createdCount} مورد`);
    console.log(`   💰 إجمالي الأرصدة: ${totalBalance.toLocaleString()} ج.م`);
    
    if (totalBalance > 0) {
      console.log(`   📝 صافي الديون علينا: ${totalBalance.toLocaleString()} ج.م`);
    }

    console.log('\n🎉 تم التحديث بنجاح!');

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetSuppliersBalances();
