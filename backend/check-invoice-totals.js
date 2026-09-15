const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvoiceTotals() {
  try {
    console.log('🔍 فحص مجاميع الفواتير...\n');

    // Get all office invoices
    const allInvoices = await prisma.officeInvoice.findMany({
      where: {
        status: { not: 'CANCELLED' }
      },
      include: {
        customer: {
          select: {
            name: true,
            walletBalance: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 إجمالي الفواتير: ${allInvoices.length}\n`);

    // تقسيم الفواتير
    const openingInvoices = allInvoices.filter(inv => inv.notes?.includes('رصيد افتتاحي'));
    const regularInvoices = allInvoices.filter(inv => !inv.notes?.includes('رصيد افتتاحي'));

    console.log(`🔵 فواتير افتتاحية: ${openingInvoices.length}`);
    console.log(`✅ فواتير عادية: ${regularInvoices.length}\n`);

    // حساب مجاميع الفواتير الافتتاحية
    const openingByType = {
      CLIENT: openingInvoices.filter(inv => inv.type === 'CLIENT'),
      REGULAR: openingInvoices.filter(inv => inv.type === 'REGULAR'),
      SHIPMENT: openingInvoices.filter(inv => inv.type === 'SHIPMENT')
    };

    console.log('📊 الفواتير الافتتاحية حسب النوع:');
    console.log(`   👤 CLIENT: ${openingByType.CLIENT.length} فاتورة`);
    console.log(`   🛒 REGULAR: ${openingByType.REGULAR.length} فاتورة`);
    console.log(`   📦 SHIPMENT: ${openingByType.SHIPMENT.length} فاتورة\n`);

    // حساب المجاميع
    const totalOpeningCLIENT = openingByType.CLIENT.reduce((sum, inv) => sum + inv.total, 0);
    const totalOpeningREGULAR = openingByType.REGULAR.reduce((sum, inv) => sum + inv.total, 0);
    const totalOpeningSHIPMENT = openingByType.SHIPMENT.reduce((sum, inv) => sum + inv.total, 0);
    const totalOpening = totalOpeningCLIENT + totalOpeningREGULAR + totalOpeningSHIPMENT;

    console.log('💰 مجاميع الفواتير الافتتاحية:');
    console.log(`   👤 CLIENT: ${totalOpeningCLIENT.toFixed(2)} ج.م`);
    console.log(`   🛒 REGULAR: ${totalOpeningREGULAR.toFixed(2)} ج.م`);
    console.log(`   📦 SHIPMENT: ${totalOpeningSHIPMENT.toFixed(2)} ج.م`);
    console.log(`   📊 الإجمالي: ${totalOpening.toFixed(2)} ج.م\n`);

    // حساب الرصيد المتبقي (المتبقي = total - paidAmount)
    const remainingCLIENT = openingByType.CLIENT.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const remainingREGULAR = openingByType.REGULAR.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const remainingSHIPMENT = openingByType.SHIPMENT.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const totalRemaining = remainingCLIENT + remainingREGULAR + remainingSHIPMENT;

    console.log('📈 الأرصدة المتبقية (المستحقة):');
    console.log(`   👤 CLIENT: ${remainingCLIENT.toFixed(2)} ج.م`);
    console.log(`   🛒 REGULAR: ${remainingREGULAR.toFixed(2)} ج.م`);
    console.log(`   📦 SHIPMENT: ${remainingSHIPMENT.toFixed(2)} ج.م`);
    console.log(`   📊 الإجمالي: ${totalRemaining.toFixed(2)} ج.م\n`);

    // حساب رصيد المحفظة للعملاء
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        walletBalance: true
      }
    });

    const totalWalletBalance = customers.reduce((sum, c) => sum + (c.walletBalance || 0), 0);
    const customersWithCredit = customers.filter(c => c.walletBalance < 0);
    const totalCredit = customersWithCredit.reduce((sum, c) => sum + Math.abs(c.walletBalance), 0);

    console.log('💳 رصيد المحفظة:');
    console.log(`   📊 إجمالي رصيد المحفظة: ${totalWalletBalance.toFixed(2)} ج.م`);
    console.log(`   🟢 عملاء ليهم فلوس: ${customersWithCredit.length} عميل`);
    console.log(`   💰 إجمالي الفلوس اللي ليهم: ${totalCredit.toFixed(2)} ج.م\n`);

    // حساب صافي الديون
    const netDebt = totalRemaining - totalCredit;

    console.log('🎯 الحساب النهائي:');
    console.log(`   📊 إجمالي الديون (المستحقة): ${totalRemaining.toFixed(2)} ج.م`);
    console.log(`   💳 رصيد المحفظة (فلوس للعملاء): ${totalCredit.toFixed(2)} ج.م`);
    console.log(`   ✅ صافي الديون: ${netDebt.toFixed(2)} ج.م\n`);

    // عرض تفاصيل أول 10 فواتير افتتاحية من نوع CLIENT
    console.log('📋 أول 10 فواتير افتتاحية من نوع CLIENT:');
    openingByType.CLIENT.slice(0, 10).forEach((inv, idx) => {
      console.log(`   ${idx + 1}. ${inv.customer?.name || 'غير معروف'}`);
      console.log(`      💰 الإجمالي: ${inv.total.toFixed(2)} ج.م`);
      console.log(`      ✅ المدفوع: ${inv.paidAmount.toFixed(2)} ج.م`);
      console.log(`      📈 المتبقي: ${inv.remainingAmount.toFixed(2)} ج.م`);
      console.log(`      💳 رصيد المحفظة: ${inv.customer?.walletBalance || 0} ج.م`);
    });

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoiceTotals();
