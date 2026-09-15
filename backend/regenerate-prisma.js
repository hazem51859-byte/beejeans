const { execSync } = require('child_process');

console.log('Regenerating Prisma Client...\n');

try {
  // Run prisma generate
  execSync('node ./node_modules/prisma/build/index.js generate', {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  console.log('\n✅ Prisma Client regenerated successfully!');
  console.log('Now restart your backend server.');
  
} catch (error) {
  console.error('❌ Error regenerating Prisma Client:', error.message);
  process.exit(1);
}
