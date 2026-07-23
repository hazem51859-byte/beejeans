const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransferStructure() {
  try {
    console.log('Checking transfer_items structure...\n');
    
    // Check if we can query transfer items
    const count = await prisma.transferItem.count();
    console.log(`Total transfer items in database: ${count}`);
    
    // Get a sample if exists
    if (count > 0) {
      const sample = await prisma.transferItem.findFirst({
        include: {
          transfer: true,
          product: true
        }
      });
      console.log('\nSample transfer item:', JSON.stringify(sample, null, 2));
    } else {
      console.log('\nNo transfer items found - safe to modify structure!');
    }
    
  } catch (error) {
    console.error('Error checking structure:', error.message);
    if (error.message.includes('categoryId')) {
      console.log('\n⚠️ Database still has old structure with categoryId!');
      console.log('✅ Migration script is ready to run in pgAdmin');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTransferStructure();
