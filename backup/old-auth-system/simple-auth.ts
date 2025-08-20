import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Simple auth configuration
const SIMPLE_AUTH_CONFIG = {
  bcryptRounds: 10,
  sessionExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  verificationExpiry: 24 * 60 * 60 * 1000, // 24 hours
  resetExpiry: 60 * 60 * 1000, // 1 hour
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

// Types for simple auth
export interface SimpleUser {
  id: string;
  email: string;
  name?: string;
  email_verified: boolean;
  subscription_status: 'free' | 'paid' | 'trial';
  created_at: string;
  updated_at: string;
}

export interface SimpleSession {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: SimpleUser;
  session_token?: string;
  requires_verification?: boolean;
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SIMPLE_AUTH_CONFIG.bcryptRounds);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate secure random token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength (simple)
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate verification token with expiry
 */
export function generateVerificationToken(): { token: string; expires: Date } {
  return {
    token: generateToken(),
    expires: new Date(Date.now() + SIMPLE_AUTH_CONFIG.verificationExpiry)
  };
}

/**
 * Generate password reset token with expiry
 */
export function generateResetToken(): { token: string; expires: Date } {
  return {
    token: generateToken(),
    expires: new Date(Date.now() + SIMPLE_AUTH_CONFIG.resetExpiry)
  };
}

/**
 * Generate session with expiry
 */
export function generateSession(userId: string): { token: string; expires: Date } {
  return {
    token: generateSessionToken(),
    expires: new Date(Date.now() + SIMPLE_AUTH_CONFIG.sessionExpiry)
  };
}

/**
 * Check if account should be locked
 */
export function shouldLockAccount(failedAttempts: number): boolean {
  return failedAttempts >= SIMPLE_AUTH_CONFIG.maxFailedAttempts;
}

/**
 * Calculate lockout expiry
 */
export function getLockoutExpiry(): Date {
  return new Date(Date.now() + SIMPLE_AUTH_CONFIG.lockoutDuration);
}

/**
 * Check if lockout has expired
 */
export function isLockoutExpired(lockedUntil: Date): boolean {
  return Date.now() > lockedUntil.getTime();
}

/**
 * Sanitize user data for client
 */
export function sanitizeUser(user: any): SimpleUser {
  const {
    password_hash,
    verification_token,
    verification_token_expires,
    password_reset_token,
    password_reset_expires,
    failed_login_attempts,
    locked_until,
    ...sanitized
  } = user;

  return sanitized;
}

/**
 * Create API response
 */
export function createResponse(
  success: boolean,
  message: string,
  data?: any,
  statusCode: number = 200
): Response {
  return new Response(
    JSON.stringify({
      success,
      message,
      ...data
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    }
  );
}

/**
 * Extract session token from request
 */
export function extractSessionToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies (if you implement cookie-based sessions)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const sessionMatch = cookieHeader.match(/session_token=([^;]+)/);
    if (sessionMatch) {
      return sessionMatch[1];
    }
  }

  return null;
}

/**
 * Extract IP address from request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || 'unknown';
}

/**
 * Constants for the simple auth system
 */
export const AUTH_CONSTANTS = {
  COOKIE_NAME: 'session_token',
  HEADER_NAME: 'authorization',
  SESSION_EXPIRY_DAYS: 7,
  VERIFICATION_EXPIRY_HOURS: 24,
  RESET_EXPIRY_HOURS: 1,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,
} as const;
