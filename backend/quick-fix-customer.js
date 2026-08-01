const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:jYrfaMNJbJuExJHgePjMhjkfeDoqYUFd@tokaido.proxy.rlwy.net:29985/railway'
    }
  },
  log: ['query', 'info', 'warn', 'error']
});

async function fix() {
  try {
    console.log('البحث عن العميل...');
    
    const customer = await db.customer.findFirst({
      where: { name: { contains: 'حازم' } }
    });

    if (!customer) {
      console.log('العميل غير موجود');
      await db.$disconnect();
      return;
    }

    console.log(`العميل: ${customer.name}`);
    console.log(`الرصيد الحالي: ${customer.balance}`);

    // Get all invoices and payments
    const invoices = await db.officeInvoice.findMany({
      where: { customerId: customer.id },
      include: { payments: true }
    });

    console.log(`عدد الفواتير: ${invoices.length}`);

    // Calculate correct balance
    let correctBalance = 0;
    for (const inv of invoices) {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const remaining = inv.totalAmount - paid;
      
      console.log(`فاتورة ${inv.invoiceNumber}: ${inv.totalAmount} - مدفوع: ${paid} - متبقي: ${remaining} - حالة: ${inv.status}`);
      
      // Update status if fully paid but marked pending
      if (remaining <= 0 && inv.status === 'pending') {
        await db.officeInvoice.update({
          where: { id: inv.id },
          data: { status: 'paid' }
        });
        console.log(`  ✅ تم تحديث الحالة إلى مدفوع`);
      }
      
      correctBalance += remaining;
    }

    console.log(`\nالرصيد الصحيح: ${correctBalance}`);

    // Update customer balance
    await db.customer.update({
      where: { id: customer.id },
      data: { balance: correctBalance }
    });

    console.log('✅ تم التحديث بنجاح');

  } catch (error) {
    console.error('خطأ:', error.message);
  } finally {
    await db.$disconnect();
  }
}

fix();
