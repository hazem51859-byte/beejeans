const { Client } = require('pg');

async function checkDatabase() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Zoma.54559@localhost:5432/bee_jeans_pos'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check transfer_items structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'transfer_items'
      ORDER BY ordinal_position;
    `);

    console.log('Current transfer_items structure:');
    console.table(result.rows);

    // Check if table has data
    const count = await client.query('SELECT COUNT(*) FROM transfer_items');
    console.log(`\nTotal records: ${count.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
