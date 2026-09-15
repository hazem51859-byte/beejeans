const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAll() {
  try {
    const branches = await prisma.branch.count();
    const users = await prisma.user.count();
    const suppliers = await prisma.supplier.count();
    const products = await prisma.product.count();
    
    console.log('=== كل البيانات ===');
    console.log('الفروع:', branches);
    console.log('اليوزرات:', users);
    console.log('الموردين:', suppliers);
    console.log('المنتجات:', products);
    
    if (branches > 0) {
      const branchList = await prisma.branch.findMany();
      console.log('\nالفروع:', branchList.map(b => b.name));
    }
    
    if (users > 0) {
      const userList = await prisma.user.findMany();
      console.log('\nاليوزرات:', userList.map(u => u.username));
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('خطأ:', error.message);
    await prisma.$disconnect();
  }
}

checkAll();
