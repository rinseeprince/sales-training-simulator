import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  verifyPassword,
  isValidEmail,
  generateSession,
  shouldLockAccount,
  getLockoutExpiry,
  isLockoutExpired,
  createResponse,
  sanitizeUser,
  getClientIP,
  LoginRequest,
  AuthResponse
} from '@/lib/simple-auth';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return createResponse(false, 'Email and password are required', {}, 400);
    }

    if (!isValidEmail(email)) {
      return createResponse(false, 'Invalid email format', {}, 400);
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('simple_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return createResponse(false, 'Invalid email or password', {}, 401);
    }

    // Check if account is locked
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (!isLockoutExpired(lockedUntil)) {
        const remainingMinutes = Math.ceil((lockedUntil.getTime() - Date.now()) / (1000 * 60));
        return createResponse(
          false, 
          `Account is locked. Try again in ${remainingMinutes} minutes.`, 
          {}, 
          423
        );
      } else {
        // Lockout expired, reset failed attempts
        await supabase
          .from('simple_users')
          .update({
            failed_login_attempts: 0,
            locked_until: null
          })
          .eq('id', user.id);
      }
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      const shouldLock = shouldLockAccount(newFailedAttempts);

      const updateData: any = {
        failed_login_attempts: newFailedAttempts
      };

      if (shouldLock) {
        updateData.locked_until = getLockoutExpiry().toISOString();
      }

      await supabase
        .from('simple_users')
        .update(updateData)
        .eq('id', user.id);

      if (shouldLock) {
        return createResponse(
          false, 
          'Account has been locked due to multiple failed login attempts. Please try again in 15 minutes.', 
          {}, 
          423
        );
      }

      return createResponse(false, 'Invalid email or password', {}, 401);
    }

    // Check if email is verified
    if (!user.email_verified) {
      const response: AuthResponse = {
        success: false,
        message: 'Please verify your email address before signing in.',
        requires_verification: true
      };
      return createResponse(false, response.message, response, 200);
    }

    // Reset failed login attempts and update last login
    await supabase
      .from('simple_users')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login: new Date().toISOString()
      })
      .eq('id', user.id);

    // Create session
    const { token: sessionToken, expires: sessionExpires } = generateSession(user.id);

    const { error: sessionError } = await supabase
      .from('simple_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: sessionExpires.toISOString()
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return createResponse(false, 'Failed to create session', {}, 500);
    }

    const response: AuthResponse = {
      success: true,
      message: 'Login successful',
      user: sanitizeUser(user),
      session_token: sessionToken
    };

    return createResponse(true, response.message, response);

  } catch (error) {
    console.error('Login error:', error);
    return createResponse(false, 'Internal server error', {}, 500);
  }
}

export async function OPTIONS() {
  return createResponse(true, 'OK');
}
