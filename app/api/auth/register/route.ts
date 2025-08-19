import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  hashPassword,
  validatePassword,
  validateEmail,
  generateVerificationToken,
  createSuccessResponse,
  createErrorResponse,
  sanitizeUser,
  extractIpAddress,
  extractUserAgent
} from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import {
  RegisterRequest,
  RegisterResponse,
  AuthUser,
  UserRole,
  InvitationToken
} from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, name, department, invitation_token } = body;

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

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return createErrorResponse(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        400
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return createErrorResponse('An account with this email already exists', 409);
    }

    let assignedRole: UserRole = 'user';
    let managerId: string | null = null;
    let invitationData: InvitationToken | null = null;

    // If invitation token provided, validate and get role assignment
    if (invitation_token) {
      const { data: invitation, error: inviteError } = await supabase
        .from('invitation_tokens')
        .select('*')
        .eq('token', invitation_token)
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invitation) {
        return createErrorResponse('Invalid or expired invitation token', 400);
      }

      invitationData = invitation;
      assignedRole = invitation.assigned_role;
      managerId = invitation.assigned_manager_id;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const { token: verificationToken, expires: verificationExpires } = generateVerificationToken();

    // Create user record
    const newUser = {
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: assignedRole,
      name: name || null,
      department: department || 'Sales',
      manager_id: managerId,
      email_verified: false,
      verification_token: verificationToken,
      verification_token_expires: verificationExpires.toISOString(),
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .insert(newUser)
      .select()
      .single();

    if (userError) {
      console.error('Failed to create user:', userError);
      return createErrorResponse('Failed to create account', 500);
    }

    // Mark invitation as accepted if used
    if (invitationData) {
      await supabase
        .from('invitation_tokens')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationData.id);
    }

    // Create audit log entry
    await supabase
      .from('auth_audit_log')
      .insert({
        user_id: user.id,
        action: 'register',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          role: assignedRole,
          invitation_used: !!invitation_token,
          invitation_id: invitationData?.id
        },
        success: true
      });

    // Send verification email
    try {
      const emailSent = await sendVerificationEmail(user, verificationToken);
      if (!emailSent) {
        console.warn('Failed to send verification email to:', email);
      }
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
    }

    // If this is a manager role, create default permissions
    if (assignedRole === 'manager') {
      await supabase
        .from('user_permissions')
        .insert({
          manager_id: user.id,
          allow_user_saving: true,
          allow_scenario_sharing: false,
          max_scenarios_per_user: 50
        });
    }

    const response: RegisterResponse = {
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user: sanitizeUser(user),
      verification_required: true
    };

    return createSuccessResponse(response, 'Registration successful', 201);

  } catch (error) {
    console.error('Registration error:', error);
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
