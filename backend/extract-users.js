const fs = require('fs');

const backupPath = 'C:\\Users\\hazem.LAB2-33\\Documents\\bee_jeans_backup.sql';

console.log('📖 Extracting all users...\n');

try {
  const content = fs.readFileSync(backupPath, 'utf8');
  
  // Find COPY statement for users
  const copyRegex = /COPY public\.users.*?FROM stdin;\s*([\s\S]*?)\\\./gm;
  const match = copyRegex.exec(content);
  
  if (match && match[1]) {
    const lines = match[1].trim().split('\n');
    
    console.log(`✅ Found ${lines.length} users:\n`);
    
    lines.forEach((line, index) => {
      const fields = line.split('\t');
      if (fields.length >= 4) {
        console.log(`${index + 1}. Username: ${fields[1]}, Name: ${fields[4]}, Role: ${fields[6]}, Branch: ${fields[8] || 'N/A'}`);
      }
    });
    
    console.log('\n📝 Full data for import (with tabs):');
    console.log('---START---');
    console.log(match[1]);
    console.log('---END---');
    
  } else {
    console.log('❌ Could not extract users data');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
