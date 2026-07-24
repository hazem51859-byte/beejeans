const prisma = require('../config/database');

const initMainBranch = async () => {
  try {
    // 1. Auto-migration for Railway PostgreSQL columns
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "totalCost" DOUBLE PRECISION DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "totalSellingPrice" DOUBLE PRECISION DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "transfer_items" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "transfer_items" ADD COLUMN IF NOT EXISTS "sellingPrice" DOUBLE PRECISION DEFAULT 0;`);
      console.log('✅ PostgreSQL Transfer columns verified and ready');
    } catch (migError) {
      console.error('⚠️ DB Column migration error (non-fatal):', migError.message);
    }

    // 2. Ensure Main Warehouse branch exists
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
