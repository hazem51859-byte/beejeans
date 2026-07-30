const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend-pos', 'src', 'pages', 'MonthlyReport.jsx');

// قراءة الملف
let content = fs.readFileSync(filePath, 'utf8');

// نبحث عن آخر closing divs قبل نهاية الـ component
// عادة بتكون قبل السطر الأخير

const lines = content.split('\n');
const totalLines = lines.length;

// نبحث من النهاية عن آخر return closing
let insertIndex = -1;
for (let i = totalLines - 1; i >= 0; i--) {
  // نبحث عن السطر اللي فيه closing divs كتير
  if (lines[i].trim() === '</div>' && lines[i-1] && lines[i-1].trim() === '</div>') {
    insertIndex = i - 1; // نضيف قبل الـ closing divs
    break;
  }
}

if (insertIndex === -1) {
  // لو مش لاقيين، نبحث عن آخر </div> قبل السطر الأخير
  for (let i = totalLines - 3; i >= totalLines - 20; i--) {
    if (lines[i].includes('</div>') && !lines[i].includes('<div')) {
      insertIndex = i;
      break;
    }
  }
}

if (insertIndex !== -1) {
  // نضيف الـ component
  const auditsSectionCall = '\n        {/* قسم الجرود والخسائر */}\n        <AuditsReportSection auditsData={auditsData} />\n';
  
  lines.splice(insertIndex, 0, auditsSectionCall);
  
  const newContent = lines.join('\n');
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  console.log(`✅ Added AuditsReportSection at line ${insertIndex}`);
  console.log('✅ Monthly Report updated successfully!');
} else {
  console.log('❌ Could not find insertion point');
  console.log('📝 Please add this manually before the last closing divs:');
  console.log('\n<AuditsReportSection auditsData={auditsData} />\n');
}
