import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Skip email sending if no API key (e.g., in tests)
    if (!resend) {
      console.log('Email service not configured, skipping password reset email');
      return { success: true };
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    
    const { data, error } = await resend.emails.send({
      from: 'AgriCompass <noreply@agricompass.com>',
      to: [email],
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

    if (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendWelcomeEmail(
  email: string,
  userName: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Skip email sending if no API key (e.g., in tests)
    if (!resend) {
      console.log('Email service not configured, skipping welcome email');
      return { success: true };
    }

    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/login`;
    
    const { data, error } = await resend.emails.send({
      from: 'AgriCompass <noreply@agricompass.com>',
      to: [email],
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

    if (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
