const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  console.log('Checking user...');
  
  // Find user 'mohamed'
  const user = await prisma.user.findFirst({
    where: {
      username: 'mohamed'
    },
    include: {
      branch: true
    }
  });
  
  if (user) {
    console.log('👤 User Found:');
    console.log('Username:', user.username);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('Branch ID:', user.branchId);
    console.log('Branch Name:', user.branch?.name || 'N/A');
  } else {
    console.log('❌ User "mohamed" not found!');
  }
  
  console.log('\n📊 All users:');
  const allUsers = await prisma.user.findMany({
    include: {
      branch: {
        select: {
          name: true
        }
      }
    }
  });
  
  allUsers.forEach(u => {
    console.log(`- ${u.username} (${u.role}) - Branch: ${u.branch?.name || 'None'}`);
  });
  
  await prisma.$disconnect();
}

checkUser().catch(console.error);
