import { EmailTemplate, EmailContext, AuthUser, InvitationToken } from '@/types/auth';

// Email service configuration
const EMAIL_CONFIG = {
  from: process.env.FROM_EMAIL || 'noreply@salestraining.com',
  appName: process.env.APP_NAME || 'Sales Training Simulator',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@salestraining.com'
};

/**
 * Send email using Supabase Auth (or configure with your preferred service)
 * Note: This is a placeholder - you'll need to configure actual email service
 */
async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  try {
    // For development, log emails to console
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email would be sent to:', to);
      console.log('📧 Subject:', subject);
      console.log('📧 HTML Content:', html);
      console.log('📧 Text Content:', text);
      return true;
    }

    // TODO: Implement actual email service integration
    // Options:
    // 1. Supabase Auth email functions
    // 2. SendGrid
    // 3. AWS SES
    // 4. Resend
    // 5. Nodemailer with SMTP
    
    // Example with fetch to email service:
    // const response = await fetch('YOUR_EMAIL_SERVICE_ENDPOINT', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
    //   },
    //   body: JSON.stringify({
    //     to,
    //     from: EMAIL_CONFIG.from,
    //     subject,
    //     html,
    //     text
    //   })
    // });
    
    // return response.ok;
    
    console.warn('Email service not configured. Email not sent.');
    return false;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Generate email verification template
 */
