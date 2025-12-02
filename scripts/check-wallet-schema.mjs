import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Checking wallet_transactions schema...');
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'wallet_transactions'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nwallet_transactions columns:');
    console.table(result.rows);
    
    // Check if reference_id and reference_type exist
    const hasReferenceId = result.rows.some(row => row.column_name === 'reference_id');
    const hasReferenceType = result.rows.some(row => row.column_name === 'reference_type');
    const hasStatus = result.rows.some(row => row.column_name === 'status');
    
    console.log('\nSchema check:');
    console.log(`✓ reference_id: ${hasReferenceId ? 'EXISTS' : 'MISSING'}`);
    console.log(`✓ reference_type: ${hasReferenceType ? 'EXISTS' : 'MISSING'}`);
    console.log(`✓ status: ${hasStatus ? 'EXISTS' : 'MISSING'}`);
    
    client.release();
  } catch (error) {
    console.error('Schema check failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkSchema().catch(console.error);
