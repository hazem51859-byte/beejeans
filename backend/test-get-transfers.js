require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGetTransfers() {
  try {
    console.log('Testing getAllTransfers query...\n');
    
    // Simulate what the controller does
    const transfers = await prisma.transfer.findMany({
      include: {
        fromBranch: true,
        toBranch: true,
        sentByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        receivedByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('✅ Query successful!');
    console.log(`Found ${transfers.length} transfers`);
    
    if (transfers.length > 0) {
      console.log('\nFirst transfer:');
      console.log(JSON.stringify(transfers[0], null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testGetTransfers();
