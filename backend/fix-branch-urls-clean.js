require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanBranchURLs() {
  try {
    console.log('Cleaning branch URLs...\n');
    
    const branches = await prisma.branch.findMany();
    
    let updatedCount = 0;
    
    for (const branch of branches) {
      let needsUpdate = false;
      let cleanUrl = branch.url;
      
      // Remove http://localhost:3000/branch/ prefix if exists
      if (branch.url && branch.url.includes('http://')) {
        cleanUrl = branch.url.replace(/^https?:\/\/[^\/]+\/branch\//, '');
        needsUpdate = true;
      }
      
      // Remove /branch/ prefix if exists
      if (cleanUrl && cleanUrl.startsWith('branch/')) {
        cleanUrl = cleanUrl.replace(/^branch\//, '');
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await prisma.branch.update({
          where: { id: branch.id },
          data: { url: cleanUrl }
        });
        
        console.log(`✅ ${branch.name}`);
        console.log(`   Before: ${branch.url}`);
        console.log(`   After: ${cleanUrl}`);
        console.log('');
        
        updatedCount++;
      }
    }
    
    if (updatedCount === 0) {
      console.log('✅ All URLs are already clean!');
    } else {
      console.log(`\n🎉 Updated ${updatedCount} branch(es)!`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanBranchURLs();
