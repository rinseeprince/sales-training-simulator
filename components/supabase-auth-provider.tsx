'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient, getCurrentUser, signUpWithEmail, signInWithEmail, signOut, resendVerificationEmail, resetPassword, AuthUser, AuthResponse } from '@/lib/supabase-auth';
import { clearAuthTokenCache } from '@/lib/api-client';

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
      console.log('AUTH PROVIDER: Starting loadUser...');
      const user = await getCurrentUser();
      console.log('AUTH PROVIDER: getCurrentUser returned:', user ? 'USER FOUND' : 'NO USER');
      setUser(user);
    } catch (error) {
      console.error('AUTH PROVIDER: Failed to load user:', error);
      setUser(null);
    }
  }, []);

  /**
   * Initialize authentication state
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('AUTH PROVIDER: Initializing authentication...');
        
        // First, try to restore session from Supabase
        const { data: { session } } = await supabaseClient.auth.getSession();
        console.log('AUTH PROVIDER: Initial session check:', session ? 'Session found' : 'No session');
        
        if (session) {
          // If we have a session, load the user immediately
          await loadUser();
        }
        
        // Set up auth state listener
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' && session?.user) {
              clearAuthTokenCache(); // Clear cache for fresh token
              const user = await getCurrentUser();
              setUser(user);
            } else if (event === 'SIGNED_OUT') {
              clearAuthTokenCache(); // Clear cache on logout
              setUser(null);
            } else if (event === 'TOKEN_REFRESHED' && session?.user) {
              clearAuthTokenCache(); // Clear cache to force fresh token usage
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
        
        console.log('AUTH PROVIDER: Setting isLoading to false');
        setIsLoading(false);

        // Cleanup subscription
        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('AUTH PROVIDER: Error during initialization:', error);
        setIsLoading(false);
      }
    };

    initAuth();
  }, [loadUser]);

  /**
   * Sign up function
   */
  const signUp = useCallback(async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    const response = await signUpWithEmail(email, password, name);
    
    // Don't set user state here - let them verify email first
    
    return response;
  }, []);

  /**
   * Sign in function
   */
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    const response = await signInWithEmail(email, password);
    
    if (response.success && response.user) {
      setUser(response.user);
    }
    
    return response;
  }, []);

  /**
   * Enhanced Logout function with better error handling and cleanup
   */
  const logout = useCallback(async (): Promise<void> => {
    // Prevent multiple concurrent logout attempts
    if (isLoading) {
      console.log('🚪 Logout already in progress, ignoring');
      return;
    }

    console.log('🚪 Starting logout process...');
    setIsLoading(true);
    
    try {
      // Clear user state immediately to prevent UI flickering
      setUser(null);
      
      // Clear cached auth token
      clearAuthTokenCache();
      
      // Attempt Supabase signout with timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 5000)
      );
      
      const logoutPromise = signOut();
      
      try {
        const result = await Promise.race([logoutPromise, timeoutPromise]);
        console.log('✅ Logout result:', result);
      } catch (timeoutError) {
        console.warn('⚠️ Logout API timeout, proceeding with local cleanup:', timeoutError);
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
        console.warn('⚠️ Storage cleanup error:', storageError);
      }
      
      console.log('🔄 Redirecting to home page...');
      
      // Use window.location for more reliable navigation
      window.location.href = '/';
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Even if everything fails, clear state and redirect
      setUser(null);
      
      // Fallback navigation
      try {
        router.push('/');
      } catch (routerError) {
        console.error('Router failed, using window.location:', routerError);
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
   * Refresh user data
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    await loadUser();
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
