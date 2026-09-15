const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCustomers() {
  try {
    console.log('🔍 جميع العملاء المسجلين:\n');
    
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
    });
    
    if (customers.length === 0) {
      console.log('❌ لا يوجد عملاء في النظام');
      return;
    }
    
    console.log(`✅ تم العثور على ${customers.length} عميل:\n`);
    
    for (const customer of customers) {
      console.log(`📋 ${customer.name}`);
      console.log(`   الهاتف: ${customer.phone || 'غير محدد'}`);
      console.log(`   ID: ${customer.id}`);
      
      // عدد الفواتير
      const salesCount = await prisma.sale.count({
        where: { customerId: customer.id }
      });
      
      const officeInvoicesCount = await prisma.officeInvoice.count({
        where: { customerId: customer.id, status: { not: 'CANCELLED' } }
      });
      
      console.log(`   فواتير التقسيط: ${salesCount}`);
      console.log(`   فواتير المكتب: ${officeInvoicesCount}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listCustomers();
