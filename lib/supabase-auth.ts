import { createClient } from '@supabase/supabase-js';

// Check if required environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
}

// Initialize Supabase client for client-side operations
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  email_verified: boolean;
  subscription_status?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  error?: string;
}

/**
 * Sync user to simple_users table via API
 */
async function syncUserToSimpleUsers(authUserId: string, email: string, name?: string): Promise<boolean> {
  try {
    const response = await fetch('/api/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authUserId,
        email,
        name,
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Successfully synced user to simple_users:', email);
      return true;
    } else {
      console.error('Failed to sync user:', data.error);
      return false;
    }
  } catch (error) {
    console.error('Error calling sync-user API:', error);
    return false;
  }
}

// Auth functions
export async function signUpWithEmail(email: string, password: string, name?: string): Promise<AuthResponse> {
  console.log('signUpWithEmail called with:', { email, name });
  try {
    // Try to sign up directly first
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || null,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      console.error('Supabase signup error:', error);
      
      // Check if this is a user already exists error
      if (error.message.includes('already registered') || 
          error.message.includes('already exists') ||
          error.message.includes('User already registered')) {
        // User already exists, try to resend verification email
        const resendResult = await resendVerificationEmail(email);
        if (resendResult.success) {
          return {
            success: true,
            message: 'Account already created. Another verification link has been sent to your email.',
          };
        } else {
          return {
            success: false,
            message: 'Account already exists but failed to resend verification email. Please try signing in instead.',
            error: resendResult.error,
          };
        }
      }
      
      // Handle 500 errors specifically
      if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        return {
          success: false,
          message: 'Supabase configuration error. Please check your Supabase settings.',
          error: error.message,
        };
      }
      
      return {
        success: false,
        message: error.message,
        error: error.message,
      };
    }

    if (data.user) {
      // Sync user to simple_users table via API
      const syncSuccess = await syncUserToSimpleUsers(data.user.id, data.user.email!, name);
      
      if (!syncSuccess) {
        console.warn('Failed to sync user to simple_users, but auth user was created');
      }

      return {
        success: true,
        message: data.user.email_confirmed_at 
          ? 'Account created successfully!' 
          : 'Account created! Please check your email to verify your account. (You can also try signing in directly)',
        user: {
          id: data.user.id,
          email: data.user.email!,
          email_verified: !!data.user.email_confirmed_at,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || new Date().toISOString(),
        },
      };
    }

    return {
      success: false,
      message: 'Failed to create account',
    };

  } catch (error: any) {
    console.error('Sign up error:', error);
    return {
      success: false,
      message: 'An error occurred during sign up',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        message: error.message,
        error: error.message,
      };
    }

    if (data.user) {
      // Sync user to simple_users table via API
      const syncSuccess = await syncUserToSimpleUsers(data.user.id, data.user.email!, data.user.user_metadata?.name);
      
      if (!syncSuccess) {
        console.warn('Failed to sync user to simple_users during signin');
      }

      return {
        success: true,
        message: 'Signed in successfully',
        user: {
          id: data.user.id,
          email: data.user.email!,
          email_verified: !!data.user.email_confirmed_at,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || new Date().toISOString(),
        },
      };
    }

    return {
      success: false,
      message: 'Sign in failed',
    };

  } catch (error: any) {
    console.error('Sign in error:', error);
    return {
      success: false,
      message: 'An error occurred during sign in',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      return {
        success: false,
        message: error.message,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Signed out successfully!',
    };

  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      message: 'An error occurred during sign out',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get additional user data from our custom table using auth_user_id
    let profile = null;
    const { data, error: profileError } = await supabaseClient
      .from('simple_users')
      .select('name, subscription_status')
      .eq('auth_user_id', user.id)
      .single();
    
    if (profileError) {
      console.warn('Profile not found for user:', user.email, profileError.message);
    }
    profile = data;

    return {
      id: user.id,
      email: user.email!,
      name: profile?.name || user.user_metadata?.name,
      email_verified: !!user.email_confirmed_at,
      subscription_status: profile?.subscription_status || 'free',
      created_at: user.created_at,
      updated_at: user.updated_at || new Date().toISOString(),
    };

  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function resendVerificationEmail(email: string): Promise<AuthResponse> {
  try {
    const { error } = await supabaseClient.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      return {
        success: false,
        message: error.message,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    };

  } catch (error) {
    console.error('Resend verification error:', error);
    return {
      success: false,
      message: 'An error occurred while sending verification email',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function resetPassword(email: string): Promise<AuthResponse> {
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
    });

    if (error) {
      return {
        success: false,
        message: error.message,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Password reset email sent! Please check your inbox.',
    };

  } catch (error) {
    console.error('Reset password error:', error);
    return {
      success: false,
      message: 'An error occurred while sending password reset email',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
