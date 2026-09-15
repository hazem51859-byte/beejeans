const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Get the existing branch
    const branch = await prisma.branch.findFirst();
    
    if (!branch) {
      console.log('❌ لا يوجد فرع! يرجى إنشاء فرع أولاً');
      await prisma.$disconnect();
      return;
    }
    
    console.log('✅ الفرع الموجود:', branch.name);
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'المدير',
        fullName: 'المدير العام',
        email: 'admin@beejeans.com',
        role: 'ADMIN',
        branchId: branch.id,
        isActive: true
      }
    });
    
    console.log('✅ تم إنشاء اليوزر:', admin.username);
    console.log('\n📝 بيانات الدخول:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    await prisma.$disconnect();
  }
}

createAdmin();
