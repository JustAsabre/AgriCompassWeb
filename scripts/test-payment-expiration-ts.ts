import 'dotenv/config';
import { runPaymentExpirationCleanup } from '../server/jobs/paymentExpiration';

/**
 * Test script for payment expiration cleanup
 * Run with: npx tsx scripts/test-payment-expiration-ts.ts
 */

async function testPaymentExpiration() {
  console.log("Testing payment expiration cleanup...\n");

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set in environment");
    console.log("Set it with: $env:DATABASE_URL='your-connection-string'");
    process.exit(1);
  }

  console.log("✓ Database URL configured");
  console.log("✓ Connecting to database...\n");

  try {
    const result = await runPaymentExpirationCleanup();
    
    console.log("\n=== Payment Expiration Cleanup Results ===");
    console.log(`Total expired payments found: ${result.total}`);
    console.log(`Successfully processed: ${result.processed}`);
    console.log(`Errors encountered: ${result.errors}`);
    
    if (result.total === 0) {
      console.log("\n✅ No expired payments to clean up");
      console.log("This is expected if:");
      console.log("  - All payments are less than 24 hours old");
      console.log("  - All pending payments have already been processed");
      console.log("  - No pending payments exist in the database");
    } else if (result.errors === 0) {
      console.log("\n✅ All expired payments processed successfully");
      console.log(`Cleaned up ${result.processed} expired payment(s)`);
    } else {
      console.log("\n⚠️ Some payments failed to process - check logs above");
      console.log(`Processed: ${result.processed}, Failed: ${result.errors}`);
    }
    
    process.exit(result.errors > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Fatal error during cleanup:", error);
    console.error("\nPossible causes:");
    console.error("  - Database connection failed");
    console.error("  - Invalid DATABASE_URL");
    console.error("  - Database schema mismatch");
    process.exit(1);
  }
}

testPaymentExpiration();
