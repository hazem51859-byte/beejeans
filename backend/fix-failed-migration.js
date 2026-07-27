/**
 * هذا السكريبت يحل مشكلة الـ migration الفاشلة في production
 * يجب تشغيله مرة واحدة فقط على production database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFailedMigration() {
  try {
    console.log('🔧 إصلاح الـ migration الفاشلة...\n');
    
    // حذف الـ migration الفاشلة من جدول _prisma_migrations
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations" 
      WHERE migration_name = '20260727132237_add_office_invoices_shipments';
    `);
    
    console.log(`✅ تم حذف الـ migration الفاشلة`);
    console.log(`   عدد السجلات المحذوفة: ${result}\n`);
    
    console.log('✅ الآن يمكنك إعادة deploy على Railway\n');
    console.log('📝 ملاحظة: الجداول موجودة بالفعل في الـ database من المحاولة السابقة');
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
    
    if (error.code === 'P2010') {
      console.log('\n⚠️  Raw query failed. تأكد من أن DATABASE_URL موجود في .env');
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixFailedMigration();
