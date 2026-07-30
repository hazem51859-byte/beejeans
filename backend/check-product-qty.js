const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { sku: '1001' },
    include: {
      inventory: {
        include: { branch: { select: { name: true, code: true } } }
      }
    }
  });

  console.log('المنتج:', product.name);
  console.log('totalPiecesProduced:', product.totalPiecesProduced);
  console.log('\nالمخزون في كل فرع:');
  product.inventory.forEach(inv => {
    console.log(`  - ${inv.branch.name} (${inv.branch.code}): ${inv.quantity}`);
  });

  const total = product.inventory.reduce((s, i) => s + i.quantity, 0);
  console.log('\nالإجمالي في كل الفروع:', total);

  await prisma.$disconnect();
}

main();
