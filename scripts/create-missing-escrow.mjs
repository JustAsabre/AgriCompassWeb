import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function createMissingEscrow() {
  const orderId = '50830436-0a3e-4a8f-8583-5b8fe8f9c7bd';
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Get order and payment details
    const orderResult = await client.query(`
      SELECT o.*, p.id as payment_id
      FROM orders o
      JOIN payments p ON o.id = p.order_id
      WHERE o.id = $1
    `, [orderId]);
    
    if (orderResult.rows.length === 0) {
      console.log('Order not found!');
      return;
    }
    
    const order = orderResult.rows[0];
    console.log('\nOrder details:');
    console.log(`- Order ID: ${order.id}`);
    console.log(`- Buyer ID: ${order.buyer_id}`);
    console.log(`- Farmer ID: ${order.farmer_id}`);
    console.log(`- Total Price: ${order.total_price}`);
    console.log(`- Status: ${order.status}`);
    console.log(`- Payment ID: ${order.payment_id}`);
    
    // Check if escrow already exists
    const existingEscrow = await client.query(`
      SELECT * FROM escrow WHERE order_id = $1
    `, [orderId]);
    
    if (existingEscrow.rows.length > 0) {
      console.log('\n✅ Escrow already exists!');
      console.table(existingEscrow.rows);
      return;
    }
    
    console.log('\n❌ No escrow found. Creating escrow record...');
    
    // Create escrow record with production schema fields
    const result = await client.query(`
      INSERT INTO escrow (
        order_id,
        buyer_id,
        farmer_id,
        amount,
        upfront_amount,
        remaining_amount,
        status,
        upfront_payment_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      order.id,
      order.buyer_id,
      order.farmer_id,
      order.total_price,
      order.total_price, // upfront_amount = full amount (since payment was upfront)
      '0.00', // remaining_amount = 0 (no remaining balance)
      'released', // Since order is already completed, set to released
      order.payment_id
    ]);
    
    console.log('\n✅ Escrow created successfully!');
    console.table(result.rows);
    
    client.release();
  } catch (error) {
    console.error('Failed to create escrow:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createMissingEscrow().catch(console.error);
