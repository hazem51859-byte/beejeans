const { execSync } = require('child_process');

console.log('\n🔧 تزامن Schema مع Railway...\n');

// Set Railway database URL
process.env.DATABASE_URL = "postgresql://postgres:jYrfaMNJbJuExJHgePjMhjkfeDoqYUFd@tokaido.proxy.rlwy.net:29985/railway";

console.log('📋 تشغيل Prisma Migrate Deploy على Railway...');
console.log('   سيتم تطبيق جميع الـ migrations الناقصة\n');

try {
  // Run prisma migrate deploy - applies all pending migrations
  const output = execSync('npx prisma migrate deploy', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('\n✅ تم تحديث Schema على Railway بنجاح!\n');
  console.log('📊 جميع الجداول والأعمدة متزامنة الآن\n');
  
} catch (error) {
  console.error('\n❌ خطأ في تحديث Schema:', error.message);
  process.exit(1);
}
