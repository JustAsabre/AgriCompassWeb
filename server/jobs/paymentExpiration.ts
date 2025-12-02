import cron from "node-cron";
import { db } from "../drizzleClient";
import { payments, orders, escrow } from "../../shared/schema";
import { eq, and, lt } from "drizzle-orm";

/**
 * Payment Expiration Job
 * 
 * Purpose: Prevent unlimited accumulation of pending payments in database
 * Runs: Daily at 3:00 AM server time
 * 
 * Actions:
 * 1. Find payments WHERE status='pending' AND created_at < 24 hours ago
 * 2. Update payment.status to 'expired'
 * 3. Update associated order.status to 'expired'
 * 4. Delete associated escrow records (funds were never held)
 * 5. Log cleanup count for monitoring
 */

export function startPaymentExpirationJob() {
  // Run at 3:00 AM every day
  cron.schedule("0 3 * * *", async () => {
    console.log("[Payment Expiration Job] Starting cleanup...");
    
    if (!db) {
      console.error("[Payment Expiration Job] Database not available");
      return;
    }
    
    try {
      // Calculate timestamp for 24 hours ago
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Find all expired pending payments
      const expiredPayments = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.status, "pending"),
            lt(payments.createdAt, twentyFourHoursAgo)
          )
        );

      if (expiredPayments.length === 0) {
        console.log("[Payment Expiration Job] No expired payments found");
        return;
      }

      console.log(`[Payment Expiration Job] Found ${expiredPayments.length} expired payments`);

      // Process each expired payment
      for (const payment of expiredPayments) {
        try {
          // Update payment status to expired
          await db
            .update(payments)
            .set({ status: "expired" })
            .where(eq(payments.id, payment.id));

          // Update associated order status to expired
          await db
            .update(orders)
            .set({ status: "expired", updatedAt: new Date() })
            .where(eq(orders.id, payment.orderId));

          // Delete associated escrow record (funds were never held)
          await db
            .delete(escrow)
            .where(eq(escrow.orderId, payment.orderId));

          console.log(`[Payment Expiration Job] Expired payment ${payment.id} for order ${payment.orderId}`);
        } catch (error) {
          console.error(`[Payment Expiration Job] Error processing payment ${payment.id}:`, error);
        }
      }

      console.log(`[Payment Expiration Job] Cleanup completed. Processed ${expiredPayments.length} payments`);
    } catch (error) {
      console.error("[Payment Expiration Job] Fatal error:", error);
    }
  });

  console.log("[Payment Expiration Job] Scheduled to run daily at 3:00 AM");
}

/**
 * Manual cleanup function for testing or one-time execution
 * Can be called directly or via admin endpoint
 */
export async function runPaymentExpirationCleanup() {
  console.log("[Manual Payment Cleanup] Starting...");
  
  if (!db) {
    console.error("[Manual Payment Cleanup] Database not available");
    return {
      total: 0,
      processed: 0,
      errors: 1
    };
  }
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const expiredPayments = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.status, "pending"),
        lt(payments.createdAt, twentyFourHoursAgo)
      )
    );

  let processedCount = 0;
  let errorCount = 0;

  for (const payment of expiredPayments) {
    try {
      await db
        .update(payments)
        .set({ status: "expired" })
        .where(eq(payments.id, payment.id));

      await db
        .update(orders)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(orders.id, payment.orderId));

      await db
        .delete(escrow)
        .where(eq(escrow.orderId, payment.orderId));

      processedCount++;
    } catch (error) {
      console.error(`[Manual Payment Cleanup] Error processing payment ${payment.id}:`, error);
      errorCount++;
    }
  }

  return {
    total: expiredPayments.length,
    processed: processedCount,
    errors: errorCount
  };
}
