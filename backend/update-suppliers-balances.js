const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// بيانات الموردين من الصورة
// رقم موجب = المورد ليه فلوس عندنا (دين علينا)
// رقم سالب = احنا لينا فلوس عنده (دين له)
const suppliersData = [
  { name: "مصنع معتز", balance: 27000 },
  { name: "مغسله (عم معتز جديد)", balance: 75318 },
  { name: "مينا فوكس جينز", balance: -4905 },
  { name: "كلوبالي (تبع سامح)", balance: 15875 },
  { name: "شيكابالا", balance: 29685 },
  { name: "مغسله اورانج ابو محمود", balance: 0 },
  { name: "الرباعيه شيكات عم معتز", balance: 450000 }
];

async function updateSuppliersBalances() {
  try {
    console.log('🔄 تحديث أرصدة الموردين...\n');

    // 1. تصفير جميع أرصدة الموردين الموجودين
    await prisma.supplier.updateMany({
      data: { balance: 0 }
    });
    console.log('✅ تم تصفير جميع أرصدة الموردين الموجودين\n');

    let createdCount = 0;
    let updatedCount = 0;
    let totalBalance = 0;

    for (const supplierData of suppliersData) {
      // البحث عن المورد بالاسم
      const existingSupplier = await prisma.supplier.findFirst({
        where: { name: supplierData.name }
      });

      if (existingSupplier) {
        // تحديث المورد الموجود
        await prisma.supplier.update({
          where: { id: existingSupplier.id },
          data: {
            balance: supplierData.balance,
            isActive: true
          }
        });
        
        const status = supplierData.balance > 0 ? '(دين علينا)' : 
                      supplierData.balance < 0 ? '(دين له)' : 
                      '(متصفر)';
        
        console.log(`✅ ${supplierData.name}`);
        console.log(`   الرصيد: ${supplierData.balance.toLocaleString()} ج.م ${status}\n`);
        updatedCount++;
      } else {
        // إنشاء مورد جديد
        await prisma.supplier.create({
          data: {
            name: supplierData.name,
            balance: supplierData.balance,
            isActive: true,
            // الحقول الإلزامية الأخرى
            phone: '',
            email: null,
            address: null,
            taxNumber: null,
            paymentTerms: null,
            notes: null
          }
        });
        
        const status = supplierData.balance > 0 ? '(دين علينا)' : 
                      supplierData.balance < 0 ? '(دين له)' : 
                      '(متصفر)';
        
        console.log(`🆕 ${supplierData.name} (جديد)`);
        console.log(`   الرصيد: ${supplierData.balance.toLocaleString()} ج.م ${status}\n`);
        createdCount++;
      }

      totalBalance += supplierData.balance;
    }

    console.log('\n📊 الملخص:');
    console.log(`   ✅ تم تحديث ${updatedCount} مورد`);
    console.log(`   🆕 تم إضافة ${createdCount} مورد جديد`);
    console.log(`   💰 إجمالي الأرصدة: ${totalBalance.toLocaleString()} ج.م`);
    
    if (totalBalance > 0) {
      console.log(`   📝 إجمالي الديون علينا: ${totalBalance.toLocaleString()} ج.م`);
    } else if (totalBalance < 0) {
      console.log(`   📝 إجمالي الديون لنا: ${Math.abs(totalBalance).toLocaleString()} ج.م`);
    } else {
      console.log(`   ✅ الأرصدة متوازنة`);
    }

    console.log('\n📌 ملاحظة:');
    console.log('   • رقم موجب = المورد ليه فلوس عندنا (دين علينا)');
    console.log('   • رقم سالب = احنا لينا فلوس عنده (دين له)');

    console.log('\n🎉 تم التحديث بنجاح!');

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSuppliersBalances();
