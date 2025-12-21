#!/usr/bin/env node
/**
 * Check session table status
 */
import pg from 'pg';
const { Client } = pg;
import 'dotenv/config';

async function checkTable() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('✅ Connected');

    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'session'
      ) as exists;
    `);

    if (result.rows[0].exists) {
      console.log('✅ Session table EXISTS');
      
      // Check table structure
      const structure = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'session' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\nTable structure:');
      structure.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });

      // Check row count
      const count = await client.query('SELECT COUNT(*) FROM session');
      console.log(`\nRow count: ${count.rows[0].count}`);

    } else {
      console.log('❌ Session table DOES NOT EXIST');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();
