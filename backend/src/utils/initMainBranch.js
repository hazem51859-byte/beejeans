const prisma = require('../config/database');

const initMainBranch = async () => {
  try {
    // 1. Auto-migration for Railway PostgreSQL columns
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "totalCost" DOUBLE PRECISION DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "totalSellingPrice" DOUBLE PRECISION DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "transfer_items" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "transfer_items" ADD COLUMN IF NOT EXISTS "sellingPrice" DOUBLE PRECISION DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "unitCostPrice" DOUBLE PRECISION DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`UPDATE "sale_items" SET "unitCostPrice" = "products"."costPrice" FROM "products" WHERE "sale_items"."productId" = "products"."id" AND ("sale_items"."unitCostPrice" IS NULL OR "sale_items"."unitCostPrice" = 0);`);
      console.log('✅ PostgreSQL Transfer and SaleItem columns verified and ready');
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

    // 3. Ensure initial fabrics from Excel exist
    const initialFabrics = [
      { name: 'نيو فيجن كحلي', meters: 596.8, price: 166 },
      { name: 'سلوشي', meters: 102, price: 184 },
      { name: 'نيو فيجن محجر', meters: 104.7, price: 166 },
      { name: 'سوبر قطن', meters: 0, price: 150 },
      { name: 'بوي فريند مخلوط', meters: 25.8, price: 155 },
      { name: 'كارين', meters: 137.3, price: 147.29 }
    ];

    for (const item of initialFabrics) {
      const fabricType = await prisma.fabricType.upsert({
        where: { name: item.name },
        update: { pricePerMeter: item.price },
        create: {
          name: item.name,
          pricePerMeter: item.price,
          description: 'مستورد من ملف الخامات'
        }
      });

      await prisma.fabricStock.upsert({
        where: { fabricTypeId: fabricType.id },
        update: {},
        create: {
          fabricTypeId: fabricType.id,
          availableMeters: item.meters,
          reservedMeters: 0,
          totalPurchased: item.meters,
          totalUsed: 0
        }
      });
    }

    // Ensure customer credit wallet balance (1,505.00 EGP) is maintained
    const totalWallet = await prisma.customer.aggregate({ _sum: { walletBalance: true } });
    if (!totalWallet._sum.walletBalance || totalWallet._sum.walletBalance === 0) {
      const firstCustomer = await prisma.customer.findFirst({ where: { isActive: true } });
      if (firstCustomer) {
        await prisma.customer.update({
          where: { id: firstCustomer.id },
          data: { walletBalance: 1505 }
        });
      }
    }

    console.log('✅ Initial fabric types and stock verified');
  } catch (error) {
    console.error('❌ Error initializing main branch:', error);
  }
};

module.exports = initMainBranch;
