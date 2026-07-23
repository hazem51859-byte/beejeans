require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🔧 تشغيل Migration: simplify_transfer_items...\n');
  
  try {
    console.log('📋 حذف الجدول القديم...');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "transfer_items" CASCADE');
    console.log('✅ تم الحذف\n');
    
    console.log('📝 إنشاء الجدول الجديد...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "transfer_items" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "transferId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "quantityRequested" INTEGER NOT NULL,
          "quantityReceived" INTEGER,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "transfer_items_transferId_fkey" 
              FOREIGN KEY ("transferId") REFERENCES "transfers" ("id") 
              ON DELETE CASCADE ON UPDATE CASCADE,
          
          CONSTRAINT "transfer_items_productId_fkey" 
              FOREIGN KEY ("productId") REFERENCES "products" ("id") 
              ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    console.log('✅ تم الإنشاء\n');
    
    console.log('📊 إنشاء Indexes...');
    await prisma.$executeRawUnsafe('CREATE INDEX "transfer_items_transferId_idx" ON "transfer_items"("transferId")');
    await prisma.$executeRawUnsafe('CREATE INDEX "transfer_items_productId_idx" ON "transfer_items"("productId")');
    console.log('✅ تم إنشاء الـ Indexes\n');
    
    console.log('🎉 تم تطبيق الـ migration بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
