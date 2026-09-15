const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOsamaInvoice() {
  try {
    console.log('🔍 البحث عن فواتير أسامة السري...\n');
    
    // البحث عن العميل
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { name: { contains: 'اسامة', mode: 'insensitive' } },
          { name: { contains: 'اسامه', mode: 'insensitive' } }
        ]
      }
    });
    
    if (!customer) {
      console.log('❌ لم يتم العثور على العميل "أسامة السري"');
      return;
    }
    
    console.log('✅ تم العثور على العميل:');
    console.log(`   الاسم: ${customer.name}`);
    console.log(`   الهاتف: ${customer.phone || 'غير محدد'}`);
    console.log(`   ID: ${customer.id}\n`);
    
    // جلب فواتير التقسيط
    const sales = await prisma.sale.findMany({
      where: { customerId: customer.id },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📋 فواتير التقسيط: ${sales.length} فاتورة`);
    sales.forEach((sale, idx) => {
      console.log(`\n   ${idx + 1}. ${sale.invoiceNumber}`);
      console.log(`      التاريخ: ${new Date(sale.createdAt).toLocaleString('ar-EG')}`);
      console.log(`      الإجمالي: ${sale.total.toFixed(2)} ج.م`);
      console.log(`      المدفوع: ${sale.amountPaid.toFixed(2)} ج.م`);
      console.log(`      المتبقي: ${(sale.total - sale.amountPaid).toFixed(2)} ج.م`);
    });
    
    // جلب فواتير المكتب
    const officeInvoices = await prisma.officeInvoice.findMany({
      where: { 
        customerId: customer.id,
        status: { not: 'CANCELLED' }
      },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📋 فواتير المكتب: ${officeInvoices.length} فاتورة`);
    officeInvoices.forEach((invoice, idx) => {
      const typeLabel = 
        invoice.type === 'REGULAR' ? 'زبون عادي' :
        invoice.type === 'SHIPMENT' ? 'شحن' :
        invoice.type === 'CLIENT' ? 'عميل دائم' : invoice.type;
      
      console.log(`\n   ${idx + 1}. ${invoice.invoiceNumber} (${typeLabel})`);
      console.log(`      التاريخ: ${new Date(invoice.createdAt).toLocaleString('ar-EG')}`);
      console.log(`      الإجمالي: ${invoice.total.toFixed(2)} ج.م`);
      console.log(`      المدفوع: ${invoice.paidAmount.toFixed(2)} ج.م`);
      console.log(`      المتبقي: ${invoice.remainingAmount.toFixed(2)} ج.م`);
      console.log(`      الحالة: ${invoice.status}`);
    });
    
    // جلب الدفعات
    const payments = await prisma.customerPayment.findMany({
      where: { customerId: customer.id },
      orderBy: { paymentDate: 'desc' }
    });
    
    console.log(`\n💰 الدفعات: ${payments.length} دفعة`);
    payments.forEach((payment, idx) => {
      console.log(`\n   ${idx + 1}. ${payment.amount.toFixed(2)} ج.م`);
      console.log(`      التاريخ: ${new Date(payment.paymentDate).toLocaleString('ar-EG')}`);
      console.log(`      الطريقة: ${payment.paymentMethod}`);
      if (payment.notes) console.log(`      ملاحظات: ${payment.notes}`);
    });
    
    // الإجماليات
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalPaidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);
    const totalOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaidOnOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    
    const balance = totalSales + totalOfficeInvoices - totalPaidOnSales - totalPaidOnOfficeInvoices - totalPayments;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 ملخص الحساب:');
    console.log('='.repeat(50));
    console.log(`إجمالي فواتير التقسيط: ${totalSales.toFixed(2)} ج.م`);
    console.log(`إجمالي فواتير المكتب: ${totalOfficeInvoices.toFixed(2)} ج.م`);
    console.log(`إجمالي المبيعات: ${(totalSales + totalOfficeInvoices).toFixed(2)} ج.م`);
    console.log(`المدفوع على التقسيط: ${totalPaidOnSales.toFixed(2)} ج.م`);
    console.log(`المدفوع على فواتير المكتب: ${totalPaidOnOfficeInvoices.toFixed(2)} ج.م`);
    console.log(`الدفعات المسجلة: ${totalPayments.toFixed(2)} ج.م`);
    console.log(`إجمالي المدفوع: ${(totalPaidOnSales + totalPaidOnOfficeInvoices + totalPayments).toFixed(2)} ج.م`);
    console.log(`الرصيد المتبقي: ${balance.toFixed(2)} ج.م`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOsamaInvoice();
