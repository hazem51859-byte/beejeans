const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      include: {
        _count: {
          select: { productSerials: true }
        }
      }
    });

    console.log('📦 جميع المنتجات:\n');
    for (const product of products) {
      console.log(`ID: ${product.id}`);
      console.log(`الاسم: ${product.name}`);
      console.log(`SKU: ${product.sku}`);
      console.log(`عدد السيريالات: ${product._count.productSerials}`);
      console.log(`totalPiecesProduced: ${product.totalPiecesProduced}`);
      console.log(`---\n`);
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
