require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBranchesURLs() {
  try {
    console.log('Fixing branches URLs...\n');
    
    // Get all branches
    const allBranches = await prisma.branch.findMany();
    
    // Filter those without URL
    const branches = allBranches.filter(b => !b.url || b.url === '');
    
    if (branches.length === 0) {
      console.log('✅ All branches already have URLs!');
      return;
    }
    
    console.log(`Found ${branches.length} branch(es) without URL\n`);
    
    for (const branch of branches) {
      // Generate URL from code or name
      let baseUrl = (branch.code || branch.name)
        .replace(/\s+/g, '-')
        .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
        .toLowerCase();
      
      // Ensure uniqueness
      let url = baseUrl;
      let counter = 1;
      
      while (await prisma.branch.findFirst({ where: { url } })) {
        url = `${baseUrl}-${counter}`;
        counter++;
      }
      
      // Update branch
      await prisma.branch.update({
        where: { id: branch.id },
        data: { url }
      });
      
      console.log(`✅ ${branch.name}`);
      console.log(`   Code: ${branch.code}`);
      console.log(`   URL: ${url}`);
      console.log('');
    }
    
    console.log('\n🎉 All branches updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixBranchesURLs();
