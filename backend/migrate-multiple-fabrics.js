const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateMultipleFabrics() {
  try {
    console.log('🔄 Adding multiple fabrics support to Manufacturing Orders...\n');

    // 1. Create manufacturing_order_fabrics table using raw SQL
    console.log('1️⃣ Creating manufacturing_order_fabrics table...');
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "manufacturing_order_fabrics" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "manufacturingOrderId" TEXT NOT NULL,
        "fabricTypeId" TEXT NOT NULL,
        "metersUsed" DOUBLE PRECISION NOT NULL,
        "fabricCostPerMeter" DOUBLE PRECISION NOT NULL,
        "totalFabricCost" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ Table created\n');

    // 2. Create foreign keys
    console.log('2️⃣ Creating foreign keys...');
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE "manufacturing_order_fabrics" 
        ADD CONSTRAINT "manufacturing_order_fabrics_manufacturingOrderId_fkey" 
        FOREIGN KEY ("manufacturingOrderId") REFERENCES "manufacturing_orders"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
      `;
    } catch (e) {
      console.log('   Foreign key already exists or error:', e.message);
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE "manufacturing_order_fabrics" 
        ADD CONSTRAINT "manufacturing_order_fabrics_fabricTypeId_fkey" 
        FOREIGN KEY ("fabricTypeId") REFERENCES "fabric_types"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE
      `;
    } catch (e) {
      console.log('   Foreign key already exists or error:', e.message);
    }
    
    console.log('✅ Foreign keys created\n');

    // 3. Create indexes
    console.log('3️⃣ Creating indexes...');
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "manufacturing_order_fabrics_manufacturingOrderId_idx" 
      ON "manufacturing_order_fabrics"("manufacturingOrderId")
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "manufacturing_order_fabrics_fabricTypeId_idx" 
      ON "manufacturing_order_fabrics"("fabricTypeId")
    `;
    
    console.log('✅ Indexes created\n');

    // 4. Add new columns to manufacturing_orders
    console.log('4️⃣ Adding new columns to manufacturing_orders...');
    
    await prisma.$executeRaw`
      ALTER TABLE "manufacturing_orders" 
      ADD COLUMN IF NOT EXISTS "totalFabricCost" DOUBLE PRECISION
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "manufacturing_orders" 
      ADD COLUMN IF NOT EXISTS "grandTotalCost" DOUBLE PRECISION
    `;
    
    console.log('✅ Columns added\n');

    // 5. Make old columns nullable
    console.log('5️⃣ Making old fabric columns nullable...');
    
    await prisma.$executeRaw`
      ALTER TABLE "manufacturing_orders" 
      ALTER COLUMN "fabricTypeId" DROP NOT NULL
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "manufacturing_orders" 
      ALTER COLUMN "metersUsed" DROP NOT NULL
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "manufacturing_orders" 
      ALTER COLUMN "fabricCostPerMeter" DROP NOT NULL
    `;
    
    console.log('✅ Columns made nullable\n');

    // 6. Migrate existing data
    console.log('6️⃣ Migrating existing manufacturing orders...');
    
    const existingOrders = await prisma.$queryRaw`
      SELECT "id", "fabricTypeId", "metersUsed", "fabricCostPerMeter", "createdAt"
      FROM "manufacturing_orders"
      WHERE "fabricTypeId" IS NOT NULL 
        AND "metersUsed" IS NOT NULL 
        AND "fabricCostPerMeter" IS NOT NULL
    `;

    console.log(`   Found ${existingOrders.length} orders to migrate`);

    for (const order of existingOrders) {
      // Check if already migrated
      const exists = await prisma.$queryRaw`
        SELECT 1 FROM "manufacturing_order_fabrics"
        WHERE "manufacturingOrderId" = ${order.id}
        LIMIT 1
      `;

      if (exists.length === 0) {
        const totalFabricCost = order.metersUsed * order.fabricCostPerMeter;
        
        await prisma.$executeRaw`
          INSERT INTO "manufacturing_order_fabrics" 
            ("id", "manufacturingOrderId", "fabricTypeId", "metersUsed", "fabricCostPerMeter", "totalFabricCost", "createdAt")
          VALUES 
            (gen_random_uuid()::text, ${order.id}, ${order.fabricTypeId}, ${order.metersUsed}, ${order.fabricCostPerMeter}, ${totalFabricCost}, ${order.createdAt})
        `;

        // Update totalFabricCost in the order
        await prisma.$executeRaw`
          UPDATE "manufacturing_orders"
          SET "totalFabricCost" = ${totalFabricCost}
          WHERE "id" = ${order.id}
        `;
      }
    }

    console.log('✅ Data migrated\n');

    // 7. Update grandTotalCost
    console.log('7️⃣ Calculating grand total costs...');
    
    await prisma.$executeRaw`
      UPDATE "manufacturing_orders" 
      SET "grandTotalCost" = COALESCE("totalManufacturingCost", 0) + COALESCE("totalFabricCost", 0)
      WHERE "grandTotalCost" IS NULL
    `;
    
    console.log('✅ Grand totals calculated\n');

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateMultipleFabrics();
