require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addTransferPrice() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding transferPrice column to transfer_items table...');
    
    // Add column if not exists
    await client.query(`
      ALTER TABLE transfer_items 
      ADD COLUMN IF NOT EXISTS "transferPrice" DECIMAL(10, 2) DEFAULT 0;
    `);
    console.log('✅ Column added');
    
    // Update existing records with product wholesalePrice
    const updateResult = await client.query(`
      UPDATE transfer_items ti
      SET "transferPrice" = COALESCE(p."wholesalePrice", p."costPrice")
      FROM products p
      WHERE ti."productId" = p.id
        AND (ti."transferPrice" IS NULL OR ti."transferPrice" = 0);
    `);
    console.log(`✅ Updated ${updateResult.rowCount} existing transfer items with wholesale prices`);
    
    // Make it NOT NULL
    await client.query(`
      ALTER TABLE transfer_items 
      ALTER COLUMN "transferPrice" SET NOT NULL;
    `);
    console.log('✅ Column set to NOT NULL');
    
    // Show sample data
    const sample = await client.query(`
      SELECT 
        ti.id,
        p.name as product_name,
        ti.quantity,
        ti."transferPrice",
        (ti.quantity * ti."transferPrice") as total_value
      FROM transfer_items ti
      JOIN products p ON ti."productId" = p.id
      LIMIT 5;
    `);
    
    console.log('\n📊 Sample transfer items with prices:');
    console.table(sample.rows);
    
    console.log('\n✅ transferPrice column added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addTransferPrice().catch(console.error);
