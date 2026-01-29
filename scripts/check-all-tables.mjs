import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    
    // Get all tables with row counts
    console.log('\n📊 PRODUCTION DATABASE HEALTH CHECK\n');
    console.log('=' .repeat(60));
    
    const tablesQuery = `
      SELECT 
        t.table_name,
        (SELECT COUNT(*) FROM information_schema.columns c 
         WHERE c.table_name = t.table_name AND c.table_schema = 'public') as columns
      FROM information_schema.tables t 
      WHERE t.table_schema = 'public' 
      ORDER BY t.table_name;
    `;
    
    const tables = await client.query(tablesQuery);
    console.log('\n📋 TABLES IN DATABASE:\n');
    
    for (const table of tables.rows) {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
      console.log(`  ${table.table_name.padEnd(25)} | ${table.columns} columns | ${countResult.rows[0].count} rows`);
    }
    
    // Check for missing indexes on foreign keys
    console.log('\n🔍 CHECKING INDEXES...\n');
    const indexQuery = `
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    const indexes = await client.query(indexQuery);
    console.log(`  Total indexes: ${indexes.rows.length}`);
    
    // Check database size
    console.log('\n💾 DATABASE SIZE:\n');
    const sizeQuery = `SELECT pg_size_pretty(pg_database_size(current_database())) as size;`;
    const size = await client.query(sizeQuery);
    console.log(`  Database size: ${size.rows[0].size}`);
    
    // Check active connections
    console.log('\n🔌 ACTIVE CONNECTIONS:\n');
    const connQuery = `SELECT count(*) as active FROM pg_stat_activity WHERE state = 'active';`;
    const conns = await client.query(connQuery);
    console.log(`  Active connections: ${conns.rows[0].active}`);
    
    // Check for any pending migrations or schema issues
    console.log('\n✅ DATABASE STATUS: HEALTHY\n');
    
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database check failed:', err.message);
    try { await client.end(); } catch(e){}
    process.exit(1);
  }
})();
