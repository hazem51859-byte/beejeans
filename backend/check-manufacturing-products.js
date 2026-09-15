const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkManufacturingProducts() {
  try {
    console.log('🔍 Checking Manufacturing Orders...\n');

    const orders = await prisma.manufacturingOrder.findMany({
      include: {
        supplier: true,
        fabricType: true,
        product: true
      },
      orderBy: { sentDate: 'desc' }
    });

    console.log(`📊 Total Orders: ${orders.length}\n`);

    orders.forEach((order, index) => {
      console.log(`Order ${index + 1}:`);
      console.log(`  Order Number: ${order.orderNumber}`);
      console.log(`  Product ID: ${order.productId || 'NULL'}`);
      console.log(`  Product Name: ${order.product?.name || 'غير محدد'}`);
      console.log(`  Supplier: ${order.supplier.name}`);
      console.log(`  Fabric: ${order.fabricType.name}`);
      console.log(`  Status: ${order.status}`);
      console.log('');
    });

    // Count orders without product
    const ordersWithoutProduct = orders.filter(o => !o.productId);
    console.log(`⚠️  Orders without product: ${ordersWithoutProduct.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkManufacturingProducts();
