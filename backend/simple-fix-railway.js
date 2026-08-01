const { PrismaClient } = require('@prisma/client');

const railway = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:jYrfaMNJbJuExJHgePjMhjkfeDoqYUFd@tokaido.proxy.rlwy.net:29985/railway' }}
});

async function main() {
  console.log('🔌 الاتصال...');
  
  const customers = await railway.customer.findMany();
  console.log(`العملاء: ${customers.length}`);
  
  for (const c of customers) {
    console.log(`\n${c.name}:`);
    
    const invoices = await railway.officeInvoice.findMany({
      where: { customerId: c.id }
    });
    
    console.log(`  الفواتير: ${invoices.length}`);
    
    let balance = 0;
    for (const inv of invoices) {
      const payments = await railway.payment.findMany({
        where: { officeInvoiceId: inv.id }
      });
      
      const paid = payments.reduce((s, p) => s + p.amount, 0);
      const remaining = inv.totalAmount - paid;
      balance += remaining;
      
      console.log(`    ${inv.invoiceNumber}: ${inv.totalAmount} - ${paid} = ${remaining} (${inv.status})`);
      
      // Fix status
      if (remaining <= 0 && inv.status === 'pending') {
        await railway.officeInvoice.update({
          where: { id: inv.id },
          data: { status: 'paid' }
        });
        console.log(`      ✅ حالة -> مدفوع`);
      }
    }
    
    console.log(`  الرصيد الصحيح: ${balance}`);
    
    await railway.customer.update({
      where: { id: c.id },
      data: { balance }
    });
    
    console.log(`  ✅ تم التحديث`);
  }
  
  await railway.$disconnect();
  console.log('\n✅ انتهى');
}

main().catch(console.error);
