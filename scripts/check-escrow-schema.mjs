import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function checkEscrowSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'escrow'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nProduction escrow table schema:');
    console.table(result.rows);
    
    client.release();
  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkEscrowSchema().catch(console.error);
