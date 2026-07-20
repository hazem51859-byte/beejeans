const prisma = require('../config/database');

const initMainBranch = async () => {
  try {
    const mainBranch = await prisma.branch.findUnique({
      where: { code: 'MAIN' }
    });
    if (!mainBranch) {
      await prisma.branch.create({
        data: {
          name: 'المخزن الرئيسي',
          code: 'MAIN',
          url: 'MAIN',
          address: 'المخزن الرئيسي للأدمن',
          isActive: true
        }
      });
      console.log('🌱 Main Warehouse branch created successfully');
    } else {
      console.log('✅ Main Warehouse branch already exists');
    }
  } catch (error) {
    console.error('❌ Failed to ensure Main Warehouse branch:', error);
  }
};

module.exports = initMainBranch;
