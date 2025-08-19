import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  isValidEmail,
  createResponse,
  sanitizeUser
} from '@/lib/simple-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email } = body;

    if (!token || !email) {
      return createResponse(false, 'Token and email are required', {}, 400);
    }

    if (!isValidEmail(email)) {
      return createResponse(false, 'Invalid email format', {}, 400);
    }

    // Find user with matching email and verification token
    const { data: user, error: userError } = await supabase
      .from('simple_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('verification_token', token)
      .single();

    if (userError || !user) {
      return createResponse(false, 'Invalid verification token or email', {}, 400);
    }

    // Check if already verified
    if (user.email_verified) {
      return createResponse(
        true, 
        'Email address is already verified', 
        { user: sanitizeUser(user) }
      );
    }

    // Check if token has expired
    if (user.verification_token_expires) {
      const expiryDate = new Date(user.verification_token_expires);
      if (Date.now() > expiryDate.getTime()) {
        return createResponse(
          false, 
          'Verification token has expired. Please request a new verification email.', 
          {}, 
          400
        );
      }
    }

    // Update user as verified
    const { data: updatedUser, error: updateError } = await supabase
      .from('simple_users')
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('User verification update error:', updateError);
      return createResponse(false, 'Failed to verify email address', {}, 500);
    }

    return createResponse(
      true, 
      'Email address verified successfully!', 
      { user: sanitizeUser(updatedUser) }
    );

  } catch (error) {
    console.error('Email verification error:', error);
    return createResponse(false, 'Internal server error', {}, 500);
  }
}

export async function GET(request: NextRequest) {
  // Handle verification via GET request (email links)
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>Email Verification - Error</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
          <h2>Invalid Verification Link</h2>
          <p>The verification link is missing required parameters.</p>
          <a href="/auth/signin">Go to Sign In</a>
        </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Use the same logic as POST
    const { data: user, error: userError } = await supabase
      .from('simple_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('verification_token', token)
      .single();

    if (userError || !user) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>Email Verification - Error</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
          <h2>Verification Failed</h2>
          <p>Invalid verification token or email address.</p>
          <a href="/auth/signin">Go to Sign In</a>
        </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (user.email_verified) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>Email Already Verified</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
          <h2>Email Already Verified</h2>
          <p>Your email address has already been verified.</p>
          <a href="/auth/signin" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Sign In</a>
        </body>
        </html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Check expiry
    if (user.verification_token_expires) {
      const expiryDate = new Date(user.verification_token_expires);
      if (Date.now() > expiryDate.getTime()) {
        return new Response(
          `<!DOCTYPE html>
          <html>
          <head><title>Verification Link Expired</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
            <h2>Verification Link Expired</h2>
            <p>This verification link has expired. Please request a new one.</p>
            <a href="/auth/signin">Go to Sign In</a>
          </body>
          </html>`,
          { status: 400, headers: { 'Content-Type': 'text/html' } }
        );
      }
    }

    // Verify the email
    const { error: updateError } = await supabase
      .from('simple_users')
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null
      })
      .eq('id', user.id);

    if (updateError) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>Verification Error</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
          <h2>Verification Error</h2>
          <p>An error occurred while verifying your email address.</p>
          <a href="/auth/signin">Go to Sign In</a>
        </body>
        </html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response(
      `<!DOCTYPE html>
      <html>
      <head><title>Email Verified Successfully</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
        <h2 style="color: #28a745;">🎉 Email Verified Successfully!</h2>
        <p>Welcome to Sales Training Simulator, ${user.name || 'there'}!</p>
        <p>Your email address has been verified and your account is now active.</p>
        <a href="/auth/signin" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Sign In to Your Account</a>
      </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Email verification GET error:', error);
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head><title>Verification Error</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
        <h2>Verification Error</h2>
        <p>An unexpected error occurred.</p>
        <a href="/auth/signin">Go to Sign In</a>
      </body>
      </html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

export async function OPTIONS() {
  return createResponse(true, 'OK');
}
