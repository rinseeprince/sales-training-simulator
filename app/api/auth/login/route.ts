import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  verifyPassword,
  validateEmail,
  shouldLockAccount,
  calculateLockoutExpiry,
  isLockoutExpired,
  shouldResetFailedAttempts,
  generateSessionToken,
  generateRefreshToken,
  createSuccessResponse,
  createErrorResponse,
  sanitizeUser,
  extractIpAddress,
  extractUserAgent,
  addSeconds,
  TOKEN_EXPIRY
} from '@/lib/auth';
import { sendSecurityNotificationEmail } from '@/lib/email';
import {
  LoginRequest,
  LoginResponse,
  AuthUser,
  UserPermissions
} from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password, remember_me = false } = body;

    // Extract request metadata
    const ipAddress = extractIpAddress(request);
    const userAgent = extractUserAgent(request);

    // Validate required fields
    if (!email || !password) {
      return createErrorResponse('Email and password are required', 400);
    }

    // Validate email format
    if (!validateEmail(email)) {
      return createErrorResponse('Invalid email format', 400);
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      // Log failed attempt without revealing user existence
      await supabase
        .from('auth_audit_log')
        .insert({
          action: 'failed_login',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { email, reason: 'user_not_found' },
          success: false,
          error_message: 'Invalid credentials'
        });

      return createErrorResponse('Invalid email or password', 401);
    }

    // Check if account is locked
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (!isLockoutExpired(lockedUntil)) {
        const remainingTime = Math.ceil((lockedUntil.getTime() - Date.now()) / (1000 * 60));
        
        await supabase
          .from('auth_audit_log')
          .insert({
            user_id: user.id,
            action: 'failed_login',
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: { reason: 'account_locked', remaining_minutes: remainingTime },
            success: false,
            error_message: 'Account locked'
          });

        return createErrorResponse(
          `Account is locked. Please try again in ${remainingTime} minutes.`,
          423
        );
      } else {
        // Lockout expired, reset failed attempts
        await supabase
          .from('auth_users')
          .update({
            failed_login_attempts: 0,
            locked_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
    }

    // Check if failed attempts should be reset (after 24 hours)
    if (user.failed_login_attempts > 0 && user.updated_at) {
      const lastUpdate = new Date(user.updated_at);
      if (shouldResetFailedAttempts(lastUpdate)) {
        await supabase
          .from('auth_users')
          .update({
            failed_login_attempts: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        user.failed_login_attempts = 0;
      }
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      const newFailedAttempts = user.failed_login_attempts + 1;
      const shouldLock = shouldLockAccount(newFailedAttempts);

      const updateData: any = {
        failed_login_attempts: newFailedAttempts,
        updated_at: new Date().toISOString()
      };

      if (shouldLock) {
        updateData.locked_until = calculateLockoutExpiry().toISOString();
      }

      await supabase
        .from('auth_users')
        .update(updateData)
        .eq('id', user.id);

      await supabase
        .from('auth_audit_log')
        .insert({
          user_id: user.id,
          action: 'failed_login',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: {
            failed_attempts: newFailedAttempts,
            account_locked: shouldLock,
            reason: 'invalid_password'
          },
          success: false,
          error_message: 'Invalid credentials'
        });

      if (shouldLock) {
        // Send security notification about account lockout
        try {
          await sendSecurityNotificationEmail(
            user,
            'Account locked due to multiple failed login attempts',
            ipAddress
          );
        } catch (emailError) {
          console.error('Failed to send lockout notification:', emailError);
        }

        return createErrorResponse(
          'Account has been locked due to multiple failed login attempts. Please try again in 15 minutes.',
          423
        );
      }

      return createErrorResponse('Invalid email or password', 401);
    }

    // Check if email is verified
    if (!user.email_verified) {
      await supabase
        .from('auth_audit_log')
        .insert({
          user_id: user.id,
          action: 'failed_login',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { reason: 'email_not_verified' },
          success: false,
          error_message: 'Email not verified'
        });

      const response: LoginResponse = {
        success: false,
        message: 'Please verify your email address before logging in.',
        requires_verification: true
      };

      return createSuccessResponse(response, 'Email verification required', 200);
    }

    // Reset failed login attempts on successful login
    if (user.failed_login_attempts > 0) {
      await supabase
        .from('auth_users')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    } else {
      await supabase
        .from('auth_users')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    // Generate session tokens
    const sessionToken = generateSessionToken();
    const refreshToken = generateRefreshToken();
    const sessionExpiry = remember_me ? 
      addSeconds(new Date(), TOKEN_EXPIRY.SESSION_TOKEN) : // 30 days
      addSeconds(new Date(), TOKEN_EXPIRY.ACCESS_TOKEN * 4); // 1 hour

    // Create session record
    await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        refresh_token: refreshToken,
        expires_at: sessionExpiry.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      });

    // Get user permissions if they're a manager
    let permissions: UserPermissions | null = null;
    if (user.role === 'manager') {
      const { data: userPermissions } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('manager_id', user.id)
        .single();

      permissions = userPermissions;
    }

    // Create audit log entry
    await supabase
      .from('auth_audit_log')
      .insert({
        user_id: user.id,
        action: 'login',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          remember_me,
          session_duration: remember_me ? '30_days' : '1_hour'
        },
        success: true
      });

    // Send security notification for new device/location (simplified check)
    const { data: recentSessions } = await supabase
      .from('user_sessions')
      .select('ip_address')
      .eq('user_id', user.id)
      .neq('session_token', sessionToken)
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    const isNewDevice = !recentSessions?.some(session => session.ip_address === ipAddress);
    if (isNewDevice && ipAddress !== 'unknown') {
      try {
        await sendSecurityNotificationEmail(
          user,
          'New login from unrecognized device/location',
          ipAddress
        );
      } catch (emailError) {
        console.error('Failed to send new device notification:', emailError);
      }
    }

    const response: LoginResponse = {
      success: true,
      message: 'Login successful',
      user: sanitizeUser(user),
      session_token: sessionToken,
      refresh_token: refreshToken,
      permissions
    };

    return createSuccessResponse(response, 'Login successful', 200);

  } catch (error) {
    console.error('Login error:', error);
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
