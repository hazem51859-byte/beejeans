/**
 * Migrate complete database to Railway PostgreSQL
 * Simple version that reads actual schema
 */

const { PrismaClient } = require('@prisma/client');

const railwayDbUrl = process.env.RAILWAY_DATABASE_URL;

if (!railwayDbUrl) {
  console.error('❌ Error: RAILWAY_DATABASE_URL not set!');
  console.log('Run: RAILWAY_DATABASE_URL="your-url" node migrate-to-railway.js');
  process.exit(1);
}

const localDb = new PrismaClient();
const railwayDb = new PrismaClient({
  datasources: { db: { url: railwayDbUrl } }
});

async function migrate() {
  console.log('🚀 Starting migration to Railway...\n');
  
  try {
    // Test connections
    console.log('🔌 Testing connections...');
    await localDb.$connect();
    await railwayDb.$connect();
    console.log('✅ Connected to both databases\n');

    // Run migrations on Railway first
    console.log('📋 Running Prisma migrations on Railway...');
    const { execSync } = require('child_process');
    execSync(`DATABASE_URL="${railwayDbUrl}" npx prisma migrate deploy`, {
      cwd: __dirname,
      stdio: 'inherit'
    });
    console.log('✅ Migrations completed\n');

    // Get all table names from Prisma
    const models = Object.keys(localDb).filter(key => 
      !key.startsWith('_') && 
      !key.startsWith('$') && 
      typeof localDb[key] === 'object' &&
      localDb[key].findMany
    );

    console.log(`📊 Found ${models.length} tables to migrate\n`);

    // Migrate each table
    for (const model of models) {
      try {
        console.log(`⬆️  Migrating ${model}...`);
        const data = await localDb[model].findMany();
        
        if (data.length === 0) {
          console.log(`   ⏭️  Empty table, skipping`);
          continue;
        }

        // Use createMany for better performance
        await railwayDb[model].createMany({
          data: data,
          skipDuplicates: true
        });
        
        console.log(`   ✅ ${data.length} records migrated`);
      } catch (error) {
        // If createMany fails, try one by one with upsert
        console.log(`   ⚠️  Batch insert failed, trying individual inserts...`);
        const data = await localDb[model].findMany();
        let success = 0;
        let failed = 0;
        
        for (const record of data) {
          try {
            await railwayDb[model].upsert({
              where: { id: record.id },
              create: record,
              update: record
            });
            success++;
          } catch (err) {
            failed++;
            console.log(`   ❌ Failed to insert record: ${err.message.substring(0, 50)}...`);
          }
        }
        
        console.log(`   ✅ ${success} records migrated, ${failed} failed`);
      }
    }

    console.log('\n🎉 Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await localDb.$disconnect();
    await railwayDb.$disconnect();
  }
}

migrate();
