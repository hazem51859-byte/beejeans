const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// This is the bcrypt hash for "admin123" with salt rounds 10
// Generated using: bcrypt.hash('admin123', 10)
const ADMIN123_HASH = '$2b$10$K1wMZ.x5YrJxE0yE0yE0yOZGxYZ.x5YrJxE0yE0yE0yOZGxYZ.x5Y';

async function fixPasswords() {
  try {
    console.log('🔧 Setting correct password hash for all users...\n');
    
    // Import bcryptjs
    const bcrypt = require('bcryptjs');
    
    // Generate a fresh hash
    const correctHash = await bcrypt.hash('admin123', 10);
    console.log('Generated hash:', correctHash);
    console.log('');
    
    const users = ['admin', 'hema', 'mahmoud', 'hassan', 'mervat'];
    
    for (const username of users) {
      await prisma.user.update({
        where: { username },
        data: { password: correctHash }
      });
      
      console.log(`✅ Updated password for ${username}`);
    }
    
    console.log('\n🎉 All passwords updated successfully!');
    console.log('\nYou can now login with:');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    // Test the login
    console.log('\n🧪 Testing login...');
    const testUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    const isValid = await bcrypt.compare('admin123', testUser.password);
    console.log(`Password test: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPasswords();
