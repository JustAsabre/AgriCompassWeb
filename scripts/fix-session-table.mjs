#!/usr/bin/env node
/**
 * Emergency migration script to create the session table in production
 * Run with: node scripts/fix-session-table.mjs
 */

import pg from 'pg';
const { Client } = pg;
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Check if session table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
      );
    `;
    
    const checkResult = await client.query(checkQuery);
    const tableExists = checkResult.rows[0].exists;

    if (tableExists) {
      console.log('✅ Session table already exists');
      return;
    }

    console.log('📝 Creating session table...');

    // Create session table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "session" (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );
    `;

    await client.query(createTableQuery);
    console.log('✅ Session table created');

    // Add primary key
    console.log('📝 Adding primary key...');
    await client.query(`ALTER TABLE "session" ADD PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;`);
    console.log('✅ Primary key added');

    // Create index on expire column
    console.log('📝 Creating index on expire column...');
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" (expire);`);
    console.log('✅ Index created');

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration();
