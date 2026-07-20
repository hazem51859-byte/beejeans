const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء إنشاء البيانات الأساسية فقط...\n');

  // 1. التحقق من وجود الفروع (لا نغيرها)
  console.log('🏢 التحقق من الفروع الموجودة...');
  const branches = await prisma.branch.findMany();
  
  if (branches.length > 0) {
    console.log(`✓ تم العثور على ${branches.length} فرع موجود بالفعل`);
    branches.forEach(branch => {
      console.log(`  - ${branch.name} (${branch.code})`);
    });
  } else {
    console.log('⚠️  لا توجد فروع - يجب إضافة فروع أولاً');
  }
  console.log('');

  // 2. إنشاء مستخدم Admin فقط (إذا لم يكن موجوداً)
  console.log('👤 التحقق من مستخدم Admin...');
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // البحث عن الفرع الرئيسي
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });
    
    if (!mainBranch) {
      console.log('❌ لا يوجد فرع رئيسي (MAIN) - لا يمكن إنشاء Admin');
      console.log('   أضف فرع برمز MAIN أولاً');
    } else {
      await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@beejeans.com',
          password: hashedPassword,
          fullName: 'المدير العام',
          phone: '01000000000',
          role: 'ADMIN',
          isActive: true,
          branchId: mainBranch.id
        }
      });
      console.log('✓ تم إنشاء مستخدم Admin');
      console.log('  - Username: admin');
      console.log('  - Password: admin123');
    }
  } else {
    console.log('✓ مستخدم Admin موجود بالفعل');
    console.log('  - Username: admin');
  }
  console.log('');

  console.log('✅ تم إنشاء البيانات الأساسية فقط!\n');
  console.log('📊 الملخص:');
  console.log(`  - الفروع: ${branches.length} (تم الاحتفاظ بها كما هي)`);
  console.log('  - المستخدمين: 1 (admin)');
  console.log('  - الأصناف: 0 (فاضي)');
  console.log('  - المنتجات: 0 (فاضي)');
  console.log('  - المخزون: 0 (فاضي)\n');
  console.log('🚀 يمكنك الآن:');
  console.log('  1. تسجيل الدخول بـ: admin / admin123');
  console.log('  2. إضافة الأصناف من صفحة "الأصناف"');
  console.log('  3. البدء بالشراء من الموردين\n');
}

main()
  .catch((e) => {
    console.error('❌ حدث خطأ:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
