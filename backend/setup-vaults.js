const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupVaults() {
  try {
    console.log('🔧 إعداد الخزائن...\n');

    // الخزائن المطلوبة
    const vaults = [
      { name: 'خزنة المكتب عبدالرحمن', type: 'CASH', description: 'الخزينة النقدية الرئيسية للمكتب' },
      { name: 'خزنة عم معتز', type: 'CASH', description: 'خزينة نقدية' },
      { name: 'خزنة مكتب روكسي', type: 'CASH', description: 'خزينة نقدية' },
      { name: 'فودافون كاش عبدالرحمن', type: 'WALLET', description: 'محفظة فودافون كاش' },
      { name: 'اتصالات كاش عبدالرحمن', type: 'WALLET', description: 'محفظة اتصالات كاش' },
      { name: 'فيزا عبدالرحمن', type: 'VISA', description: 'حساب فيزا' },
      { name: 'فيزا محمود', type: 'VISA', description: 'حساب فيزا' }
    ];

    // إنشاء الخزائن
    console.log('📦 إنشاء الخزائن...\n');
    const createdVaults = [];
    
    for (const vault of vaults) {
      const existing = await prisma.vault.findUnique({
        where: { name: vault.name }
      });

      if (existing) {
        console.log(`   ⚠️  ${vault.name} موجودة بالفعل`);
        createdVaults.push(existing);
      } else {
        const created = await prisma.vault.create({
          data: vault
        });
        console.log(`   ✅ تم إنشاء ${vault.name}`);
        createdVaults.push(created);
      }
    }

    // نقل الفلوس الموجودة إلى خزنة عبدالرحمن
    console.log('\n💰 نقل الأموال الموجودة إلى خزنة المكتب عبدالرحمن...\n');

    // البحث عن المخزن الرئيسي
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainBranch) {
      console.log('❌ المخزن الرئيسي غير موجود');
      return;
    }

    console.log(`   🏢 المخزن الرئيسي: ${mainBranch.name}`);
    console.log(`   💵 الرصيد الحالي: ${mainBranch.vaultBalance} جنيه\n`);

    if (mainBranch.vaultBalance > 0) {
      // خزنة عبدالرحمن
      const abdelrahmanVault = createdVaults.find(v => v.name === 'خزنة المكتب عبدالرحمن');

      if (abdelrahmanVault) {
        await prisma.$transaction(async (tx) => {
          // تحديث رصيد خزنة عبدالرحمن
          await tx.vault.update({
            where: { id: abdelrahmanVault.id },
            data: {
              balance: abdelrahmanVault.balance + mainBranch.vaultBalance
            }
          });

          // إنشاء معاملة لتسجيل النقل
          await tx.vaultTransaction.create({
            data: {
              vaultId: abdelrahmanVault.id,
              branchId: mainBranch.id,
              type: 'CASH_DEPOSIT',
              amount: mainBranch.vaultBalance,
              description: 'نقل الرصيد من النظام القديم إلى نظام الخزائن الجديد',
              notes: 'تحويل تلقائي عند إعداد نظام الخزائن',
              createdBy: 'SYSTEM',
              balanceBefore: abdelrahmanVault.balance,
              balanceAfter: abdelrahmanVault.balance + mainBranch.vaultBalance
            }
          });

          // تصفير رصيد المخزن القديم
          await tx.branch.update({
            where: { id: mainBranch.id },
            data: { vaultBalance: 0 }
          });
        });

        console.log(`   ✅ تم نقل ${mainBranch.vaultBalance} جنيه إلى خزنة المكتب عبدالرحمن`);
      }
    } else {
      console.log('   ℹ️  لا توجد أموال لنقلها (الرصيد = 0)');
    }

    // تحديث المعاملات القديمة
    console.log('\n🔄 تحديث المعاملات القديمة...\n');
    
    const oldTransactions = await prisma.vaultTransaction.findMany({
      where: {
        vaultId: null,
        branchId: mainBranch.id,
        description: {
          contains: 'فاتورة مكتب'
        }
      }
    });

    console.log(`   📊 وجد ${oldTransactions.length} معاملة من فواتير المكتب\n`);

    if (oldTransactions.length > 0) {
      const abdelrahmanVault = createdVaults.find(v => v.name === 'خزنة المكتب عبدالرحمن');
      
      for (const transaction of oldTransactions) {
        await prisma.vaultTransaction.update({
          where: { id: transaction.id },
          data: { vaultId: abdelrahmanVault.id }
        });
      }

      console.log(`   ✅ تم ربط ${oldTransactions.length} معاملة بخزنة المكتب عبدالرحمن`);
    }

    // عرض الخزائن النهائية
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('📊 الخزائن النهائية:\n');

    const finalVaults = await prisma.vault.findMany({
      orderBy: { name: 'asc' }
    });

    for (const vault of finalVaults) {
      const icon = vault.type === 'CASH' ? '💵' : vault.type === 'VISA' ? '💳' : '📱';
      console.log(`${icon} ${vault.name}`);
      console.log(`   النوع: ${vault.type}`);
      console.log(`   الرصيد: ${vault.balance.toFixed(2)} جنيه`);
      console.log(`   الحالة: ${vault.isActive ? 'نشط' : 'غير نشط'}\n`);
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ تم إعداد نظام الخزائن بنجاح!\n');

  } catch (error) {
    console.error('❌ خطأ في إعداد الخزائن:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupVaults();
