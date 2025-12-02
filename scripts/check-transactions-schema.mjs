import pg from 'pg';
const { Client } = pg;

async function checkTransactionsSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check transactions table schema
    const schemaQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position;
    `;

    const result = await client.query(schemaQuery);
    
    console.log('\n=== TRANSACTIONS TABLE SCHEMA ===\n');
    result.rows.forEach(row => {
      console.log(`${row.column_name}:`);
      console.log(`  Type: ${row.data_type}`);
      console.log(`  Nullable: ${row.is_nullable}`);
      console.log(`  Default: ${row.column_default || 'none'}`);
      console.log('');
    });

    // Check if reference field has unique constraint
    const constraintQuery = `
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'transactions'
        AND tc.table_schema = 'public';
    `;

    const constraints = await client.query(constraintQuery);
    
    console.log('=== TRANSACTIONS TABLE CONSTRAINTS ===\n');
    constraints.rows.forEach(row => {
      console.log(`${row.constraint_type}: ${row.constraint_name}`);
      console.log(`  Column: ${row.column_name}`);
      console.log('');
    });

    // Check recent transactions
    const recentQuery = `
      SELECT id, reference, buyer_id, amount, status, created_at
      FROM transactions
      ORDER BY created_at DESC
      LIMIT 5;
    `;

    const recent = await client.query(recentQuery);
    
    console.log('=== RECENT TRANSACTIONS (Last 5) ===\n');
    recent.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Reference: ${row.reference}`);
      console.log(`Buyer ID: ${row.buyer_id}`);
      console.log(`Amount: ${row.amount}`);
      console.log(`Status: ${row.status}`);
      console.log(`Created: ${row.created_at}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkTransactionsSchema();
