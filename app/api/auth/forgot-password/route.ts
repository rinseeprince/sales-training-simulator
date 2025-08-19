import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  validateEmail,
  generatePasswordResetToken,
  createSuccessResponse,
  createErrorResponse,
  extractIpAddress,
  extractUserAgent
} from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import {
  ForgotPasswordRequest,
  ForgotPasswordResponse
} from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: ForgotPasswordRequest = await request.json();
    const { email } = body;

    // Extract request metadata
    const ipAddress = extractIpAddress(request);
    const userAgent = extractUserAgent(request);

    // Validate required fields
    if (!email) {
      return createErrorResponse('Email is required', 400);
    }

    // Validate email format
    if (!validateEmail(email)) {
      return createErrorResponse('Invalid email format', 400);
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success message for security (don't reveal if email exists)
    const successResponse: ForgotPasswordResponse = {
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.'
    };

    if (userError || !user) {
      // Log failed attempt but don't reveal that user doesn't exist
      await supabase
        .from('auth_audit_log')
        .insert({
          action: 'failed_password_reset_request',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { email, reason: 'user_not_found' },
          success: false,
          error_message: 'User not found'
        });

      // Still return success message for security
      return createSuccessResponse(successResponse, 'Password reset email sent', 200);
    }

    // Check if account is locked
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (Date.now() < lockedUntil.getTime()) {
        await supabase
          .from('auth_audit_log')
          .insert({
            user_id: user.id,
            action: 'failed_password_reset_request',
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: { reason: 'account_locked' },
            success: false,
            error_message: 'Account locked'
          });

        // Still return success message for security
        return createSuccessResponse(successResponse, 'Password reset email sent', 200);
      }
    }

    // Generate password reset token
    const { token: resetToken, expires: resetExpires } = generatePasswordResetToken();

    // Update user with reset token
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user with reset token:', updateError);
      
      await supabase
        .from('auth_audit_log')
        .insert({
          user_id: user.id,
          action: 'failed_password_reset_request',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { reason: 'database_error' },
          success: false,
          error_message: 'Failed to generate reset token'
        });

      return createErrorResponse('Failed to process password reset request', 500);
    }

    // Send password reset email
    try {
      const emailSent = await sendPasswordResetEmail(user, resetToken);
      if (!emailSent) {
        console.warn('Failed to send password reset email to:', email);
        
        await supabase
          .from('auth_audit_log')
          .insert({
            user_id: user.id,
            action: 'failed_password_reset_request',
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: { reason: 'email_send_failed' },
            success: false,
            error_message: 'Failed to send email'
          });

        // Don't reveal email sending failure for security
        return createSuccessResponse(successResponse, 'Password reset email sent', 200);
      }
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      
      await supabase
        .from('auth_audit_log')
        .insert({
          user_id: user.id,
          action: 'failed_password_reset_request',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { reason: 'email_error', error: emailError },
          success: false,
          error_message: 'Email sending error'
        });

      // Don't reveal email error for security
      return createSuccessResponse(successResponse, 'Password reset email sent', 200);
    }

    // Create audit log entry for successful request
    await supabase
      .from('auth_audit_log')
      .insert({
        user_id: user.id,
        action: 'password_reset_request',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { email: user.email },
        success: true
      });

    return createSuccessResponse(successResponse, 'Password reset email sent', 200);

  } catch (error) {
    console.error('Forgot password error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
