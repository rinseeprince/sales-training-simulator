import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  generateVerificationToken,
  createResponse,
  sanitizeUser,
  AuthResponse
} from '@/lib/simple-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate input
    if (!email) {
      return createResponse(false, 'Email is required', {}, 400);
    }

    // Find user
    const { data: user, error } = await supabase
      .from('simple_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return createResponse(false, 'User not found', {}, 404);
    }

    // Check if already verified
    if (user.email_verified) {
      return createResponse(false, 'Email is already verified', {}, 400);
    }

    // Generate new verification token
    const { token: verificationToken, expires: verificationExpires } = generateVerificationToken();

    // Update user with new verification token
    const { error: updateError } = await supabase
      .from('simple_users')
      .update({
        verification_token: verificationToken,
        verification_token_expires: verificationExpires.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update verification token:', updateError);
      return createResponse(false, 'Failed to generate new verification token', {}, 500);
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
      message: 'Verification email sent successfully. Please check your inbox.',
      user: sanitizeUser(user)
    };

    return createResponse(true, response.message, response);

  } catch (error) {
    console.error('Resend verification error:', error);
    return createResponse(false, 'Internal server error', {}, 500);
  }
}

export async function OPTIONS() {
  return createResponse(true, 'OK');
}
