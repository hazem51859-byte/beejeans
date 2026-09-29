const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function zeroRetailPrices() {
  try {
    console.log('🔄 تصفير أسعار القطاعي لجميع المنتجات...\n');

    const result = await prisma.product.updateMany({
      data: {
        retailPrice: 0
      }
    });

    console.log(`✅ تم تصفير سعر القطاعي لـ ${result.count} منتج\n`);
    console.log('🎉 تم بنجاح!');

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

zeroRetailPrices();
