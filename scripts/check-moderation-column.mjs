#!/usr/bin/env node
import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

async function checkModerationColumn() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if moderation_status column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'listings' 
      AND column_name IN ('moderation_status', 'moderated', 'moderation_reason', 'moderated_at', 'moderated_by')
      ORDER BY column_name;
    `);

    console.log('📋 Moderation Columns in listings table:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (columnCheck.rows.length === 0) {
      console.log('⚠️  No moderation columns found!');
      console.log('\n📝 You need to add these columns:');
      console.log('   - moderation_status (text, default: "pending")');
      console.log('   - moderated (boolean, default: false)');
      console.log('   - moderation_reason (text, nullable)');
      console.log('   - moderated_at (timestamp, nullable)');
      console.log('   - moderated_by (varchar, nullable, references users.id)');
    } else {
      columnCheck.rows.forEach(col => {
        console.log(`✓ ${col.column_name} (${col.data_type})`);
        if (col.column_default) {
          console.log(`  Default: ${col.column_default}`);
        }
      });
    }

    // Count listings by moderation status
    const statusCounts = await client.query(`
      SELECT 
        moderation_status,
        COUNT(*) as count
      FROM listings
      GROUP BY moderation_status
      ORDER BY count DESC;
    `);

    console.log('\n📊 Listings by Moderation Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    statusCounts.rows.forEach(row => {
      console.log(`${row.moderation_status || 'NULL'}: ${row.count}`);
    });

    // Check if any listings need to be approved
    const pendingCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM listings 
      WHERE moderation_status = 'pending';
    `);

    console.log('\n🔔 Action Items:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Pending approval: ${pendingCount.rows[0].count} listings`);

    if (pendingCount.rows[0].count > 0) {
      console.log('\n⚠️  These listings are HIDDEN from marketplace until approved!');
    }

    await client.end();
    console.log('\n✅ Check completed successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkModerationColumn();
