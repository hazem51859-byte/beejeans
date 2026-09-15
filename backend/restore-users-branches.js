const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function restoreUsersAndBranches() {
  try {
    console.log('🔄 جاري استيراد اليوزرات والفروع...\n');

    // Create branches
    const branches = [
      {
        id: 'cm0q8kl5n0000s6n16e7bqoyn',
        code: 'MAIN',
        name: 'الفرع الرئيسي',
        url: 'http://localhost:5000',
        address: 'المقر الرئيسي',
        city: 'القاهرة',
        phone: '',
        vaultBalance: 0,
        cardVaultBalance: 0,
        walletBalance: 0,
        isActive: true
      }
    ];

    for (const branch of branches) {
      await prisma.branch.upsert({
        where: { id: branch.id },
        update: branch,
        create: branch
      });
      console.log('✅ تم إضافة الفرع:', branch.name);
    }

    // Create users
    const users = [
      {
        id: 'cm0q8kl5p0001s6n1kwvxhz4y',
        username: 'admin',
        password: '$2a$10$YourHashedPasswordHere', // سيتم تحديثه
        name: 'المدير',
        role: 'ADMIN',
        branchId: 'cm0q8kl5n0000s6n16e7bqoyn',
        isActive: true
      }
    ];

    // Hash password for admin (password: admin123)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    for (const user of users) {
      user.password = hashedPassword;
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user
      });
      console.log('✅ تم إضافة اليوزر:', user.username);
    }

    console.log('\n✅ تم الاستيراد بنجاح!');
    console.log('📝 بيانات الدخول:');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

restoreUsersAndBranches();
