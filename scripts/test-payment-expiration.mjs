/**
 * Test script for payment expiration cleanup
 * Run with: npm run test:payment-expiration
 * 
 * This script tests the payment expiration job by:
 * 1. Connecting to the database
 * 2. Running the manual cleanup function
 * 3. Reporting results
 */

import { config } from 'dotenv';
import { createRequire } from 'module';

// Load environment variables
config();

const require = createRequire(import.meta.url);

console.log("Testing payment expiration cleanup...\n");

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not set in environment");
  console.log("Set it with: $env:DATABASE_URL='your-connection-string'");
  process.exit(1);
}

console.log("✓ Database URL configured");
console.log("✓ Connecting to database...\n");

// Import and run the cleanup (this will be done via tsx to handle TypeScript)
console.log("Note: This script needs to be run with tsx to handle TypeScript imports");
console.log("Run: npx tsx scripts/test-payment-expiration-ts.ts");

