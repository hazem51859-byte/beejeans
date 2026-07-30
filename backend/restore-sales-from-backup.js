const fs = require('fs');
const prisma = require('./src/config/database');

async function restoreSalesFromBackup() {
  try {
    console.log('Reading latest backup...\n');
    
    const backupData = JSON.parse(
      fs.readFileSync('./backup/full-database-export-2026-07-27T17-46-19-509Z.json', 'utf8')
    );

    console.log('Backup contents:');
    console.log(`  Sales: ${backupData.sales?.length || 0}`);
    console.log(`  Sale Items: ${backupData.saleItems?.length || 0}`);
    console.log(`  Products: ${backupData.products?.length || 0}`);
    console.log(`  Branches: ${backupData.branches?.length || 0}`);
    console.log('');

    // Count current sales
    const currentSales = await prisma.sale.count();
    console.log(`Current sales in DB: ${currentSales}\n`);

    if (backupData.sales && backupData.sales.length > 0) {
      console.log('Sample sales from backup:');
      backupData.sales.slice(0, 5).forEach(sale => {
        console.log(`  Sale ${sale.id}:`);
        console.log(`    Branch: ${sale.branchId}`);
        console.log(`    Total: ${sale.total}`);
        console.log(`    Status: ${sale.status}`);
        console.log(`    Date: ${sale.createdAt}`);
      });
      console.log('');
      
      console.log(`Found ${backupData.sales.length} sales in backup`);
      console.log('⚠️  Note: Full restore requires running the complete restore script');
    } else {
      console.log('❌ No sales found in backup!');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

restoreSalesFromBackup();
