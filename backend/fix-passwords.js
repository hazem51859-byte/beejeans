const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPasswords() {
  try {
    console.log('🔧 Fixing user passwords...\n');
    
    // Hash for "admin123": $2b$10$rJ5pV.QZ0JZK5Z5Z5Z5Z5uJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5
    // This is a dummy hash, let's create correct ones
    
    const users = [
      { username: 'admin', password: 'admin123' },
      { username: 'hema', password: 'admin123' },
      { username: 'mahmoud', password: 'admin123' },
      { username: 'hassan', password: 'admin123' },
      { username: 'mervat', password: 'admin123' }
    ];
    
    for (const userData of users) {
      // Use direct SQL to update password with bcrypt hash
      // We'll use a known good hash for 'admin123'
      await prisma.$executeRaw`
        UPDATE users 
        SET password = crypt(${userData.password}, gen_salt('bf'))
        WHERE username = ${userData.username}
      `;
      
      console.log(`✅ Updated password for ${userData.username}`);
    }
    
    console.log('\n🎉 All passwords updated successfully!');
    console.log('\nYou can now login with:');
    console.log('Username: admin');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPasswords();
