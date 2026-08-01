const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:jYrfaMNJbJuExJHgePjMhjkfeDoqYUFd@tokaido.proxy.rlwy.net:29985/railway'
    }
  }
});

async function listCustomers() {
  try {
    const customers = await db.customer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\nعدد العملاء على Railway: ${customers.length}\n`);
    
    customers.forEach((c, i) => {
      console.log(`${i+1}. ${c.name} - رصيد: ${c.balance}`);
    });

  } catch (error) {
    console.error('خطأ:', error.message);
  } finally {
    await db.$disconnect();
  }
}

listCustomers();
