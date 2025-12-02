import nodemailer, { type Transporter } from 'nodemailer';
import emailQueue from './emailQueue';

// Email transporter (may be null if not configured). We support two modes:
// 1) Generic SMTP via SMTP_HOST/SMTP_PORT/SMTP_SECURE + SMTP_USER/SMTP_PASS
// 2) Gmail via SMTP_SERVICE=gmail with SMTP_USER/SMTP_PASS
let transporter: Transporter | null = null;
let lastVerifyError: Error | null = null;

function createTransporterIfConfigured(): void {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const secureEnv = process.env.SMTP_SECURE;
  const secure = secureEnv === 'true' || secureEnv === '1' || (port === 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE; // e.g. 'gmail'

  if (host) {
    // Generic SMTP config
    const transportOpts: any = {
      host,
      port: port || 587,
      secure: !!secure,
    };
    if (user && pass) transportOpts.auth = { user, pass };
    transporter = nodemailer.createTransport(transportOpts);
  } else if (service === 'gmail' && user && pass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  } else {
    transporter = null;
  }

  if (transporter) {
    // Verify connectivity/auth without crashing startup.
    // If verification fails we will attempt common fallbacks (use secure port 465 or `service: 'gmail'`) before giving up.
    transporter.verify().then(() => {
      console.log('Email transporter configured and verified');
      lastVerifyError = null;
    }).catch(async (err: any) => {
      lastVerifyError = err instanceof Error ? err : new Error(String(err));
      console.warn('Email transporter verification failed (primary):', lastVerifyError.message);
      if (lastVerifyError.stack) console.debug(lastVerifyError.stack);

      // Try Gmail-specific fallback if host looks like smtp.gmail.com
      const hostLower = (process.env.SMTP_HOST || '').toLowerCase();
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if ((hostLower === 'smtp.gmail.com' || process.env.SMTP_SERVICE === 'gmail') && user && pass) {
        try {
          console.info('Attempting Gmail fallback using secure port 465...');
          const fallback = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user, pass },
            // explicit timeouts to avoid hanging
            connectionTimeout: 10000,
            greetingTimeout: 5000,
            socketTimeout: 20000,
          });
          await fallback.verify();
          transporter = fallback as Transporter;
          lastVerifyError = null;
          console.log('Gmail fallback transporter verified and enabled (port 465)');
          return;
        } catch (fbErr: any) {
          console.warn('Gmail fallback verify failed:', fbErr && fbErr.message ? fbErr.message : fbErr);
          if (fbErr && fbErr.stack) console.debug(fbErr.stack);
        }
        try {
          console.info('Attempting Gmail service transport fallback...');
          const fallback2 = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
          await fallback2.verify();
          transporter = fallback2 as Transporter;
          lastVerifyError = null;
          console.log('Gmail service transporter verified and enabled');
          return;
        } catch (fb2Err: any) {
          console.warn('Gmail service fallback verify failed:', fb2Err && fb2Err.message ? fb2Err.message : fb2Err);
          if (fb2Err && fb2Err.stack) console.debug(fb2Err.stack);
        }
      }

      // If fallbacks failed, disable transporter and log guidance.
      transporter = null;
      console.info('SMTP disabled due to verification failure — emails will be logged only.');
      console.info('If you are using Gmail, ensure you created an App Password (2FA required) and try using port 465 or setting SMTP_SERVICE=gmail.');
    });
  } else {
    console.log('No SMTP transporter configured. Emails will be logged only.');
  }
}

createTransporterIfConfigured();

