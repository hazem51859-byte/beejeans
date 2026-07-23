const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await prisma.user.findMany({
      include: {
        branch: true
      }
    });
    
    console.log(`Found ${users.length} users:\n`);
    
    for (const user of users) {
      console.log(`👤 Username: ${user.username}`);
      console.log(`   Name: ${user.fullName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Branch: ${user.branch?.name || 'N/A'}`);
      console.log(`   Active: ${user.isActive}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
