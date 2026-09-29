const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// بيانات الشركاء من الصورة
const partnersData = [
  { name: "عبدالرحمن", capital: 605064 },
  { name: "معتز", capital: 523132 },
  { name: "احمد المغسله", capital: 181217 },
  { name: "طارق", capital: 142624 },
  { name: "أ/ سيد علي رمضان", capital: 2368312 },
  { name: "سامح", capital: 509484 },
  { name: "محمود بيسو", capital: 1730897 },
  { name: "علي", capital: 144934 },
  { name: "رمضان عطا", capital: 120934 },
  { name: "عم شريف", capital: 643126 },
  { name: "عم سمير", capital: 234179 },
  { name: "علي عمر", capital: 120932 }
];

async function updatePartnersCapital() {
  try {
    console.log('🔄 تحديث رؤوس أموال الشركاء ونسبهم...\n');

    // حساب إجمالي رأس المال
    const totalCapital = partnersData.reduce((sum, p) => sum + p.capital, 0);
    console.log(`💰 إجمالي رأس المال: ${totalCapital.toLocaleString()} ج.م\n`);

    // حساب نسبة كل شريك
    const partnersWithPercentages = partnersData.map(p => ({
      ...p,
      percentage: (p.capital / totalCapital) * 100
    }));

    let updatedCount = 0;
    let createdCount = 0;

    for (const partnerData of partnersWithPercentages) {
      // البحث عن الشريك بالاسم
      const existingPartner = await prisma.partner.findFirst({
        where: { name: partnerData.name }
      });

      if (existingPartner) {
        // تحديث الشريك الموجود
        await prisma.partner.update({
          where: { id: existingPartner.id },
          data: {
            capitalPaid: partnerData.capital,
            sharePercentage: parseFloat(partnerData.percentage.toFixed(4)),
            isActive: true
          }
        });
        
        console.log(`✅ ${partnerData.name}`);
        console.log(`   رأس المال: ${partnerData.capital.toLocaleString()} ج.م`);
        console.log(`   النسبة: ${partnerData.percentage.toFixed(4)}%\n`);
        updatedCount++;
      } else {
        // إنشاء شريك جديد
        await prisma.partner.create({
          data: {
            name: partnerData.name,
            capitalPaid: partnerData.capital,
            sharePercentage: parseFloat(partnerData.percentage.toFixed(4)),
            isActive: true
          }
        });
        
        console.log(`🆕 ${partnerData.name} (جديد)`);
        console.log(`   رأس المال: ${partnerData.capital.toLocaleString()} ج.م`);
        console.log(`   النسبة: ${partnerData.percentage.toFixed(4)}%\n`);
        createdCount++;
      }
    }

    console.log('\n📊 الملخص:');
    console.log(`   ✅ تم تحديث ${updatedCount} شريك`);
    console.log(`   🆕 تم إضافة ${createdCount} شريك جديد`);
    console.log(`   💰 إجمالي رأس المال: ${totalCapital.toLocaleString()} ج.م`);
    
    // التحقق من أن مجموع النسب = 100%
    const totalPercentage = partnersWithPercentages.reduce((sum, p) => sum + p.percentage, 0);
    console.log(`   📊 مجموع النسب: ${totalPercentage.toFixed(2)}%`);

    console.log('\n🎉 تم التحديث بنجاح!');

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePartnersCapital();
