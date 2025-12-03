#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const listingId = process.argv[2];

if (!listingId) {
  console.error('❌ Usage: node scripts/deactivate-listing.mjs <listing-id>');
  console.error('   Example: node scripts/deactivate-listing.mjs 1ed77c32-64f8-482b-872a-31944ebc00bc');
  process.exit(1);
}

async function deactivateListing() {
  const sql = neon(DATABASE_URL);

  try {
    console.log(`\n🔍 Checking listing ${listingId}...`);
    
    // First, check if listing exists and get its details
    const listing = await sql`
      SELECT 
        l.id, 
        l.product_name, 
        l.status, 
        u.full_name as farmer_name,
        u.email as farmer_email
      FROM listings l
      JOIN users u ON l.farmer_id = u.id
      WHERE l.id = ${listingId}
    `;

    if (!listing || listing.length === 0) {
      console.error(`❌ Listing ${listingId} not found`);
      process.exit(1);
    }

    const listingData = listing[0];
    console.log(`\n📋 Listing Details:`);
    console.log(`   Product: ${listingData.product_name}`);
    console.log(`   Farmer: ${listingData.farmer_name} (${listingData.farmer_email})`);
    console.log(`   Current Status: ${listingData.status}`);

    // Check for related data
    const orderCount = await sql`SELECT COUNT(*) as count FROM orders WHERE listing_id = ${listingId}`;
    const cartCount = await sql`SELECT COUNT(*) as count FROM cart_items WHERE listing_id = ${listingId}`;
    const reviewCount = await sql`SELECT COUNT(*) as count FROM reviews WHERE listing_id = ${listingId}`;
    const tierCount = await sql`SELECT COUNT(*) as count FROM pricing_tiers WHERE listing_id = ${listingId}`;

    console.log(`\n📊 Related Data:`);
    console.log(`   Orders: ${orderCount[0].count}`);
    console.log(`   Cart Items: ${cartCount[0].count}`);
    console.log(`   Reviews: ${reviewCount[0].count}`);
    console.log(`   Pricing Tiers: ${tierCount[0].count}`);

    if (listingData.status === 'inactive') {
      console.log(`\n⚠️  Listing is already inactive`);
      return;
    }

    // Update status to inactive
    const updated = await sql`
      UPDATE listings 
      SET status = 'inactive'
      WHERE id = ${listingId}
      RETURNING id, product_name, status
    `;

    console.log(`\n✅ Listing deactivated successfully!`);
    console.log(`   ID: ${updated[0].id}`);
    console.log(`   Product: ${updated[0].product_name}`);
    console.log(`   New Status: ${updated[0].status}`);
    console.log(`\n💡 The listing is now hidden from marketplace but data is preserved`);
    console.log(`   To reactivate: UPDATE listings SET status = 'active' WHERE id = '${listingId}'`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

deactivateListing().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
