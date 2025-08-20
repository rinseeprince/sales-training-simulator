import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  validateEmail,
  createSuccessResponse,
  createErrorResponse,
  sanitizeUser,
  extractIpAddress,
  extractUserAgent,
  isExpired
} from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import {
  VerifyEmailRequest,
  VerifyEmailResponse
} from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: VerifyEmailRequest = await request.json();
    const { token, email } = body;

    // Extract request metadata
    const ipAddress = extractIpAddress(request);
    const userAgent = extractUserAgent(request);

    // Validate required fields
    if (!token || !email) {
      return createErrorResponse('Token and email are required', 400);
    }

    // Validate email format
    if (!validateEmail(email)) {
      return createErrorResponse('Invalid email format', 400);
    }

    // Find user with matching email and verification token
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('verification_token', token)
      .single();

    if (userError || !user) {
      // Log failed verification attempt
      await supabase
        .from('auth_audit_log')
        .insert({
          action: 'failed_email_verification',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { email, reason: 'invalid_token_or_email' },
          success: false,
          error_message: 'Invalid verification token or email'
        });

      return createErrorResponse('Invalid verification token or email address', 400);
    }

    // Check if email is already verified
    if (user.email_verified) {
      const response: VerifyEmailResponse = {
        success: true,
        message: 'Email address is already verified',
        user: sanitizeUser(user)
      };

      return createSuccessResponse(response, 'Email already verified', 200);
    }

    // Check if verification token has expired
    if (user.verification_token_expires) {
      const expiryDate = new Date(user.verification_token_expires);
      if (isExpired(expiryDate)) {
        await supabase
          .from('auth_audit_log')
          .insert({
            user_id: user.id,
            action: 'failed_email_verification',
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: { reason: 'token_expired' },
            success: false,
            error_message: 'Verification token expired'
          });

        return createErrorResponse(
          'Verification token has expired. Please request a new verification email.',
          400
        );
      }
    }

    // Update user as verified and clear verification token
    const { data: updatedUser, error: updateError } = await supabase
      .from('auth_users')
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update user verification status:', updateError);
      return createErrorResponse('Failed to verify email address', 500);
    }

    // Create audit log entry
    await supabase
      .from('auth_audit_log')
      .insert({
        user_id: user.id,
        action: 'email_verify',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { email: user.email },
        success: true
      });

    // Send welcome email
    try {
      const emailSent = await sendWelcomeEmail(updatedUser);
      if (!emailSent) {
        console.warn('Failed to send welcome email to:', email);
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    const response: VerifyEmailResponse = {
      success: true,
      message: 'Email address verified successfully. Welcome to the platform!',
      user: sanitizeUser(updatedUser)
    };

    return createSuccessResponse(response, 'Email verification successful', 200);

  } catch (error) {
    console.error('Email verification error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function GET(request: NextRequest) {
  // Handle verification via GET request (when user clicks email link)
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verification - Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>Invalid Verification Link</h2>
            <p>The verification link is missing required parameters. Please check your email and try again.</p>
            <a href="/auth/signin">Go to Sign In</a>
          </div>
        </body>
        </html>
        `,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Perform the same verification logic as POST
    const verificationRequest = { token, email };
    const ipAddress = extractIpAddress(request);
    const userAgent = extractUserAgent(request);

    // Find user with matching email and verification token
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('verification_token', token)
      .single();

    if (userError || !user) {
      await supabase
        .from('auth_audit_log')
        .insert({
          action: 'failed_email_verification',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { email, reason: 'invalid_token_or_email' },
          success: false,
          error_message: 'Invalid verification token or email'
        });

      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verification - Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>Verification Failed</h2>
            <p>Invalid verification token or email address. Please check your email and try again.</p>
            <a href="/auth/signin">Go to Sign In</a>
          </div>
        </body>
        </html>
        `,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Check if already verified
    if (user.email_verified) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Already Verified</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #155724; background: #d4edda; padding: 20px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>Email Already Verified</h2>
            <p>Your email address has already been verified. You can now sign in to your account.</p>
            <a href="/auth/signin" class="button">Go to Sign In</a>
          </div>
        </body>
        </html>
        `,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Check if token expired
    if (user.verification_token_expires) {
      const expiryDate = new Date(user.verification_token_expires);
      if (isExpired(expiryDate)) {
        await supabase
          .from('auth_audit_log')
          .insert({
            user_id: user.id,
            action: 'failed_email_verification',
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: { reason: 'token_expired' },
            success: false,
            error_message: 'Verification token expired'
          });

        return new Response(
          `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Link Expired</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .warning { color: #856404; background: #fff3cd; padding: 20px; border-radius: 8px; }
              .button { display: inline-block; padding: 12px 24px; background: #ffc107; color: #212529; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="warning">
              <h2>Verification Link Expired</h2>
              <p>This verification link has expired. Please request a new verification email.</p>
              <a href="/auth/resend-verification" class="button">Request New Verification Email</a>
            </div>
          </body>
          </html>
          `,
          {
            status: 400,
            headers: { 'Content-Type': 'text/html' }
          }
        );
      }
    }

    // Verify the email
    const { data: updatedUser, error: updateError } = await supabase
      .from('auth_users')
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update user verification status:', updateError);
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verification Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>Verification Error</h2>
            <p>An error occurred while verifying your email address. Please try again later.</p>
            <a href="/auth/signin">Go to Sign In</a>
          </div>
        </body>
        </html>
        `,
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Create audit log entry
    await supabase
      .from('auth_audit_log')
      .insert({
        user_id: user.id,
        action: 'email_verify',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { email: user.email, method: 'GET' },
        success: true
      });

    // Send welcome email
    try {
      await sendWelcomeEmail(updatedUser);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified Successfully</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .success { color: #155724; background: #d4edda; padding: 30px; border-radius: 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
          h1 { color: #28a745; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>🎉 Email Verified Successfully!</h1>
          <p>Welcome to Sales Training Simulator, ${user.name || 'there'}!</p>
          <p>Your email address has been verified and your account is now active. You can now sign in and start improving your sales skills.</p>
          <a href="/auth/signin" class="button">Sign In to Your Account</a>
        </div>
      </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );

  } catch (error) {
    console.error('Email verification GET error:', error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>Verification Error</h2>
          <p>An unexpected error occurred. Please try again later.</p>
          <a href="/auth/signin">Go to Sign In</a>
        </div>
      </body>
      </html>
      `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
