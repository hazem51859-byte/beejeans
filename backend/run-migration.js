const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🔧 تشغيل Migration: simplify_transfer_items...\n');
  
  try {
    // قراءة ملف الـ migration
    const migrationPath = path.join(__dirname, 'prisma', 'migrations', '20260723120000_simplify_transfer_items', 'migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // تقسيم الأوامر
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 تنفيذ ${commands.length} أمر SQL...\n`);
    
    for (const command of commands) {
      try {
        await prisma.$executeRawUnsafe(command);
        console.log('✅', command.substring(0, 50) + '...');
      } catch (error) {
        console.error('❌', command.substring(0, 50) + '...');
        console.error('   Error:', error.message);
      }
    }
    
    // تسجيل الـ migration
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (
        '${Date.now()}',
        '',
        CURRENT_TIMESTAMP,
        '20260723120000_simplify_transfer_items',
        '',
        NULL,
        CURRENT_TIMESTAMP,
        1
      )
    `);
    
    console.log('\n✅ تم تطبيق الـ migration بنجاح!');
    
  } catch (error) {
    console.error('\n❌ خطأ في تطبيق الـ migration:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
