import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function checkOrder() {
  const orderId = '50830436-0a3e-4a8f-8583-5b8fe8f9c7bd';
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    console.log(`\nChecking order: ${orderId}\n`);
    
    // Check order details
    const orderResult = await client.query(`
      SELECT o.*, l.product_name
      FROM orders o
      JOIN listings l ON o.listing_id = l.id
      WHERE o.id = $1
    `, [orderId]);
    
    if (orderResult.rows.length > 0) {
      console.log('Order found:');
      console.table(orderResult.rows);
    } else {
      console.log('❌ Order not found!');
    }
    
    // Check payments for this order
    const paymentsResult = await client.query(`
      SELECT * FROM payments WHERE order_id = $1
    `, [orderId]);
    
    console.log(`\nPayments (${paymentsResult.rows.length}):`);
    if (paymentsResult.rows.length > 0) {
      console.table(paymentsResult.rows);
    } else {
      console.log('❌ No payments found!');
    }
    
    // Check escrow for this order
    const escrowResult = await client.query(`
      SELECT * FROM escrow WHERE order_id = $1
    `, [orderId]);
    
    console.log(`\nEscrow records (${escrowResult.rows.length}):`);
    if (escrowResult.rows.length > 0) {
      console.table(escrowResult.rows);
    } else {
      console.log('❌ No escrow record found! This is why the endpoint returns 404.');
      console.log('\nThis means payment verification never created the escrow record.');
      console.log('Check if payment verification endpoint was called successfully.');
    }
    
    client.release();
  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkOrder().catch(console.error);