// Email sending function
async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Enqueue the email for background delivery and return immediately
    const jobId = emailQueue.enqueueEmail({ to: options.to, subject: options.subject, html: options.html });
    console.log(`Enqueued email job ${jobId} for ${options.to}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to enqueue email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    
    return await sendEmail({
      to: email,
      subject: 'Reset Your Password - AgriCompass',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AgriCompass</h1>
              </div>
              <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hello ${userName},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #10b981;">${resetUrl}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                <div class="footer">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                  <p>Connecting farmers and buyers across Africa.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Password reset email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

// Diagnostic helper: returns current SMTP status for debugging and health checks.
export function getSmtpStatus() {
  return {
    configured: !!transporter,
    host: process.env.SMTP_HOST || null,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null,
    service: process.env.SMTP_SERVICE || null,
    lastVerifyError: lastVerifyError ? { message: lastVerifyError.message, stack: lastVerifyError.stack } : null,
  };
}

export async function sendWelcomeEmail(
  email: string,
  userName: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/login`;
    
    return await sendEmail({
      to: email,
      subject: 'Welcome to AgriCompass!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .features { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to AgriCompass!</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                <p>Thank you for joining AgriCompass as a <strong>${role}</strong>! We're excited to have you as part of our community.</p>
                
                <div class="features">
                  <h3>Get Started:</h3>
                  <ul>
                    ${role === 'farmer' ? `
                      <li>Create your first product listing</li>
                      <li>Set competitive prices and bulk discounts</li>
                      <li>Manage orders from buyers</li>
                      <li>Get verified by field officers</li>
                    ` : role === 'buyer' ? `
                      <li>Browse fresh produce from verified farmers</li>
                      <li>Save on bulk purchases with tiered pricing</li>
                      <li>Track your orders in real-time</li>
                      <li>Connect directly with farmers</li>
                    ` : `
                      <li>Verify farmer credentials</li>
                      <li>Support the agricultural community</li>
                      <li>Ensure marketplace quality</li>
                    `}
                  </ul>
                </div>

                <div style="text-align: center;">
                  <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
                </div>

                <p>Need help? Contact our support team at support@agricompass.com</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Welcome email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendPasswordChangedEmail(
  email: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await sendEmail({
      to: email,
      subject: 'Your Password Was Changed - AgriCompass',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AgriCompass</h1>
              </div>
              <div class="content">
                <h2>Password Successfully Changed</h2>
                <p>Hello ${userName},</p>
                <p>This email confirms that your password was successfully changed.</p>
                
                <div class="alert">
                  <strong>⚠️ Didn't make this change?</strong><br>
                  If you didn't change your password, please contact our support team immediately at support@agricompass.com
                </div>

                <p>For your security:</p>
                <ul>
                  <li>Never share your password with anyone</li>
                  <li>Use a unique password for AgriCompass</li>
                  <li>Enable two-factor authentication (coming soon)</li>
                </ul>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Password changed email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendOrderConfirmationEmail(
  email: string,
  userName: string,
  orderDetails: {
    orderId: string;
    productName: string;
    quantity: number;
    totalPrice: number;
    farmerName: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/orders/${orderDetails.orderId}`;
    
    return await sendEmail({
      to: email,
      subject: `Order Confirmed #${orderDetails.orderId} - AgriCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #10b981; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-row:last-child { border-bottom: none; }
              .total { font-size: 1.2em; font-weight: bold; color: #10b981; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Order Confirmed!</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                <p>Thank you for your order! Your purchase has been confirmed and the farmer has been notified.</p>
                
                <div class="order-details">
                  <h3>Order #${orderDetails.orderId}</h3>
                  <div class="detail-row">
                    <span>Product:</span>
                    <strong>${orderDetails.productName}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Quantity:</span>
                    <strong>${orderDetails.quantity} kg</strong>
                  </div>
                  <div class="detail-row">
                    <span>Farmer:</span>
                    <strong>${orderDetails.farmerName}</strong>
                  </div>
                  <div class="detail-row total">
                    <span>Total:</span>
                    <span>$${orderDetails.totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div style="text-align: center;">
                  <a href="${orderUrl}" class="button">View Order Details</a>
                </div>

                <p><strong>What's Next?</strong></p>
                <ul>
                  <li>The farmer will prepare your order</li>
                  <li>You'll receive updates on order status</li>
                  <li>Track delivery progress in your dashboard</li>
                </ul>

                <p>Questions? Contact the farmer directly or reach our support team.</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Order confirmation email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendNewOrderNotificationToFarmer(
  email: string,
  farmerName: string,
  orderDetails: {
    orderId: string;
    productName: string;
    quantity: number;
    totalPrice: number;
    buyerName: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/orders/${orderDetails.orderId}`;
    
    return await sendEmail({
      to: email,
      subject: `New Order Received #${orderDetails.orderId} - AgriCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #10b981; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-row:last-child { border-bottom: none; }
              .total { font-size: 1.2em; font-weight: bold; color: #10b981; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .urgent { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔔 New Order Received!</h1>
              </div>
              <div class="content">
                <p>Hello ${farmerName},</p>
                <p>Great news! You have received a new order from a buyer.</p>
                
                <div class="order-details">
                  <h3>Order #${orderDetails.orderId}</h3>
                  <div class="detail-row">
                    <span>Product:</span>
                    <strong>${orderDetails.productName}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Quantity:</span>
                    <strong>${orderDetails.quantity} kg</strong>
                  </div>
                  <div class="detail-row">
                    <span>Buyer:</span>
                    <strong>${orderDetails.buyerName}</strong>
                  </div>
                    orderId: string;
                    <span>Total Earnings:</span>
                    <span>$${orderDetails.totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div class="urgent">
                  <strong>⚡ Action Required</strong><br>
                  Please review and confirm this order as soon as possible.
                </div>

                <div style="text-align: center;">
                  <a href="${orderUrl}" class="button">View & Manage Order</a>
                </div>

                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>Review order details in your dashboard</li>
                  <li>Confirm you can fulfill this order</li>
                  <li>Prepare the product for delivery/pickup</li>
                  <li>Update order status as you progress</li>
                </ul>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Farmer order notification email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendVerificationStatusEmail(
  email: string,
  userName: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const isApproved = status === 'approved';
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/farmer-dashboard`;
    
    return await sendEmail({
      to: email,
      subject: isApproved 
        ? '✅ Verification Approved - AgriCompass' 
        : '❌ Verification Update - AgriCompass',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: ${isApproved ? '#10b981' : '#ef4444'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .status-box { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid ${isApproved ? '#10b981' : '#ef4444'}; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .benefits { background: #ecfdf5; padding: 15px; margin: 15px 0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${isApproved ? '🎉 Verification Approved!' : '📋 Verification Update'}</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                
                ${isApproved ? `
                  <div class="status-box">
                    <h3 style="color: #10b981; margin-top: 0;">✅ Congratulations!</h3>
                    <p>Your farmer verification has been approved by our field officer. You are now a verified farmer on AgriCompass!</p>
                  </div>

                  <div class="benefits">
                    <h4>🌟 Your New Benefits:</h4>
                    <ul>
                      <li>Verified badge on your profile and listings</li>
                      <li>Increased buyer trust and visibility</li>
                      <li>Priority in search results</li>
                      <li>Access to premium features</li>
                      <li>Higher conversion rates on sales</li>
                    </ul>
                  </div>

                  <div style="text-align: center;">
                    <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
                  </div>
                      orderId: string;
                  <p><strong>What's Next?</strong></p>
                  <ul>
                    <li>Your listings now show the verified badge</li>
                    <li>Start receiving more orders from buyers</li>
                    <li>Keep your profile information up to date</li>
                    <li>Maintain quality to keep your verified status</li>
                  </ul>
                ` : `
                  <div class="status-box">
                    <h3 style="color: #ef4444; margin-top: 0;">Verification Status Update</h3>
                    <p>We regret to inform you that your verification request could not be approved at this time.</p>
                    ${rejectionReason ? `
                      <p><strong>Reason:</strong> ${rejectionReason}</p>
                    ` : ''}
                  </div>

                  <p><strong>What You Can Do:</strong></p>
                  <ul>
                    <li>Review the rejection reason carefully</li>
                    <li>Update your documentation and information</li>
                    <li>Submit a new verification request</li>
                    <li>Contact support if you need assistance</li>
                  </ul>

                  <p>Don't worry! You can still use AgriCompass and create listings. Verification helps build buyer trust, but it's not required to sell on our platform.</p>
                `}

                <p>Need help? Contact our support team at support@agricompass.com</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Verification status email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

// ============================================================================
// ORDER STATUS CHANGE EMAILS (for buyers)
// ============================================================================

export async function sendOrderAcceptedEmail(
  email: string,
  userName: string,
  orderDetails: {
    orderId: string;
    productName: string;
    quantity: number;
    totalPrice: number;
    farmerName: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/orders/${orderDetails.orderId}`;
    
    return await sendEmail({
      to: email,
      subject: `Order Accepted #${orderDetails.orderId} - AgriCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #10b981; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .success-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Order Accepted!</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                
                <div class="success-box">
                  <strong>Great news!</strong> The farmer has accepted your order and is preparing it for delivery.
                </div>
                
                <div class="order-details">
                  <h3>Order #${orderDetails.orderId}</h3>
                  <p><strong>Product:</strong> ${orderDetails.productName}</p>
                  <p><strong>Quantity:</strong> ${orderDetails.quantity} kg</p>
                  <p><strong>Farmer:</strong> ${orderDetails.farmerName}</p>
                  <p><strong>Total:</strong> $${orderDetails.totalPrice.toFixed(2)}</p>
                </div>

                <div style="text-align: center;">
                  <a href="${orderUrl}" class="button">Track Order</a>
                </div>

                <p><strong>What's Next?</strong></p>
                <ul>
                  <li>The farmer is preparing your order</li>
                  <li>You'll be notified when it's ready for delivery</li>
                  <li>Track progress in your order dashboard</li>
                </ul>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Order accepted email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendOrderRejectedEmail(
  email: string,
  userName: string,
  orderDetails: {
    orderId: string;
    productName: string;
    quantity: number;
    totalPrice: number;
    farmerName: string;
    rejectionReason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/orders/${orderDetails.orderId}`;
    
    return await sendEmail({
      to: email,
      subject: `Order Update #${orderDetails.orderId} - AgriCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ef4444; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Order Status Update</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                <p>Unfortunately, the farmer was unable to fulfill your order at this time.</p>
                
                <div class="order-details">
                  <h3>Order #${orderDetails.orderId}</h3>
                  <p><strong>Product:</strong> ${orderDetails.productName}</p>
                  <p><strong>Quantity:</strong> ${orderDetails.quantity} kg</p>
                  <p><strong>Farmer:</strong> ${orderDetails.farmerName}</p>
                  ${orderDetails.rejectionReason ? `<p><strong>Reason:</strong> ${orderDetails.rejectionReason}</p>` : ''}
                  <p><strong>Refund Amount:</strong> $${orderDetails.totalPrice.toFixed(2)}</p>
                </div>

                <p>Your payment has been automatically refunded to your original payment method. Please allow 3-5 business days for processing.</p>

                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/listings" class="button">Browse Other Products</a>
                </div>

                <p>We apologize for the inconvenience. Feel free to explore other listings from verified farmers in your area.</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Order rejected email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendOrderDeliveredEmail(
  email: string,
  userName: string,
  orderDetails: {
    orderId: string;
    productName: string;
    quantity: number;
    totalPrice: number;
    farmerName: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/orders/${orderDetails.orderId}`;
    
    return await sendEmail({
      to: email,
      subject: `Order Delivered #${orderDetails.orderId} - AgriCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #10b981; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .action-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📦 Order Delivered!</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                <p>Your order has been delivered by ${orderDetails.farmerName}!</p>
                
                <div class="order-details">
                  <h3>Order #${orderDetails.orderId}</h3>
                  <p><strong>Product:</strong> ${orderDetails.productName}</p>
                  <p><strong>Quantity:</strong> ${orderDetails.quantity} kg</p>
                  <p><strong>Farmer:</strong> ${orderDetails.farmerName}</p>
                  <p><strong>Total:</strong> $${orderDetails.totalPrice.toFixed(2)}</p>
                </div>

                <div class="action-box">
                  <strong>⚡ Action Required</strong><br>
                  Please confirm receipt of your order to release payment to the farmer.
                </div>

                <div style="text-align: center;">
                  <a href="${orderUrl}" class="button">Confirm & Complete Order</a>
                </div>

                <p><strong>Important:</strong></p>
                <ul>
                  <li>Inspect the product quality and quantity</li>
                  <li>Confirm receipt to release funds from escrow</li>
                  <li>Leave a review to help other buyers</li>
                  <li>Report any issues immediately</li>
                </ul>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Order delivered email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendOrderCompletedEmail(
  email: string,
  userName: string,
  orderDetails: {
    orderId: string;
    productName: string;
    quantity: number;
    totalPrice: number;
    farmerName: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/orders/${orderDetails.orderId}`;
    const reviewUrl = `${orderUrl}#reviews`;
    
    return await sendEmail({
      to: email,
      subject: `Order Completed #${orderDetails.orderId} - AgriCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #10b981; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .success-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Order Completed!</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                
                <div class="success-box">
                  <strong>Thank you!</strong> Your order has been completed successfully and payment has been released to the farmer.
                </div>
                
                <div class="order-details">
                  <h3>Order #${orderDetails.orderId}</h3>
                  <p><strong>Product:</strong> ${orderDetails.productName}</p>
                  <p><strong>Quantity:</strong> ${orderDetails.quantity} kg</p>
                  <p><strong>Farmer:</strong> ${orderDetails.farmerName}</p>
                  <p><strong>Total:</strong> $${orderDetails.totalPrice.toFixed(2)}</p>
                </div>

                <div style="text-align: center;">
                  <a href="${reviewUrl}" class="button">Leave a Review</a>
                </div>

                <p><strong>Help the Community:</strong></p>
                <ul>
                  <li>Share your experience with this farmer</li>
                  <li>Rate the product quality and delivery</li>
                  <li>Help other buyers make informed decisions</li>
                  <li>Support farmers with honest feedback</li>
                </ul>

                <p>We hope you enjoyed your purchase! Browse more fresh produce from local farmers.</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Order completed email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

// ============================================================================
// WITHDRAWAL NOTIFICATION EMAILS (for farmers)
// ============================================================================

export async function sendWithdrawalRequestedEmail(
  email: string,
  userName: string,
  withdrawalDetails: {
    amount: number;
    requestedAt: Date;
    mobileNumber?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    return await sendEmail({
      to: email,
      subject: `Withdrawal Request Received - AgriCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .withdrawal-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #10b981; }
              .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💰 Withdrawal Request Received</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                <p>We've received your withdrawal request and it's now being processed.</p>
                
                <div class="withdrawal-details">
                  <h3>Withdrawal Details</h3>
                  <p><strong>Amount:</strong> $${withdrawalDetails.amount.toFixed(2)}</p>
                  <p><strong>Requested:</strong> ${new Date(withdrawalDetails.requestedAt).toLocaleString()}</p>
                  ${withdrawalDetails.mobileNumber ? `<p><strong>Mobile Money:</strong> ${withdrawalDetails.mobileNumber}</p>` : ''}
                  <p><strong>Status:</strong> Pending</p>
                </div>

                <div class="info-box">
                  <strong>ℹ️ Processing Time</strong><br>
                  Most withdrawals are processed within 1-2 business days. You'll receive an email confirmation once the funds are sent.
                </div>

                <p><strong>What to Expect:</strong></p>
                <ul>
                  <li>Your withdrawal is now in our processing queue</li>
                  <li>We'll verify your payout details</li>
                  <li>Funds will be sent to your mobile money account</li>
                  <li>You'll receive a confirmation email</li>
                </ul>

                <p>Need help? Contact support@agricompass.com</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Withdrawal requested email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendWithdrawalProcessingEmail(
  email: string,
  userName: string,
  withdrawalDetails: {
    amount: number;
    mobileNumber?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    return await sendEmail({
      to: email,
      subject: `Withdrawal Being Processed - AgriCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .withdrawal-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #3b82f6; }
              .progress-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏳ Withdrawal Processing</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                
                <div class="progress-box">
                  <strong>Your withdrawal is now being processed!</strong><br>
                  We're transferring the funds to your mobile money account.
                </div>
                
                <div class="withdrawal-details">
                  <h3>Withdrawal Details</h3>
                  <p><strong>Amount:</strong> $${withdrawalDetails.amount.toFixed(2)}</p>
                  ${withdrawalDetails.mobileNumber ? `<p><strong>Mobile Money:</strong> ${withdrawalDetails.mobileNumber}</p>` : ''}
                  <p><strong>Status:</strong> Processing</p>
                </div>

                <p><strong>What's Happening:</strong></p>
                <ul>
                  <li>Payment is being initiated with our mobile money provider</li>
                  <li>Funds are being transferred to your account</li>
                  <li>You'll receive a confirmation once complete</li>
                  <li>Check your mobile money account for the deposit</li>
                </ul>

                <p>You should receive the funds within a few minutes. If there are any delays, we'll notify you immediately.</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Withdrawal processing email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendWithdrawalCompletedEmail(
  email: string,
  userName: string,
  withdrawalDetails: {
    amount: number;
    mobileNumber?: string;
    completedAt: Date;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    return await sendEmail({
      to: email,
      subject: `Withdrawal Completed - AgriCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .withdrawal-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #10b981; }
              .success-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Withdrawal Completed!</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                
                <div class="success-box">
                  <strong>Success!</strong> Your withdrawal has been completed and the funds have been sent to your mobile money account.
                </div>
                
                <div class="withdrawal-details">
                  <h3>Withdrawal Summary</h3>
                  <p><strong>Amount:</strong> $${withdrawalDetails.amount.toFixed(2)}</p>
                  ${withdrawalDetails.mobileNumber ? `<p><strong>Mobile Money:</strong> ${withdrawalDetails.mobileNumber}</p>` : ''}
                  <p><strong>Completed:</strong> ${new Date(withdrawalDetails.completedAt).toLocaleString()}</p>
                  <p><strong>Status:</strong> Completed ✅</p>
                </div>

                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>Check your mobile money account for the deposit</li>
                  <li>You should receive an SMS from your mobile money provider</li>
                  <li>Save this email for your records</li>
                  <li>Continue selling on AgriCompass to earn more!</li>
                </ul>

                <p>Thank you for using AgriCompass. Your funds are on the way!</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Withdrawal completed email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendWithdrawalFailedEmail(
  email: string,
  userName: string,
  withdrawalDetails: {
    amount: number;
    failureReason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const walletUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/farmer-wallet`;
    
    return await sendEmail({
      to: email,
      subject: `Withdrawal Failed - AgriCompass`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .withdrawal-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ef4444; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>❌ Withdrawal Failed</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                <p>Unfortunately, your withdrawal request could not be completed.</p>
                
                <div class="withdrawal-details">
                  <h3>Withdrawal Details</h3>
                  <p><strong>Amount:</strong> $${withdrawalDetails.amount.toFixed(2)}</p>
                  ${withdrawalDetails.failureReason ? `<p><strong>Reason:</strong> ${withdrawalDetails.failureReason}</p>` : ''}
                  <p><strong>Status:</strong> Failed</p>
                </div>

                <p><strong>Don't worry!</strong> Your funds have been returned to your AgriCompass wallet and are available for withdrawal.</p>

                <p><strong>What to Do Next:</strong></p>
                <ul>
                  <li>Verify your mobile money details are correct</li>
                  <li>Check that your account can receive payments</li>
                  <li>Try again with the correct information</li>
                  <li>Contact our support if you need assistance</li>
                </ul>

                <div style="text-align: center;">
                  <a href="${walletUrl}" class="button">Update Details & Retry</a>
                </div>

                <p>Need help? Contact support@agricompass.com</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Withdrawal failed email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

// ============================================================================
// PAYMENT & ESCROW NOTIFICATION EMAILS
// ============================================================================

export async function sendPaymentFailedEmail(
  email: string,
  userName: string,
  paymentDetails: {
    orderId: string;
    amount: number;
    productName: string;
    failureReason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/orders/${paymentDetails.orderId}`;
    
    return await sendEmail({
      to: email,
      subject: `Payment Failed - Order #${paymentDetails.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .payment-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ef4444; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Payment Failed</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                <p>Your payment could not be processed for order #${paymentDetails.orderId}.</p>
                
                <div class="payment-details">
                  <h3>Payment Details</h3>
                  <p><strong>Order:</strong> ${paymentDetails.productName}</p>
                  <p><strong>Amount:</strong> $${paymentDetails.amount.toFixed(2)}</p>
                  ${paymentDetails.failureReason ? `<p><strong>Reason:</strong> ${paymentDetails.failureReason}</p>` : ''}
                </div>

                <p><strong>Common Reasons:</strong></p>
                <ul>
                  <li>Insufficient funds in your account</li>
                  <li>Incorrect payment details</li>
                  <li>Network or technical issues</li>
                  <li>Payment limit exceeded</li>
                </ul>

                <div style="text-align: center;">
                  <a href="${orderUrl}" class="button">Try Payment Again</a>
                </div>

                <p>Please resolve the issue and try again. Your order will remain pending until payment is complete.</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Payment failed email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendPaymentRefundedEmail(
  email: string,
  userName: string,
  refundDetails: {
    orderId: string;
    amount: number;
    productName: string;
    refundReason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    return await sendEmail({
      to: email,
      subject: `Refund Processed - Order #${refundDetails.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .refund-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #10b981; }
              .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💰 Refund Processed</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                <p>Your payment has been successfully refunded for order #${refundDetails.orderId}.</p>
                
                <div class="refund-details">
                  <h3>Refund Details</h3>
                  <p><strong>Order:</strong> ${refundDetails.productName}</p>
                  <p><strong>Refund Amount:</strong> $${refundDetails.amount.toFixed(2)}</p>
                  ${refundDetails.refundReason ? `<p><strong>Reason:</strong> ${refundDetails.refundReason}</p>` : ''}
                  <p><strong>Status:</strong> Processed ✅</p>
                </div>

                <div class="info-box">
                  <strong>ℹ️ Processing Time</strong><br>
                  The refund has been initiated. Please allow 3-5 business days for the funds to appear in your original payment method.
                </div>

                <p><strong>What to Expect:</strong></p>
                <ul>
                  <li>Refund sent to your original payment method</li>
                  <li>3-5 business days for processing</li>
                  <li>Check your mobile money or bank account</li>
                  <li>Contact your provider if delayed</li>
                </ul>

                <p>We apologize for any inconvenience. Thank you for your understanding!</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Payment refunded email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendEscrowReleasedEmail(
  email: string,
  userName: string,
  escrowDetails: {
    orderId: string;
    amount: number;
    productName: string;
    buyerName: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    return await sendEmail({
      to: email,
      subject: `Payment Released - Order #${escrowDetails.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .escrow-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #10b981; }
              .success-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Payment Released!</h1>
              </div>
              <div class="content">
                <p>Hello ${userName},</p>
                
                <div class="success-box">
                  <strong>Congratulations!</strong> The buyer has confirmed receipt and your payment has been released from escrow.
                </div>
                
                <div class="escrow-details">
                  <h3>Payment Details</h3>
                  <p><strong>Order:</strong> ${escrowDetails.productName}</p>
                  <p><strong>Buyer:</strong> ${escrowDetails.buyerName}</p>
                  <p><strong>Amount Released:</strong> $${escrowDetails.amount.toFixed(2)}</p>
                  <p><strong>Order ID:</strong> ${escrowDetails.orderId}</p>
                </div>

                <p><strong>Your Earnings:</strong></p>
                <ul>
                  <li>Payment added to your wallet balance</li>
                  <li>Available for immediate withdrawal</li>
                  <li>Go to Wallet page to withdraw funds</li>
                  <li>Funds can be sent to your mobile money account</li>
                </ul>

                <p>Thank you for using AgriCompass! Keep up the great work and continue providing quality products to buyers.</p>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                  <p>&copy; 2025 AgriCompass. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error: any) {
    console.error('Escrow released email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

