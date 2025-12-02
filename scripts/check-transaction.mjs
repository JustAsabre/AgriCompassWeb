import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function checkTransaction() {
  const orderId = '50830436-0a3e-4a8f-8583-5b8fe8f9c7bd';
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Get transaction from payment
    const result = await client.query(`
      SELECT t.*
      FROM transactions t
      JOIN payments p ON t.id = p.transaction_id
      WHERE p.order_id = $1
    `, [orderId]);
    
    console.log('\nTransaction details:');
    if (result.rows.length > 0) {
      console.table(result.rows);
      
      // Check if this transaction was verified
      const tx = result.rows[0];
      console.log(`\nTransaction status: ${tx.status}`);
      console.log(`Paystack reference: ${tx.paystack_reference}`);
      
      if (tx.status === 'completed') {
        console.log('\n✅ Transaction was marked as completed');
        console.log('This means payment verification ran successfully.');
        console.log('But escrow was NOT created - there must be an error in the escrow creation logic.');
      }
    } else {
      console.log('❌ No transaction found');
    }
    
    client.release();
  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkTransaction().catch(console.error);
