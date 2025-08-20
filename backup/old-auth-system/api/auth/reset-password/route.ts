import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  validateEmail,
  validatePassword,
  hashPassword,
  createSuccessResponse,
  createErrorResponse,
  extractIpAddress,
  extractUserAgent,
  isExpired
} from '@/lib/auth';
import { sendSecurityNotificationEmail } from '@/lib/email';
import {
  ResetPasswordRequest,
  ResetPasswordResponse
} from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: ResetPasswordRequest = await request.json();
    const { token, password, email } = body;

    // Extract request metadata
    const ipAddress = extractIpAddress(request);
    const userAgent = extractUserAgent(request);

    // Validate required fields
    if (!token || !password || !email) {
      return createErrorResponse('Token, password, and email are required', 400);
    }

    // Validate email format
    if (!validateEmail(email)) {
      return createErrorResponse('Invalid email format', 400);
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return createErrorResponse(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        400
      );
    }

    // Find user with matching email and reset token
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('password_reset_token', token)
      .single();

    if (userError || !user) {
      await supabase
        .from('auth_audit_log')
        .insert({
          action: 'failed_password_reset',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { email, reason: 'invalid_token_or_email' },
          success: false,
          error_message: 'Invalid reset token or email'
        });

      return createErrorResponse('Invalid reset token or email address', 400);
    }

    // Check if reset token has expired
    if (user.password_reset_expires) {
      const expiryDate = new Date(user.password_reset_expires);
      if (isExpired(expiryDate)) {
        await supabase
          .from('auth_audit_log')
          .insert({
            user_id: user.id,
            action: 'failed_password_reset',
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: { reason: 'token_expired' },
            success: false,
            error_message: 'Reset token expired'
          });

        return createErrorResponse(
          'Reset token has expired. Please request a new password reset.',
          400
        );
      }
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user with new password and clear reset token
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires: null,
        failed_login_attempts: 0, // Reset failed attempts
        locked_until: null, // Unlock account if it was locked
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user password:', updateError);
      
      await supabase
        .from('auth_audit_log')
        .insert({
          user_id: user.id,
          action: 'failed_password_reset',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { reason: 'database_error' },
          success: false,
          error_message: 'Failed to update password'
        });

      return createErrorResponse('Failed to reset password', 500);
    }

    // Invalidate all existing sessions for security
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', user.id);

    // Create audit log entry
    await supabase
      .from('auth_audit_log')
      .insert({
        user_id: user.id,
        action: 'password_reset',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { email: user.email },
        success: true
      });

    // Send security notification
    try {
      await sendSecurityNotificationEmail(
        user,
        'Password successfully reset',
        ipAddress
      );
    } catch (emailError) {
      console.error('Failed to send security notification:', emailError);
    }

    const response: ResetPasswordResponse = {
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.'
    };

    return createSuccessResponse(response, 'Password reset successful', 200);

  } catch (error) {
    console.error('Reset password error:', error);
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