export function generateVerificationEmailTemplate(context: EmailContext): EmailTemplate {
  const { user, token, appName, appUrl } = context;
  const verificationUrl = `${appUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(user?.email || '')}`;

  const subject = `Welcome to ${appName} - Please verify your email`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${appName}!</h1>
        </div>
        <div class="content">
          <h2>Hi ${user?.name || 'there'}!</h2>
          <p>Thank you for creating an account with ${appName}. To get started, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
          
          <p><strong>This verification link will expire in 24 hours.</strong></p>
          
          <p>If you didn't create this account, you can safely ignore this email.</p>
          
          <p>Best regards,<br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p>Questions? Contact us at <a href="mailto:${EMAIL_CONFIG.supportEmail}">${EMAIL_CONFIG.supportEmail}</a></p>
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to ${appName}!
    
    Hi ${user?.name || 'there'}!
    
    Thank you for creating an account with ${appName}. To get started, please verify your email address by visiting this link:
    
    ${verificationUrl}
    
    This verification link will expire in 24 hours.
    
    If you didn't create this account, you can safely ignore this email.
    
    Best regards,
    The ${appName} Team
    
    Questions? Contact us at ${EMAIL_CONFIG.supportEmail}
  `;

  return { subject, html, text };
}

/**
 * Generate password reset email template
 */
export function generatePasswordResetEmailTemplate(context: EmailContext): EmailTemplate {
  const { user, token, appName, appUrl } = context;
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(user?.email || '')}`;

  const subject = `Reset your ${appName} password`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 8px 8px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hi ${user?.name || 'there'}!</h2>
          <p>We received a request to reset the password for your ${appName} account.</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
          
          <div class="warning">
            <strong>⚠️ Important Security Information:</strong>
            <ul>
              <li>This password reset link will expire in 1 hour</li>
              <li>The link can only be used once</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your password will remain unchanged until you create a new one</li>
            </ul>
          </div>
          
          <p>If you continue to have problems or didn't request this reset, please contact our support team.</p>
          
          <p>Best regards,<br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p>Questions? Contact us at <a href="mailto:${EMAIL_CONFIG.supportEmail}">${EMAIL_CONFIG.supportEmail}</a></p>
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Password Reset Request
    
    Hi ${user?.name || 'there'}!
    
    We received a request to reset the password for your ${appName} account.
    
    Please click the following link to reset your password:
    ${resetUrl}
    
    IMPORTANT SECURITY INFORMATION:
    - This password reset link will expire in 1 hour
    - The link can only be used once
    - If you didn't request this reset, please ignore this email
    - Your password will remain unchanged until you create a new one
    
    If you continue to have problems or didn't request this reset, please contact our support team at ${EMAIL_CONFIG.supportEmail}
    
    Best regards,
    The ${appName} Team
  `;

  return { subject, html, text };
}

/**
 * Generate invitation email template
 */
export function generateInvitationEmailTemplate(context: EmailContext, invitation: InvitationToken): EmailTemplate {
  const { inviter, appName, appUrl } = context;
  const invitationUrl = `${appUrl}/auth/accept-invitation?token=${invitation.token}`;
  const roleTitle = invitation.assigned_role.charAt(0).toUpperCase() + invitation.assigned_role.slice(1);

  const subject = `You've been invited to join ${appName} as a ${roleTitle}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 8px 8px; }
        .invitation-details { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Invited!</h1>
        </div>
        <div class="content">
          <h2>Join ${appName}</h2>
          <p>Hi there!</p>
          <p>${inviter?.name || 'Someone'} has invited you to join ${appName} as a <strong>${roleTitle}</strong>.</p>
          
          <div class="invitation-details">
            <h3>Invitation Details:</h3>
            <ul>
              <li><strong>Role:</strong> ${roleTitle}</li>
              <li><strong>Invited by:</strong> ${inviter?.name || 'System Administrator'} (${inviter?.email || 'system@company.com'})</li>
              <li><strong>Organization:</strong> ${inviter?.department || 'Sales Team'}</li>
              <li><strong>Expires:</strong> ${new Date(invitation.expires_at).toLocaleDateString()}</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="${invitationUrl}" class="button">Accept Invitation</a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #28a745;">${invitationUrl}</p>
          
          <p><strong>This invitation will expire in 7 days.</strong></p>
          
          <h3>What is ${appName}?</h3>
          <p>${appName} is a comprehensive sales training platform that helps sales teams improve their skills through AI-powered simulations, real-time feedback, and performance analytics.</p>
          
          <p>If you have any questions about this invitation, please contact ${inviter?.name || 'your administrator'} or our support team.</p>
          
          <p>Welcome to the team!<br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p>Questions? Contact us at <a href="mailto:${EMAIL_CONFIG.supportEmail}">${EMAIL_CONFIG.supportEmail}</a></p>
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    You're Invited to Join ${appName}!
    
    Hi there!
    
    ${inviter?.name || 'Someone'} has invited you to join ${appName} as a ${roleTitle}.
    
    INVITATION DETAILS:
    - Role: ${roleTitle}
    - Invited by: ${inviter?.name || 'System Administrator'} (${inviter?.email || 'system@company.com'})
    - Organization: ${inviter?.department || 'Sales Team'}
    - Expires: ${new Date(invitation.expires_at).toLocaleDateString()}
    
    To accept this invitation, please visit:
    ${invitationUrl}
    
    This invitation will expire in 7 days.
    
    ABOUT ${appName}:
    ${appName} is a comprehensive sales training platform that helps sales teams improve their skills through AI-powered simulations, real-time feedback, and performance analytics.
    
    If you have any questions about this invitation, please contact ${inviter?.name || 'your administrator'} or our support team at ${EMAIL_CONFIG.supportEmail}
    
    Welcome to the team!
    The ${appName} Team
  `;

  return { subject, html, text };
}

/**
 * Generate welcome email template (after successful registration)
 */
export function generateWelcomeEmailTemplate(context: EmailContext): EmailTemplate {
  const { user, appName, appUrl } = context;

  const subject = `Welcome to ${appName}!`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 8px 8px; }
        .feature-list { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${appName}!</h1>
        </div>
        <div class="content">
          <h2>Hi ${user?.name}!</h2>
          <p>Congratulations! Your email has been verified and your account is now active. You're ready to start improving your sales skills with ${appName}.</p>
          
          <div style="text-align: center;">
            <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>
          </div>
          
          <div class="feature-list">
            <h3>🚀 What you can do now:</h3>
            <ul>
              <li><strong>Create Scenarios:</strong> Build custom sales scenarios tailored to your needs</li>
              <li><strong>Practice Calls:</strong> Engage with AI prospects in realistic simulations</li>
              <li><strong>Get Feedback:</strong> Receive detailed analysis and coaching insights</li>
              <li><strong>Track Progress:</strong> Monitor your improvement over time</li>
              <li><strong>Join Your Team:</strong> Collaborate with colleagues and share best practices</li>
            </ul>
          </div>
          
          <h3>📚 Getting Started Tips:</h3>
          <ol>
            <li>Complete your profile setup in the Settings page</li>
            <li>Try your first simulation with one of our template scenarios</li>
            <li>Review the performance feedback to identify areas for improvement</li>
            <li>Create custom scenarios that match your real sales situations</li>
          </ol>
          
          <p>If you need any help getting started, don't hesitate to reach out to our support team or check out our documentation.</p>
          
          <p>Happy selling!<br>The ${appName} Team</p>
        </div>
        <div class="footer">
          <p>Questions? Contact us at <a href="mailto:${EMAIL_CONFIG.supportEmail}">${EMAIL_CONFIG.supportEmail}</a></p>
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to ${appName}!
    
    Hi ${user?.name}!
    
    Congratulations! Your email has been verified and your account is now active. You're ready to start improving your sales skills with ${appName}.
    
    Go to your dashboard: ${appUrl}/dashboard
    
    WHAT YOU CAN DO NOW:
    - Create Scenarios: Build custom sales scenarios tailored to your needs
    - Practice Calls: Engage with AI prospects in realistic simulations
    - Get Feedback: Receive detailed analysis and coaching insights
    - Track Progress: Monitor your improvement over time
    - Join Your Team: Collaborate with colleagues and share best practices
    
    GETTING STARTED TIPS:
    1. Complete your profile setup in the Settings page
    2. Try your first simulation with one of our template scenarios
    3. Review the performance feedback to identify areas for improvement
    4. Create custom scenarios that match your real sales situations
    
    If you need any help getting started, don't hesitate to reach out to our support team at ${EMAIL_CONFIG.supportEmail}
    
    Happy selling!
    The ${appName} Team
  `;

  return { subject, html, text };
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(user: AuthUser, token: string): Promise<boolean> {
  const context: EmailContext = {
    user,
    token,
    appName: EMAIL_CONFIG.appName,
    appUrl: EMAIL_CONFIG.appUrl,
    supportEmail: EMAIL_CONFIG.supportEmail
  };

  const template = generateVerificationEmailTemplate(context);
  return sendEmail(user.email, template.subject, template.html, template.text);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(user: AuthUser, token: string): Promise<boolean> {
  const context: EmailContext = {
    user,
    token,
    appName: EMAIL_CONFIG.appName,
    appUrl: EMAIL_CONFIG.appUrl,
    supportEmail: EMAIL_CONFIG.supportEmail
  };

  const template = generatePasswordResetEmailTemplate(context);
  return sendEmail(user.email, template.subject, template.html, template.text);
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  invitation: InvitationToken,
  inviter: AuthUser
): Promise<boolean> {
  const context: EmailContext = {
    inviter,
    appName: EMAIL_CONFIG.appName,
    appUrl: EMAIL_CONFIG.appUrl,
    supportEmail: EMAIL_CONFIG.supportEmail
  };

  const template = generateInvitationEmailTemplate(context, invitation);
  return sendEmail(invitation.email, template.subject, template.html, template.text);
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(user: AuthUser): Promise<boolean> {
  const context: EmailContext = {
    user,
    appName: EMAIL_CONFIG.appName,
    appUrl: EMAIL_CONFIG.appUrl,
    supportEmail: EMAIL_CONFIG.supportEmail
  };

  const template = generateWelcomeEmailTemplate(context);
  return sendEmail(user.email, template.subject, template.html, template.text);
}

/**
 * Send account security notification
 */
export async function sendSecurityNotificationEmail(
  user: AuthUser,
  action: string,
  ipAddress?: string
): Promise<boolean> {
  const subject = `Security Alert: ${action} on your ${EMAIL_CONFIG.appName} account`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Security Alert</h2>
        <p>Hi ${user.name},</p>
        <div class="alert">
          <strong>Action:</strong> ${action}<br>
          <strong>Time:</strong> ${new Date().toLocaleString()}<br>
          ${ipAddress ? `<strong>IP Address:</strong> ${ipAddress}<br>` : ''}
          <strong>Account:</strong> ${user.email}
        </div>
        <p>If this was you, you can safely ignore this email. If you didn't perform this action, please contact support immediately.</p>
        <p>Best regards,<br>The ${EMAIL_CONFIG.appName} Security Team</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Security Alert: ${action}
    
    Hi ${user.name},
    
    Action: ${action}
    Time: ${new Date().toLocaleString()}
    ${ipAddress ? `IP Address: ${ipAddress}` : ''}
    Account: ${user.email}
    
    If this was you, you can safely ignore this email. If you didn't perform this action, please contact support immediately.
    
    Best regards,
    The ${EMAIL_CONFIG.appName} Security Team
  `;

  return sendEmail(user.email, subject, html, text);
}
