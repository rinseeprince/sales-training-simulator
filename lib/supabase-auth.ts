import { createClient } from '@supabase/supabase-js';

// Check if required environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug environment variables in production
if (typeof window !== 'undefined') {
  console.log('Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlFirst10: supabaseUrl?.substring(0, 10),
    keyFirst10: supabaseAnonKey?.substring(0, 10),
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard`
  });
}

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
}

// Custom storage adapter that handles tab switching better
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      // Try localStorage first
      const item = window.localStorage.getItem(key);
      if (item) return item;
      
      // Fallback to sessionStorage
      return window.sessionStorage.getItem(key);
    } catch (error) {
      console.warn('Storage access failed:', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      // Store in both localStorage and sessionStorage for redundancy
      window.localStorage.setItem(key, value);
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn('Storage write failed:', error);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Storage removal failed:', error);
    }
  }
};

// Initialize Supabase client for client-side operations
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: customStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Use PKCE flow for better security and reliability
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
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



// Auth functions
export async function signUpWithEmail(email: string, password: string, name?: string): Promise<AuthResponse> {
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard`;
  
  try {
    // Try to sign up with minimal options to avoid trigger issues
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      
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
      // Auth user created successfully - return immediately
      
      // Try to get session immediately after sign up and store tokens
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.access_token) {
          // Import the token storage function from api-client
          const { storeAuthToken } = await import('./api-client');
          storeAuthToken(session.access_token, session.refresh_token);
        }
      } catch (error) {
        // Silent fail
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

  } catch (error: unknown) {
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
      // User signed in successfully

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

  } catch (error: unknown) {
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
      .select('name, subscription_status, avatar_url')
      .eq('auth_user_id', user.id)
      .single();
    
    if (profileError) {
      // Profile not found, continue with basic user data
    }
    profile = data;

    return {
      id: user.id,
      email: user.email!,
      name: profile?.name || user.user_metadata?.name,
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
      email_verified: !!user.email_confirmed_at,
      subscription_status: profile?.subscription_status || 'free',
      created_at: user.created_at,
      updated_at: user.updated_at || new Date().toISOString(),
    };

  } catch (error) {
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
    return {
      success: false,
      message: 'An error occurred while sending password reset email',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
