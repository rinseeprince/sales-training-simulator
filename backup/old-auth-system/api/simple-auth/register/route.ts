import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  hashPassword,
  validatePassword,
  isValidEmail,
  generateVerificationToken,
  createResponse,
  sanitizeUser,
  RegisterRequest,
  AuthResponse
} from '@/lib/simple-auth';

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password) {
      return createResponse(false, 'Email and password are required', {}, 400);
    }

    if (!isValidEmail(email)) {
      return createResponse(false, 'Invalid email format', {}, 400);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return createResponse(
        false, 
        `Password validation failed: ${passwordValidation.errors.join(', ')}`, 
        {}, 
        400
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('simple_users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return createResponse(false, 'User with this email already exists', {}, 409);
    }

    // Hash password and generate verification token
    const passwordHash = await hashPassword(password);
    const { token: verificationToken, expires: verificationExpires } = generateVerificationToken();

    // Create user
    const { data: user, error } = await supabase
      .from('simple_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name || null,
        verification_token: verificationToken,
        verification_token_expires: verificationExpires.toISOString(),
        email_verified: false,
        subscription_status: 'free'
      })
      .select()
      .single();

    if (error) {
      console.error('User creation error:', error);
      return createResponse(false, 'Failed to create user account', {}, 500);
    }

    // Send verification email
    const { sendVerificationEmail } = await import('@/lib/email-service');
    await sendVerificationEmail({
      to: email,
      name: user.name,
      token: verificationToken,
      appName: process.env.APP_NAME || 'Sales Training Simulator',
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    });

    const response: AuthResponse = {
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user: sanitizeUser(user),
      requires_verification: true
    };

    return createResponse(true, response.message, response);

  } catch (error) {
    console.error('Registration error:', error);
    return createResponse(false, 'Internal server error', {}, 500);
  }
}

export async function OPTIONS() {
  return createResponse(true, 'OK');
}
