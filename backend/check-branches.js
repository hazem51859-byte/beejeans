const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBranches() {
  const branches = await prisma.branch.findMany();
  console.log('الفروع الموجودة:');
  branches.forEach(b => {
    console.log(`- ${b.name} (${b.code}) - ID: ${b.id}`);
  });
  await prisma.$disconnect();
}

checkBranches();
