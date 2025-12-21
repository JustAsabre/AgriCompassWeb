#!/usr/bin/env node
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('Connected to:', process.env.DATABASE_URL?.split('@')[1]?.split('?')[0] || 'database');
  
  const result = await client.query(`
    SELECT tablename, schemaname 
    FROM pg_tables 
    WHERE tablename = 'session'
  `);
  
  if (result.rows.length > 0) {
    console.log('✅ Session table EXISTS in schema:', result.rows[0].schemaname);
    
    // Get columns
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'session'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColumns:');
    cols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
    
  } else {
    console.log('❌ Session table DOES NOT EXIST');
  }
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await client.end();
}
