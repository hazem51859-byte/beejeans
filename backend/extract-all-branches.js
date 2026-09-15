const fs = require('fs');

const backupPath = 'C:\\Users\\hazem.LAB2-33\\Documents\\bee_jeans_backup.sql';

console.log('📖 Extracting all branches...\n');

try {
  const content = fs.readFileSync(backupPath, 'utf8');
  
  // Find COPY statement for branches
  const copyRegex = /COPY public\.branches.*?FROM stdin;\s*([\s\S]*?)\\\./gm;
  const match = copyRegex.exec(content);
  
  if (match && match[1]) {
    const lines = match[1].trim().split('\n');
    
    console.log(`✅ Found ${lines.length} branches:\n`);
    
    lines.forEach((line, index) => {
      const fields = line.split('\t');
      if (fields.length >= 3) {
        console.log(`${index + 1}. Name: ${fields[1]}, Code: ${fields[2]}, URL: ${fields[3] || 'N/A'}`);
      }
    });
    
    console.log('\n📝 Full data for import:');
    console.log(match[1]);
    
  } else {
    console.log('❌ Could not extract branch data');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
