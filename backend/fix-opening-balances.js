const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOpeningBalances() {
  console.log('🔧 إصلاح الأرصدة الافتتاحية...\n');

  try {
    await prisma.$transaction(async (tx) => {
      // 1. حذف كل الفواتير الافتتاحية
      console.log('🗑️  حذف الفواتير الافتتاحية القديمة...');
      const deletedInvoices = await tx.officeInvoice.deleteMany({
        where: {
          notes: 'رصيد افتتاحي من الإكسل'
        }
      });
      console.log(`✅ تم حذف ${deletedInvoices.count} فاتورة افتتاحية\n`);

      // 2. إعادة تعيين رصيد المحفظة للعملاء
      console.log('💰 إعادة تعيين رصيد المحفظة...');
      
      // العملاء اللي ليهم فلوس (الأرصدة السالبة)
      const customersWithCredit = [
        { name: "هاني لافلي", walletBalance: 165 },
        { name: "ام احمد قنا", walletBalance: 240 },
        { name: "وائل شريف", walletBalance: 600 },
        { name: "ام صلاح السويس", walletBalance: 500 }
      ];

      for (const customerData of customersWithCredit) {
        const customer = await tx.customer.findFirst({
          where: { name: customerData.name }
        });

        if (customer) {
          await tx.customer.update({
            where: { id: customer.id },
            data: { walletBalance: customerData.walletBalance }
          });
        }
      }

      console.log(`✅ تم تحديث ${customersWithCredit.length} عميل لديهم رصيد محفظة\n`);

      // 3. تحديث ملاحظات العملاء الآخرين بدون إنشاء فواتير
      console.log('📝 تحديث ملاحظات العملاء...');
      
      const customerBalances = [
        { name: "اسامه السري دمياط", balance: 136465 },
        { name: "شنوده الفيوم", balance: 35040 },
        { name: "مكتب باسورد", balance: 4760 },
        { name: "مكتب فندي", balance: 9460 },
        { name: "علاء بدر", balance: 42620 },
        { name: "بوف", balance: 56495 },
        { name: "محمد عمر", balance: 30500 },
        { name: "ببلاوي", balance: 6920 },
        { name: "سامح زرزور", balance: 15020 },
        { name: "ام لي لي المنوفيه", balance: 77830 },
        { name: "زينب الباهي", balance: 71440 },
        { name: "احمد التركي العتبه", balance: 52480 },
        { name: "احمد يونس بني سويف", balance: 2000 },
        { name: "امجد اسيوط", balance: 3705 },
        { name: "احمد حسن فيصل", balance: 2730 },
        { name: "روماني", balance: 100945 },
        { name: "ناصر حكايه", balance: 340 },
        { name: "عماد بولاق", balance: 49830 },
        { name: "علاء صفط اللبن", balance: 29410 },
        { name: "عبير اكتوبر", balance: 19890 },
        { name: "ام مصطفي المنصوره", balance: 24260 },
        { name: "محمد محل انفنتي تبع بلحه", balance: 58525 },
        { name: "محلات Bee", balance: 2404775 },
        { name: "أم احمد الغرباوي منوف", balance: 600 },
        { name: "محمد حمدون الزقازيق", balance: 22090 },
        { name: "خالد زوينه طنطا", balance: 71205 },
        { name: "عبده", balance: 850 },
        { name: "هبه الاسماعليه محل بوبا", balance: 3250 },
        { name: "خالد المحله", balance: 11830 },
        { name: "جون ملاك الغردقه", balance: 7450 },
        { name: "احلام المنصوره", balance: 75 }
      ];

      let updatedCount = 0;
      for (const customerData of customerBalances) {
        const customer = await tx.customer.findFirst({
          where: { name: customerData.name }
        });

        if (customer) {
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              notes: `رصيد افتتاحي: ${customerData.balance.toLocaleString()} جنيه - سيتم احتسابه عند أول فاتورة`,
              walletBalance: 0 // تصفير المحفظة للعملاء المدينين
            }
          });
          updatedCount++;
        }
      }

      console.log(`✅ تم تحديث ${updatedCount} عميل بالأرصدة الافتتاحية\n`);
    });

    // عرض الملخص
    const totalCustomers = await prisma.customer.count();
    const customersWithWallet = await prisma.customer.count({
      where: { walletBalance: { gt: 0 } }
    });

    console.log('✅✅✅ تم إصلاح الأرصدة بنجاح! ✅✅✅\n');
    console.log('📊 الملخص:');
    console.log(`   👥 إجمالي العملاء: ${totalCustomers}`);
    console.log(`   💰 عملاء لديهم رصيد محفظة: ${customersWithWallet}`);
    console.log(`   📝 عملاء مدينين (ملاحظات فقط): ${totalCustomers - customersWithWallet}`);
    console.log('\n💡 ملاحظة: الأرصدة الافتتاحية موجودة في ملاحظات العملاء فقط');
    console.log('   وستحسب تلقائياً عند إنشاء أول فاتورة لكل عميل\n');

  } catch (error) {
    console.error('❌ حدث خطأ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
fixOpeningBalances()
  .catch((error) => {
    console.error('❌ فشل في تشغيل السكريبت:', error);
    process.exit(1);
  });
