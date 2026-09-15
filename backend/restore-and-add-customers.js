const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// بيانات العملاء من الإكسل
const customers = [
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

async function restoreAndAddCustomers() {
  console.log('🔄 بدء عملية استرجاع البيانات وإضافة العملاء...\n');

  try {
    // قراءة ملف الـ backup
    const backupPath = path.join(__dirname, 'backup', 'database-backup-2026-07-30T18-45-52.json');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    await prisma.$transaction(async (tx) => {
      // 1. استرجاع الفروع
      console.log('📦 استرجاع الفروع...');
      if (backupData.branches && backupData.branches.length > 0) {
        let restoredCount = 0;
        for (const branch of backupData.branches) {
          // تحقق إذا الفرع موجود بالفعل
          const existing = await tx.branch.findFirst({
            where: {
              OR: [
                { id: branch.id },
                { code: branch.code }
              ]
            }
          });

          if (!existing) {
            await tx.branch.create({
              data: {
                id: branch.id,
                name: branch.name,
                code: branch.code,
                url: branch.url,
                address: branch.address,
                phone: branch.phone,
                city: branch.city,
                isActive: branch.isActive,
                vaultBalance: 0,
                cardVaultBalance: 0,
                walletBalance: 0
              }
            });
            restoredCount++;
          }
        }
        console.log(`✅ تم استرجاع ${restoredCount} فرع جديد (موجود بالفعل: ${backupData.branches.length - restoredCount})\n`);
      }

      // 2. استرجاع المستخدمين
      console.log('👥 استرجاع المستخدمين...');
      if (backupData.users && backupData.users.length > 0) {
        let restoredUserCount = 0;
        for (const user of backupData.users) {
          // تحقق إذا المستخدم موجود بالفعل
          const existing = await tx.user.findFirst({
            where: {
              OR: [
                { id: user.id },
                { username: user.username }
              ]
            }
          });

          if (!existing) {
            // تحقق إذا الفرع موجود
            let branchId = user.branchId;
            if (branchId) {
              const branchExists = await tx.branch.findUnique({
                where: { id: branchId }
              });
              if (!branchExists) {
                console.log(`⚠️  الفرع ${branchId} غير موجود للمستخدم ${user.username}، سيتم تعيين الفرع الرئيسي`);
                const mainBranch = await tx.branch.findFirst({
                  where: { code: 'MAIN' }
                });
                branchId = mainBranch ? mainBranch.id : null;
              }
            }

            await tx.user.create({
              data: {
                id: user.id,
                username: user.username,
                password: user.password,
                fullName: user.fullName || user.name || user.username,
                email: user.email || `${user.username}@system.local`,
                phone: user.phone || null,
                role: user.role,
                branchId: branchId,
                isActive: user.isActive
              }
            });
            restoredUserCount++;
          }
        }
        console.log(`✅ تم استرجاع ${restoredUserCount} مستخدم جديد (موجود بالفعل: ${backupData.users.length - restoredUserCount})\n`);
      }

      // 3. إضافة العملاء
      console.log('👨‍💼 إضافة العملاء من الإكسل...');
      let addedCount = 0;
      let customersWithNegativeBalance = 0;

      for (const customer of customers) {
        const balance = customer.balance;
        
        // لو الرصيد سالب، يبقى العميل ليه فلوس عندنا (walletBalance)
        // لو الرصيد موجب، يبقى العميل مدين لينا
        const walletBalance = balance < 0 ? Math.abs(balance) : 0;

        await tx.customer.create({
          data: {
            name: customer.name,
            phone: null,
            address: null,
            notes: balance < 0 ? `رصيد محفظة: ${Math.abs(balance)} جنيه (العميل له فلوس عندنا)` : null,
            isActive: true,
            walletBalance: walletBalance
          }
        });

        addedCount++;
        if (balance < 0) {
          customersWithNegativeBalance++;
        }
      }

      console.log(`✅ تم إضافة ${addedCount} عميل`);
      console.log(`   💰 عملاء لهم فلوس (رصيد سالب): ${customersWithNegativeBalance}`);
      console.log(`   📊 عملاء مدينين (رصيد موجب): ${addedCount - customersWithNegativeBalance}\n`);

      // حساب الإجماليات
      const totalPositive = customers.filter(c => c.balance > 0).reduce((sum, c) => sum + c.balance, 0);
      const totalNegative = customers.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);
      const netBalance = totalPositive - totalNegative;

      console.log('📊 ملخص الأرصدة:');
      console.log(`   💵 إجمالي الديون (العملاء المدينين): ${totalPositive.toLocaleString()} جنيه`);
      console.log(`   💰 إجمالي الفلوس للعملاء (رصيد محفظة): ${totalNegative.toLocaleString()} جنيه`);
      console.log(`   📈 صافي الرصيد: ${netBalance.toLocaleString()} جنيه\n`);
    });

    // عرض الإحصائيات النهائية
    const branchCount = await prisma.branch.count();
    const userCount = await prisma.user.count();
    const customerCount = await prisma.customer.count();

    console.log('✅✅✅ تمت العملية بنجاح! ✅✅✅\n');
    console.log('📊 الإحصائيات النهائية:');
    console.log(`   ✅ عدد الفروع: ${branchCount}`);
    console.log(`   ✅ عدد المستخدمين: ${userCount}`);
    console.log(`   ✅ عدد العملاء: ${customerCount}`);
    console.log('\n🎉 تم الانتهاء من العملية بنجاح!');

  } catch (error) {
    console.error('❌ حدث خطأ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
restoreAndAddCustomers()
  .catch((error) => {
    console.error('❌ فشل في تشغيل السكريبت:', error);
    process.exit(1);
  });
