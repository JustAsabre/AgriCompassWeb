#!/usr/bin/env node
import pg from 'pg';
const { Client } = pg;
import 'dotenv/config';

async function checkPermissions() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('✅ Connected');

    // Check current user
    const user = await client.query('SELECT current_user, current_database()');
    console.log(`\nCurrent user: ${user.rows[0].current_user}`);
    console.log(`Current database: ${user.rows[0].current_database}\n`);

    // Check table owner and permissions
    const perms = await client.query(`
      SELECT 
        t.tablename,
        t.tableowner,
        has_table_privilege(current_user, 'session', 'SELECT') as can_select,
        has_table_privilege(current_user, 'session', 'INSERT') as can_insert,
        has_table_privilege(current_user, 'session', 'UPDATE') as can_update,
        has_table_privilege(current_user, 'session', 'DELETE') as can_delete
      FROM pg_tables t
      WHERE t.tablename = 'session' AND t.schemaname = 'public'
    `);

    if (perms.rows.length > 0) {
      const p = perms.rows[0];
      console.log('Session table permissions:');
      console.log(`  Owner: ${p.tableowner}`);
      console.log(`  SELECT: ${p.can_select}`);
      console.log(`  INSERT: ${p.can_insert}`);
      console.log(`  UPDATE: ${p.can_update}`);
      console.log(`  DELETE: ${p.can_delete}`);

      if (!p.can_select || !p.can_insert || !p.can_update || !p.can_delete) {
        console.log('\n⚠️  Missing permissions! Attempting to grant...');
        await client.query(`GRANT ALL ON TABLE session TO ${user.rows[0].current_user}`);
        console.log('✅ Permissions granted');
      } else {
        console.log('\n✅ All permissions OK');
      }
    } else {
      console.log('❌ Session table not found');
    }

    // Try a simple query
    console.log('\nTesting session table access...');
    const test = await client.query('SELECT COUNT(*) FROM session');
    console.log(`✅ Can query session table. Row count: ${test.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkPermissions();
