const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTransferItems() {
  console.log('🔧 تحديث بنية TransferItems...');
  
  try {
    // احذف كل TransferItems القديمة اللي مالهاش productId
    const deletedItems = await prisma.$executeRaw`
      DELETE FROM transfer_items 
      WHERE productId IS NULL OR productId = ''
    `;
    
    console.log(`🗑️ تم حذف ${deletedItems} عنصر قديم بدون productId`);
    
    // تحديث كل TransferItems الموجودة
    const updatedItems = await prisma.$executeRaw`
      UPDATE transfer_items 
      SET 
        status = COALESCE(status, 'PENDING'),
        notes = COALESCE(notes, NULL),
        quantityReceived = COALESCE(quantityReceived, NULL)
      WHERE status IS NULL OR status = ''
    `;
    
    console.log(`✅ تم تحديث ${updatedItems} عنصر`);
    
    // عرض إحصائيات
    const totalItems = await prisma.transferItem.count();
    const pendingItems = await prisma.transferItem.count({
      where: { status: 'PENDING' }
    });
    const deliveredItems = await prisma.transferItem.count({
      where: { status: 'DELIVERED' }
    });
    
    console.log('\n📊 الإحصائيات:');
    console.log(`- إجمالي العناصر: ${totalItems}`);
    console.log(`- قيد الانتظار: ${pendingItems}`);
    console.log(`- تم التسليم: ${deliveredItems}`);
    
    console.log('\n✅ تم التحديث بنجاح!');
  } catch (error) {
    console.error('❌ خطأ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateTransferItems();
