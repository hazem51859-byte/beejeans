const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const suppliers = await prisma.supplier.count();
    const products = await prisma.product.count();
    const sales = await prisma.sale.count();
    const customers = await prisma.customer.count();
    
    console.log('=== حالة قاعدة البيانات ===');
    console.log('عدد الموردين:', suppliers);
    console.log('عدد المنتجات:', products);
    console.log('عدد المبيعات:', sales);
    console.log('عدد العملاء:', customers);
    
    if (suppliers > 0) {
      console.log('\n✅ الداتا موجودة!');
      const sampleSuppliers = await prisma.supplier.findMany({ take: 3 });
      console.log('\nعينة من الموردين:', sampleSuppliers.map(s => s.name));
    } else {
      console.log('\n❌ قاعدة البيانات فاضية!');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('خطأ:', error.message);
    await prisma.$disconnect();
  }
}

checkData();
