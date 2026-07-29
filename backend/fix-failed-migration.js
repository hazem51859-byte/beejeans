/**
 * هذا السكريبت يحل مشكلة الـ migration الفاشلة في production
 * 
 * الاستخدام:
 * 1. غير DATABASE_URL في .env للـ production database
 * 2. شغل: node fix-failed-migration.js
 * 3. أرجع DATABASE_URL للـ local database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFailedMigration() {
  try {
    console.log('🔧 إصلاح الـ migration الفاشلة...\n');
    
    // التحقق من الـ migrations الموجودة
    console.log('📋 الـ migrations الحالية:');
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, started_at 
      FROM "_prisma_migrations" 
      ORDER BY started_at DESC 
      LIMIT 10;
    `;
    
    console.table(migrations);
    
    console.log('\n🗑️  حذف الـ migration الفاشلة...');
    
    // حذف الـ migration الفاشلة من جدول _prisma_migrations
    const result = await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations" 
      WHERE migration_name = '20260727132237_add_office_invoices_shipments';
    `;
    
    console.log(`✅ تم حذف ${result} سجل من جدول _prisma_migrations\n`);
    
    // التحقق من الـ migrations بعد الحذف
    console.log('📋 الـ migrations بعد الحذف:');
    const migrationsAfter = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM "_prisma_migrations" 
      ORDER BY started_at DESC 
      LIMIT 5;
    `;
    
    console.table(migrationsAfter);
    
    console.log('\n✅ الآن يمكنك إعادة deploy على Railway');
    console.log('📝 Railway سيحاول تشغيل الـ migrations من جديد بنجاح\n');
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
    
    if (error.code === 'P2010') {
      console.log('\n⚠️  Raw query failed. تأكد من أن DATABASE_URL صحيح في .env');
    }
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.log('\n⚠️  لا يمكن الاتصال بالـ database. تأكد من:');
      console.log('   1. DATABASE_URL صحيح في .env');
      console.log('   2. الـ database يعمل');
      console.log('   3. يمكنك الوصول للـ database من جهازك');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// التحذير قبل التشغيل
console.log('⚠️  تحذير: هذا السكريبت سيحذف سجل من production database');
console.log('تأكد من أن DATABASE_URL في .env يشير للـ production database\n');

fixFailedMigration();
