const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOfficeVaultTransactions() {
  try {
    console.log('🔍 جاري فحص فواتير المكتب ومعاملات الخزينة...\n');

    // 1. Get all office invoices
    const officeInvoices = await prisma.officeInvoice.findMany({
      where: {
        type: { not: 'SHIPMENT' } // Exclude shipments
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log(`📊 وجد ${officeInvoices.length} فاتورة مكتب (غير شحن)\n`);

    // 2. Get main warehouse
    const mainWarehouse = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainWarehouse) {
      console.log('❌ المخزن الرئيسي غير موجود');
      return;
    }

    console.log(`🏢 المخزن الرئيسي: ${mainWarehouse.name} (ID: ${mainWarehouse.id})`);
    console.log(`💰 رصيد النقدي: ${mainWarehouse.vaultBalance.toFixed(2)} جنيه`);
    console.log(`💳 رصيد الفيزا: ${mainWarehouse.cardVaultBalance.toFixed(2)} جنيه`);
    console.log(`📱 رصيد المحفظة: ${mainWarehouse.walletBalance.toFixed(2)} جنيه\n`);

    // 3. Check vault transactions for office invoices
    const vaultTransactions = await prisma.vaultTransaction.findMany({
      where: {
        branchId: mainWarehouse.id,
        description: {
          contains: 'فاتورة مكتب'
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`💸 معاملات خزينة من فواتير المكتب: ${vaultTransactions.length}\n`);

    // 4. Analyze office invoices
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📋 تفاصيل فواتير المكتب:\n');

    let totalCash = 0;
    let totalCard = 0;
    let totalWallet = 0;
    let totalCredit = 0;
    let cashInvoicesCount = 0;
    let cardInvoicesCount = 0;
    let walletInvoicesCount = 0;
    let creditInvoicesCount = 0;

    for (const invoice of officeInvoices) {
      const hasVaultTransaction = vaultTransactions.some(vt => 
        vt.description.includes(invoice.invoiceNumber)
      );

      const vaultStatus = hasVaultTransaction ? '✅ في الخزينة' : '❌ غير موجود بالخزينة';
      
      console.log(`📄 ${invoice.invoiceNumber}`);
      console.log(`   التاريخ: ${invoice.createdAt.toLocaleString('ar-EG')}`);
      console.log(`   العميل: ${invoice.customerName || 'غير محدد'}`);
      console.log(`   الإجمالي: ${invoice.total.toFixed(2)} جنيه`);
      console.log(`   المدفوع: ${invoice.paidAmount.toFixed(2)} جنيه`);
      console.log(`   المتبقي: ${invoice.remainingAmount.toFixed(2)} جنيه`);
      console.log(`   طريقة الدفع: ${invoice.paymentMethod || 'غير محدد'}`);
      console.log(`   الحالة: ${invoice.status}`);
      console.log(`   ${vaultStatus}\n`);

      // Count by payment method
      if (invoice.paidAmount > 0) {
        if (invoice.paymentMethod === 'CASH') {
          totalCash += invoice.paidAmount;
          cashInvoicesCount++;
        } else if (invoice.paymentMethod === 'CARD') {
          totalCard += invoice.paidAmount;
          cardInvoicesCount++;
        } else if (invoice.paymentMethod === 'WALLET') {
          totalWallet += invoice.paidAmount;
          walletInvoicesCount++;
        } else if (invoice.paymentMethod === 'CREDIT') {
          totalCredit += invoice.paidAmount;
          creditInvoicesCount++;
        }
      }
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 ملخص الفواتير حسب طريقة الدفع:\n');
    console.log(`💵 نقدي: ${totalCash.toFixed(2)} جنيه (${cashInvoicesCount} فاتورة)`);
    console.log(`💳 فيزا: ${totalCard.toFixed(2)} جنيه (${cardInvoicesCount} فاتورة)`);
    console.log(`📱 محفظة: ${totalWallet.toFixed(2)} جنيه (${walletInvoicesCount} فاتورة)`);
    console.log(`📝 آجل: ${totalCredit.toFixed(2)} جنيه (${creditInvoicesCount} فاتورة)\n`);

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('💸 معاملات الخزينة من فواتير المكتب:\n');

    let cashFromVault = 0;
    let cardFromVault = 0;
    let walletFromVault = 0;

    for (const vt of vaultTransactions) {
      console.log(`${vt.type === 'CASH_DEPOSIT' ? '💵' : vt.type === 'CARD_PAYMENT' ? '💳' : '📱'} ${vt.description}`);
      console.log(`   المبلغ: ${vt.amount.toFixed(2)} جنيه`);
      console.log(`   التاريخ: ${vt.createdAt.toLocaleString('ar-EG')}`);
      console.log(`   رصيد قبل: ${vt.balanceBefore.toFixed(2)} → بعد: ${vt.balanceAfter.toFixed(2)}\n`);

      if (vt.type === 'CASH_DEPOSIT') {
        cashFromVault += vt.amount;
      } else if (vt.type === 'CARD_PAYMENT') {
        cardFromVault += vt.amount;
      } else if (vt.type === 'WALLET_PAYMENT') {
        walletFromVault += vt.amount;
      }
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🔍 المقارنة:\n');
    console.log(`💵 نقدي - في الفواتير: ${totalCash.toFixed(2)} | في الخزينة: ${cashFromVault.toFixed(2)} | الفرق: ${(totalCash - cashFromVault).toFixed(2)}`);
    console.log(`💳 فيزا - في الفواتير: ${totalCard.toFixed(2)} | في الخزينة: ${cardFromVault.toFixed(2)} | الفرق: ${(totalCard - cardFromVault).toFixed(2)}`);
    console.log(`📱 محفظة - في الفواتير: ${totalWallet.toFixed(2)} | في الخزينة: ${walletFromVault.toFixed(2)} | الفرق: ${(totalWallet - walletFromVault).toFixed(2)}\n`);

    if (totalCash > cashFromVault || totalCard > cardFromVault || totalWallet > walletFromVault) {
      console.log('⚠️  يوجد فواتير مدفوعة ولكن غير مسجلة في الخزينة!\n');
    } else {
      console.log('✅ كل الفواتير مسجلة بشكل صحيح في الخزينة\n');
    }

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOfficeVaultTransactions();
