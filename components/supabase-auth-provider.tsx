'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient, getCurrentUser, signUpWithEmail, signInWithEmail, signOut, resendVerificationEmail, resetPassword, AuthUser, AuthResponse } from '@/lib/supabase-auth';

/**
 * Store backup tokens for when Supabase client fails
 */
function storeBackupTokens(accessToken: string, refreshToken?: string): void {
  try {
    const tokenData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      stored_at: Date.now()
    };
    
    const tokenString = JSON.stringify(tokenData);
    
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('backup_auth_token', tokenString);
      window.sessionStorage.setItem('backup_auth_token', tokenString);
    }
  } catch (error) {
    console.warn('Failed to store backup tokens:', error);
  }
}

/**
 * Clear backup tokens on logout
 */
function clearBackupTokens(): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('backup_auth_token');
      window.sessionStorage.removeItem('backup_auth_token');
    }
  } catch (error) {
    console.warn('Failed to clear backup tokens:', error);
  }
}

interface SupabaseAuthContext {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  resendVerification: (email: string) => Promise<AuthResponse>;
  resetPassword: (email: string) => Promise<AuthResponse>;
  refreshUser: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContext | undefined>(undefined);

interface SupabaseAuthProviderProps {
  children: React.ReactNode;
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  /**
   * Load user data
   */
  const loadUser = useCallback(async (): Promise<void> => {
    try {
      const user = await getCurrentUser();
      setUser(user);
    } catch (error) {
      setUser(null);
    }
  }, []);

  /**
   * Initialize authentication state
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // First, try to restore session from Supabase
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
          // Store tokens for backup
          if (session.access_token) {
            storeBackupTokens(session.access_token, session.refresh_token);
          }
          // If we have a session, load the user immediately
          await loadUser();
        }
        
        // Set up auth state listener
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
          async (event, session) => {
            // Store tokens whenever we get a valid session
            if (session?.access_token) {
              storeBackupTokens(session.access_token, session.refresh_token);
            }
            
            if (event === 'SIGNED_IN' && session?.user) {
              const user = await getCurrentUser();
              setUser(user);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              // Clear stored tokens on sign out
              clearBackupTokens();
            } else if (event === 'TOKEN_REFRESHED' && session?.user) {
              const user = await getCurrentUser();
              setUser(user);
            } else if (event === 'USER_UPDATED' && session?.user) {
              const user = await getCurrentUser();
              setUser(user);
            }
          }
        );

        // If no session was found, still try to load user (in case of race condition)
        if (!session) {
          await loadUser();
        }
        
        setIsLoading(false);

        // Cleanup subscription
        return () => subscription.unsubscribe();
      } catch (error) {
        setIsLoading(false);
      }
    };

    initAuth();
    
    // Handle tab visibility changes to refresh session
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh the session when tab becomes visible
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            refreshUser().catch(() => {
              // Silent fail
            })
          }
        }).catch(() => {
          // Silent fail
        })
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadUser]);

  /**
   * Sign up function
   */
  const signUp = useCallback(async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    const response = await signUpWithEmail(email, password, name);
    
    // If sign up was successful and user is immediately confirmed, store tokens
    if (response.success && response.user?.email_verified) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.access_token) {
          storeBackupTokens(session.access_token, session.refresh_token);
        }
      } catch (error) {
        // Silent fail
      }
    }
    
    // Don't set user state here - let them verify email first unless already verified
    if (response.success && response.user?.email_verified) {
      setUser(response.user);
    }
    
    return response;
  }, []);

  /**
   * Sign in function
   */
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    const response = await signInWithEmail(email, password);
    
    if (response.success && response.user) {
      setUser(response.user);
      
      // Immediately store tokens after successful sign in
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.access_token) {
          storeBackupTokens(session.access_token, session.refresh_token);
        }
      } catch (error) {
        // Silent fail
      }
    }
    
    return response;
  }, []);

  /**
   * Enhanced Logout function with better error handling and cleanup
   */
  const logout = useCallback(async (): Promise<void> => {
    // Prevent multiple concurrent logout attempts
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    
    try {
      // Clear user state immediately to prevent UI flickering
      setUser(null);
      
      // Attempt Supabase signout with timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 5000)
      );
      
      const logoutPromise = signOut();
      
      try {
        const result = await Promise.race([logoutPromise, timeoutPromise]);
      } catch (timeoutError) {
        // Timeout, proceed with local cleanup
      }
      
      // Force clear all auth-related storage
      try {
        // Clear Supabase specific storage
        const supabaseKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('sb-')
        );
        supabaseKeys.forEach(key => localStorage.removeItem(key));
        
        // Clear session storage
        sessionStorage.clear();
        
        // Clear auth cookies
        const authCookies = ['sb-access-token', 'sb-refresh-token'];
        authCookies.forEach(cookie => {
          document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
      } catch (storageError) {
        // Silent fail
      }
      
      // Use window.location for more reliable navigation
      window.location.href = '/';
      
    } catch (error) {
      // Even if everything fails, clear state and redirect
      setUser(null);
      
      // Fallback navigation
      try {
        router.push('/');
      } catch (routerError) {
        window.location.href = '/';
      }
    } finally {
      // Reset loading state after a delay to prevent immediate re-clicks
      setTimeout(() => setIsLoading(false), 2000);
    }
  }, [router, isLoading]);

  /**
   * Resend verification email
   */
  const resendVerification = useCallback(async (email: string): Promise<AuthResponse> => {
    return await resendVerificationEmail(email);
  }, []);

  /**
   * Reset password
   */
  const resetPasswordEmail = useCallback(async (email: string): Promise<AuthResponse> => {
    return await resetPassword(email);
  }, []);

  /**
   * Refresh user data and trigger app-wide data refresh
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    await loadUser();
    
    // Trigger custom event to notify components to refetch data
    window.dispatchEvent(new CustomEvent('userDataRefresh'));
  }, [loadUser]);

  const value: SupabaseAuthContext = {
    user,
    isLoading,
    isAuthenticated,
    signUp,
    signIn,
    logout,
    resendVerification,
    resetPassword: resetPasswordEmail,
    refreshUser,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth(): SupabaseAuthContext {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
