// Simple Email Service for Development
// This can be easily replaced with SendGrid, Resend, AWS SES, etc.

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface VerificationEmailData {
  to: string;
  name?: string;
  token: string;
  appName?: string;
  appUrl?: string;
}

/**
 * Send email (development version - logs to console)
 * Replace this with your preferred email service
 */
export async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    // For development, log emails to console
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email would be sent:');
      console.log('   To:', data.to);
      console.log('   Subject:', data.subject);
      console.log('   HTML Content:', data.html);
      if (data.text) {
        console.log('   Text Content:', data.text);
      }
      return true;
    }

    // TODO: Implement actual email service integration
    // Options:
    // 1. SendGrid: https://sendgrid.com/
    // 2. Resend: https://resend.com/
    // 3. AWS SES: https://aws.amazon.com/ses/
    // 4. Nodemailer with SMTP
    // 5. Supabase Auth email functions

    console.warn('Email service not configured. Email not sent.');
    return false;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
  const appName = data.appName || 'Sales Training Simulator';
  const appUrl = data.appUrl || 'http://localhost:3000';
  
  const verificationUrl = `${appUrl}/auth/verify-email?token=${data.token}&email=${encodeURIComponent(data.to)}`;
  
  const subject = `Welcome to ${appName} - Please verify your email`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f8f9fa;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px; 
        }
        .button { 
          display: inline-block; 
          padding: 14px 28px; 
          background: #667eea; 
          color: white; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 20px 0; 
          font-weight: 500;
          font-size: 16px;
        }
        .button:hover {
          background: #5a6fd8;
        }
        .footer { 
          background: #f8f9fa; 
          padding: 30px; 
          text-align: center; 
          color: #666; 
          font-size: 14px; 
          border-top: 1px solid #e9ecef;
        }
        .verification-link {
          word-break: break-all;
          color: #667eea;
          font-family: monospace;
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${appName}!</h1>
        </div>
        <div class="content">
          <h2>Hi ${data.name || 'there'}!</h2>
          <p>Thank you for creating an account with ${appName}. To get started, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <div class="verification-link">${verificationUrl}</div>
          
          <p><strong>This link will expire in 24 hours.</strong></p>
          
          <p>If you didn't create an account with ${appName}, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to ${appName}!

Hi ${data.name || 'there'}!

Thank you for creating an account with ${appName}. To get started, please verify your email address by visiting this link:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with ${appName}, you can safely ignore this email.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
  `;

  return sendEmail({
    to: data.to,
    subject,
    html,
    text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: VerificationEmailData): Promise<boolean> {
  const appName = data.appName || 'Sales Training Simulator';
  const appUrl = data.appUrl || 'http://localhost:3000';
  
  const resetUrl = `${appUrl}/auth/reset-password?token=${data.token}&email=${encodeURIComponent(data.to)}`;
  
  const subject = `Reset your ${appName} password`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f8f9fa;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px; 
        }
        .button { 
          display: inline-block; 
          padding: 14px 28px; 
          background: #667eea; 
          color: white; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 20px 0; 
          font-weight: 500;
          font-size: 16px;
        }
        .button:hover {
          background: #5a6fd8;
        }
        .footer { 
          background: #f8f9fa; 
          padding: 30px; 
          text-align: center; 
          color: #666; 
          font-size: 14px; 
          border-top: 1px solid #e9ecef;
        }
        .reset-link {
          word-break: break-all;
          color: #667eea;
          font-family: monospace;
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <h2>Hi ${data.name || 'there'}!</h2>
          <p>We received a request to reset your password for your ${appName} account. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <div class="reset-link">${resetUrl}</div>
          
          <p><strong>This link will expire in 1 hour.</strong></p>
          
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Reset Your Password

Hi ${data.name || 'there'}!

We received a request to reset your password for your ${appName} account. Visit this link to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
  `;

  return sendEmail({
    to: data.to,
    subject,
    html,
    text,
  });
}
