const fs = require('fs');
const path = require('path');

const backupPath = 'C:\\Users\\hazem.LAB2-33\\Documents\\bee_jeans_backup.sql';

console.log('📖 Reading backup file...\n');

try {
  const content = fs.readFileSync(backupPath, 'utf8');
  
  // Find INSERT statements for branches
  const branchInsertRegex = /INSERT INTO (?:public\.)?branches.*?VALUES\s*\((.*?)\);/gis;
  const matches = content.match(branchInsertRegex);
  
  if (matches && matches.length > 0) {
    console.log(`✅ Found ${matches.length} branch INSERT statements:\n`);
    matches.forEach((match, index) => {
      console.log(`Branch ${index + 1}:`);
      console.log(match.substring(0, 200) + '...\n');
    });
  } else {
    console.log('❌ No branch INSERT statements found');
    console.log('\n📝 Searching for branches table...');
    
    const branchesTableRegex = /CREATE TABLE.*branches/i;
    if (content.match(branchesTableRegex)) {
      console.log('✅ branches table definition found');
    }
    
    // Try to find COPY statements instead
    const copyRegex = /COPY (?:public\.)?branches.*?FROM stdin;([\s\S]*?)\\./gm;
    const copyMatch = content.match(copyRegex);
    
    if (copyMatch) {
      console.log('\n✅ Found COPY statement for branches:');
      console.log(copyMatch[0].substring(0, 500));
    }
  }
  
} catch (error) {
  console.error('❌ Error reading backup:', error.message);
}
