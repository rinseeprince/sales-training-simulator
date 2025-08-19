import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthUser, UserRole, PasswordValidation, AuthError, ApiResponse } from '@/types/auth';

// Environment variables with fallbacks
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// Password validation configuration
const PASSWORD_CONFIG = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128
};

// Account lockout configuration
const LOCKOUT_CONFIG = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
  resetAfter: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
};

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a shorter, URL-safe token for invitations
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < PASSWORD_CONFIG.minLength) {
    errors.push(`Password must be at least ${PASSWORD_CONFIG.minLength} characters long`);
  } else {
    score += 1;
  }

  // Check maximum length
  if (password.length > PASSWORD_CONFIG.maxLength) {
    errors.push(`Password must be no more than ${PASSWORD_CONFIG.maxLength} characters long`);
  }

  // Check for uppercase letters
  if (PASSWORD_CONFIG.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 1;
  }

  // Check for lowercase letters
  if (PASSWORD_CONFIG.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 1;
  }

  // Check for numbers
  if (PASSWORD_CONFIG.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 1;
  }

  // Check for special characters
  if (PASSWORD_CONFIG.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  }

  // Additional scoring for length and complexity
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>].*[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1; // Multiple special chars

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong';
  if (score >= 6) strength = 'strong';
  else if (score >= 4) strength = 'medium';
  else strength = 'weak';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score
  };
}

/**
 * Generate JWT tokens
 */
export function generateTokens(user: AuthUser): { accessToken: string; refreshToken: string } {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    manager_id: user.manager_id,
    email_verified: user.email_verified
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'sales-training-simulator',
    audience: 'sales-training-app'
  });

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'sales-training-simulator',
      audience: 'sales-training-app'
    }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string, isRefreshToken: boolean = false): any {
  try {
    const secret = isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET;
    return jwt.verify(token, secret, {
      issuer: 'sales-training-simulator',
      audience: 'sales-training-app'
    });
  } catch (error) {
    throw new AuthError('Invalid or expired token', 'INVALID_TOKEN', 401);
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if user should be locked out
 */
export function shouldLockAccount(failedAttempts: number, lastFailedAt?: Date): boolean {
  if (failedAttempts < LOCKOUT_CONFIG.maxAttempts) {
    return false;
  }

  // If no last failed attempt, lock the account
  if (!lastFailedAt) {
    return true;
  }

  // Check if the lockout period has expired
  const timeSinceLastFailed = Date.now() - lastFailedAt.getTime();
  return timeSinceLastFailed < LOCKOUT_CONFIG.lockoutDuration;
}

/**
 * Calculate lockout expiry time
 */
export function calculateLockoutExpiry(): Date {
  return new Date(Date.now() + LOCKOUT_CONFIG.lockoutDuration);
}

/**
 * Check if lockout has expired
 */
export function isLockoutExpired(lockedUntil: Date): boolean {
  return Date.now() > lockedUntil.getTime();
}

/**
 * Check if failed attempts should be reset
 */
export function shouldResetFailedAttempts(lastFailedAt: Date): boolean {
  const timeSinceLastFailed = Date.now() - lastFailedAt.getTime();
  return timeSinceLastFailed > LOCKOUT_CONFIG.resetAfter;
}

/**
 * Role hierarchy helpers
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 1,
  manager: 2,
  admin: 3
};

export function hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isHigherRole(userRole: UserRole, compareRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[compareRole];
}

/**
 * Permission helpers
 */
export interface Permission {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [
    { action: 'read', resource: 'own_profile' },
    { action: 'update', resource: 'own_profile' },
    { action: 'read', resource: 'public_scenarios' },
    { action: 'read', resource: 'manager_shared_scenarios' },
    { action: 'create', resource: 'personal_scenarios', conditions: { with_manager_permission: true } },
    { action: 'read', resource: 'own_calls' },
    { action: 'create', resource: 'own_calls' }
  ],
  manager: [
    { action: 'read', resource: 'own_profile' },
    { action: 'update', resource: 'own_profile' },
    { action: 'read', resource: 'team_profiles' },
    { action: 'read', resource: 'all_scenarios' },
    { action: 'create', resource: 'scenarios' },
    { action: 'update', resource: 'own_scenarios' },
    { action: 'share', resource: 'scenarios' },
    { action: 'read', resource: 'team_calls' },
    { action: 'update', resource: 'team_permissions' },
    { action: 'invite', resource: 'users' }
  ],
  admin: [
    { action: '*', resource: '*' } // Admin has all permissions
  ]
};

export function hasPermission(
  userRole: UserRole,
  action: string,
  resource: string,
  customPermissions?: Permission[]
): boolean {
  // Admin has all permissions
  if (userRole === 'admin') {
    return true;
  }

  const permissions = customPermissions || DEFAULT_PERMISSIONS[userRole] || [];
  
  return permissions.some(permission => {
    const actionMatch = permission.action === '*' || permission.action === action;
    const resourceMatch = permission.resource === '*' || permission.resource === resource;
    return actionMatch && resourceMatch;
  });
}

/**
 * Create standardized API responses
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
): ApiResponse<T> {
  return {
    success,
    data,
    message,
    error
  };
}

/**
 * Create error response with status code
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 400,
  code?: string
): Response {
  return new Response(
    JSON.stringify(createApiResponse(false, null, undefined, message)),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  statusCode: number = 200
): Response {
  return new Response(
    JSON.stringify(createApiResponse(true, data, message)),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Sanitize user data before sending to client
 */
export function sanitizeUser(user: any): AuthUser {
  const {
    password_hash,
    verification_token,
    password_reset_token,
    ...sanitizedUser
  } = user;
  
  return sanitizedUser;
}

/**
 * Generate a verification token with expiry
 */
export function generateVerificationToken(): { token: string; expires: Date } {
  const token = generateSecureToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return { token, expires };
}

/**
 * Generate a password reset token with expiry
 */
export function generatePasswordResetToken(): { token: string; expires: Date } {
  const token = generateSecureToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { token, expires };
}

/**
 * Validate invitation token format
 */
export function validateInvitationToken(token: string): boolean {
  // Check if token is base64url format and reasonable length
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return base64urlRegex.test(token) && token.length >= 16 && token.length <= 64;
}

/**
 * Extract IP address from request
 */
export function extractIpAddress(request: Request): string {
  // Check various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIp = request.headers.get('x-client-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || clientIp || 'unknown';
}

/**
 * Extract user agent from request
 */
export function extractUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Rate limiting key generator
 */
export function generateRateLimitKey(ip: string, action: string): string {
  return `rate_limit:${action}:${ip}`;
}

/**
 * Session token helpers
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Constants for token expiry
 */
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60, // 15 minutes in seconds
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days in seconds
  VERIFICATION_TOKEN: 24 * 60 * 60, // 24 hours in seconds
  PASSWORD_RESET_TOKEN: 60 * 60, // 1 hour in seconds
  INVITATION_TOKEN: 7 * 24 * 60 * 60, // 7 days in seconds
  SESSION_TOKEN: 30 * 24 * 60 * 60 // 30 days in seconds
};

/**
 * Time helpers
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function isExpired(expiryDate: Date): boolean {
  return Date.now() > expiryDate.getTime();
}
