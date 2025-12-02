import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

async function fixProductionSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to production database...');
    const client = await pool.connect();
    
    console.log('Reading migration SQL...');
    const sql = fs.readFileSync(path.join(process.cwd(), 'fix_production_schema.sql'), 'utf8');
    
    console.log('Executing migration...');
    const result = await client.query(sql);
    
    console.log('Migration completed successfully!');
    console.log('Result:', result.rows);
    
    client.release();
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixProductionSchema().catch(console.error);
