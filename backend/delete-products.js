const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteProducts() {
  try {
    await prisma.product.deleteMany({});
    console.log('✅ All products deleted');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteProducts();
