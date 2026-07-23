const { exec } = require('child_process');
const path = require('path');

// Database connection details
const DB_HOST = 'localhost';
const DB_PORT = '5432';
const DB_NAME = 'bee_jeans_pos';
const DB_USER = 'postgres';
const DB_PASSWORD = 'Zoma.54559';

const BACKUP_FILE = 'C:\\Users\\hazem.LAB2-33\\Documents\\bee_jeans_backup.sql';

console.log('🔄 Starting restore process...\n');
console.log('⚠️  Note: Suppliers will be assigned default type "FABRIC"');
console.log('   You can change their type later from the Suppliers page\n');

const restoreCommand = `"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe" -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${BACKUP_FILE}"`;

const env = {
  ...process.env,
  PGPASSWORD: DB_PASSWORD
};

exec(restoreCommand, { env }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error restoring backup:', error.message);
    return;
  }
  
  if (stderr && !stderr.includes('NOTICE') && !stderr.includes('WARNING')) {
    console.error('⚠️  Restore warnings:', stderr);
  }
  
  console.log('✅ Backup restored successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Run: node update-suppliers-type.js');
  console.log('   2. Restart the backend server');
  console.log('   3. Check the Suppliers page and update types as needed\n');
});
