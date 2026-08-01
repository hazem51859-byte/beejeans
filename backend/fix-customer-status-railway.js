const { PrismaClient } = require('@prisma/client');

// Railway database
const railwayDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:jYrfaMNJbJuExJHgePjMhjkfeDoqYUFd@tokaido.proxy.rlwy.net:29985/railway'
    }
  }
});

async function fixCustomerStatus() {
  try {
    console.log('🔍 جاري البحث عن العميل "جازم منتصر"...');
    
    // Find customer
    const customer = await railwayDb.customer.findFirst({
      where: {
        name: { contains: 'جازم' }
      },
      include: {
        officeInvoices: {
          include: {
            payments: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      console.log('❌ العميل غير موجود!');
      return;
    }

    console.log(`\n📋 بيانات العميل: ${customer.name}`);
    console.log(`💰 الرصيد الحالي: ${customer.balance}`);
    console.log(`📄 عدد الفواتير: ${customer.officeInvoices.length}`);

    // Find the 28,800 invoice
    const targetInvoice = customer.officeInvoices.find(inv => 
      Math.abs(inv.totalAmount - 28800) < 1
    );

    if (!targetInvoice) {
      console.log('\n❌ لم يتم العثور على فاتورة 28,800 جنيه!');
      console.log('\nالفواتير الموجودة:');
      customer.officeInvoices.forEach(inv => {
        console.log(`  - ${inv.invoiceNumber}: ${inv.totalAmount} جنيه - الحالة: ${inv.status}`);
      });
      return;
    }

    console.log(`\n📄 الفاتورة: ${targetInvoice.invoiceNumber}`);
    console.log(`💵 المبلغ: ${targetInvoice.totalAmount}`);
    console.log(`📊 الحالة الحالية: ${targetInvoice.status}`);
    console.log(`💳 عدد الدفعات: ${targetInvoice.payments.length}`);

    // Check payments
    const totalPaid = targetInvoice.payments.reduce((sum, p) => sum + p.amount, 0);
    console.log(`💰 إجمالي المدفوع: ${totalPaid}`);

    if (targetInvoice.status === 'pending' && totalPaid >= targetInvoice.totalAmount) {
      console.log('\n✅ الفاتورة مدفوعة بالكامل لكن الحالة "معلق"! جاري التصليح...');
      
      // Update invoice status to paid
      await railwayDb.officeInvoice.update({
        where: { id: targetInvoice.id },
        data: { status: 'paid' }
      });

      console.log('✅ تم تحديث حالة الفاتورة إلى "مدفوع"');

      // Recalculate customer balance
      const allInvoices = await railwayDb.officeInvoice.findMany({
        where: { customerId: customer.id },
        include: { payments: true }
      });

      let correctBalance = 0;
      for (const inv of allInvoices) {
        const paidAmount = inv.payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = inv.totalAmount - paidAmount;
        correctBalance += remaining;
      }

      console.log(`\n💰 الرصيد الصحيح المحسوب: ${correctBalance}`);

      // Update customer balance
      await railwayDb.customer.update({
        where: { id: customer.id },
        data: { balance: correctBalance }
      });

      console.log('✅ تم تحديث رصيد العميل بنجاح!');

      // Verify
      const updated = await railwayDb.customer.findUnique({
        where: { id: customer.id }
      });

      console.log(`\n✅ النتيجة النهائية:`);
      console.log(`   الرصيد الجديد: ${updated.balance}`);
      
    } else {
      console.log('\n⚠️ الحالة:');
      console.log(`   - حالة الفاتورة: ${targetInvoice.status}`);
      console.log(`   - المبلغ المدفوع: ${totalPaid} من ${targetInvoice.totalAmount}`);
      
      if (totalPaid < targetInvoice.totalAmount) {
        console.log(`   - المتبقي: ${targetInvoice.totalAmount - totalPaid}`);
      }
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await railwayDb.$disconnect();
  }
}

fixCustomerStatus();
