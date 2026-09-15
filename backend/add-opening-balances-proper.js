const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// بيانات العملاء من الإكسل
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
  { name: "مكتب براند ايمن العتبه", balance: 0 },
  { name: "هاني لافلي", balance: -165 },
  { name: "زينب الباهي", balance: 71440 },
  { name: "احمد التركي العتبه", balance: 52480 },
  { name: "كرليس الاقصر", balance: 0 },
  { name: "احمد يونس بني سويف", balance: 2000 },
  { name: "امجد اسيوط", balance: 3705 },
  { name: "احمد حسن فيصل", balance: 2730 },
  { name: "روماني", balance: 100945 },
  { name: "ناصر حكايه", balance: 340 },
  { name: "سامح كازابلانكا", balance: 0 },
  { name: "عماد بولاق", balance: 49830 },
  { name: "عبدالسميع بلطيم", balance: 0 },
  { name: "علاء صفط اللبن", balance: 29410 },
  { name: "عبير اكتوبر", balance: 19890 },
  { name: "محمد علاء محل فتحه خير", balance: 0 },
  { name: "بيتر المنيا", balance: 0 },
  { name: "ام مصطفي المنصوره", balance: 24260 },
  { name: "محمد محل انفنتي تبع بلحه", balance: 58525 },
  { name: "مجدي حكيم اسيوط", balance: 0 },
  { name: "احمد المحله", balance: 0 },
  { name: "محلات Bee", balance: 2404775 },
  { name: "اسلام شعراوي امبابه", balance: 0 },
  { name: "عبدالرحمن محل شي براند اسكندريه", balance: 0 },
  { name: "أم احمد الغرباوي منوف", balance: 600 },
  { name: "ام احمد قنا", balance: -240 },
  { name: "اسراء النادي", balance: 0 },
  { name: "محمد حمدون الزقازيق", balance: 22090 },
  { name: "خالد زوينه طنطا", balance: 71205 },
  { name: "محمد مجدي", balance: 0 },
  { name: "علاء المرج", balance: 0 },
  { name: "احمد البشوات المحله", balance: 0 },
  { name: "عبده", balance: 850 },
  { name: "هبه الاسماعليه محل بوبا", balance: 3250 },
  { name: "خالد المحله", balance: 11830 },
  { name: "جون ملاك الغردقه", balance: 7450 },
  { name: "احلام المنصوره", balance: 75 },
  { name: "وائل شريف", balance: -600 },
  { name: "ام صلاح السويس", balance: -500 }
];

async function addOpeningBalances() {
  console.log('💰 إضافة الأرصدة الافتتاحية بشكل صحيح...\n');

  try {
    // الحصول على المخزن الرئيسي والمستخدم
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainBranch) {
      throw new Error('المخزن الرئيسي (MAIN) غير موجود!');
    }

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      throw new Error('لا يوجد مستخدم أدمن!');
    }

    let processedCount = 0;
    let positiveBalances = 0;
    let negativeBalances = 0;
    let totalPositive = 0;
    let totalNegative = 0;

    await prisma.$transaction(async (tx) => {
      for (const customerData of customerBalances) {
        const customer = await tx.customer.findFirst({
          where: { name: customerData.name }
        });

        if (!customer) {
          console.log(`⚠️  العميل "${customerData.name}" غير موجود`);
          continue;
        }

        const balance = customerData.balance;

        if (balance === 0) {
          continue;
        }

        if (balance > 0) {
          // العميل مدين لينا - نعمل فاتورة مكتب بدون تكلفة
          const invoiceNumber = `OPEN-${Date.now()}-${customer.id.substring(0, 8)}`;
          
          await tx.officeInvoice.create({
            data: {
              invoiceNumber: invoiceNumber,
              type: 'REGULAR',
              customerId: customer.id,
              customerName: customer.name,
              customerPhone: customer.phone,
              subtotal: balance,
              discountAmount: 0,
              total: balance,
              totalCost: 0, // بدون تكلفة - افتتاحي فقط
              profit: 0,     // بدون ربح - افتتاحي فقط
              paymentMethod: 'CREDIT',
              paidAmount: 0,
              remainingAmount: balance,
              status: 'PENDING',
              notes: '🔵 رصيد افتتاحي - لا يحسب في التكاليف والأرباح',
              createdBy: adminUser.id
            }
          });

          positiveBalances++;
          totalPositive += balance;
        } else {
          // العميل ليه فلوس عندنا
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              walletBalance: Math.abs(balance),
              notes: `💰 رصيد محفظة افتتاحي: ${Math.abs(balance).toLocaleString()} جنيه`
            }
          });

          negativeBalances++;
          totalNegative += Math.abs(balance);
        }

        processedCount++;
      }
    });

    console.log('✅✅✅ تمت إضافة الأرصدة بنجاح! ✅✅✅\n');
    console.log('📊 الإحصائيات:');
    console.log(`   ✅ عدد العملاء المعالجين: ${processedCount}`);
    console.log(`   📈 عملاء مدينين (فواتير افتتاحية): ${positiveBalances}`);
    console.log(`   💰 عملاء لهم فلوس (محفظة): ${negativeBalances}`);
    console.log(`\n💵 الإجماليات:`);
    console.log(`   📈 إجمالي الديون: ${totalPositive.toLocaleString()} جنيه`);
    console.log(`   💰 إجمالي المحفظة: ${totalNegative.toLocaleString()} جنيه`);
    console.log(`   📊 صافي الرصيد: ${(totalPositive - totalNegative).toLocaleString()} جنيه`);
    console.log('\n✅ الفواتير الافتتاحية لن تحسب في التكاليف أو الأرباح');
    console.log('✅ الفواتير الجديدة ستحسب بشكل طبيعي\n');

  } catch (error) {
    console.error('❌ حدث خطأ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
addOpeningBalances()
  .catch((error) => {
    console.error('❌ فشل في تشغيل السكريبت:', error);
    process.exit(1);
  });
