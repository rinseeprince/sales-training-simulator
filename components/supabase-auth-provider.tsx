'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient, getCurrentUser, signUpWithEmail, signInWithEmail, signOut, resendVerificationEmail, resetPassword, AuthUser, AuthResponse } from '@/lib/supabase-auth';

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
      console.error('Failed to load user:', error);
      setUser(null);
    }
  }, []);

  /**
   * Initialize authentication state
   */
  useEffect(() => {
    const initAuth = async () => {
      // Set up auth state listener
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);
          
          if (event === 'SIGNED_IN' && session?.user) {
            const user = await getCurrentUser();
            setUser(user);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            const user = await getCurrentUser();
            setUser(user);
          }
        }
      );

      // Load initial user state
      await loadUser();
      setIsLoading(false);

      // Cleanup subscription
      return () => subscription.unsubscribe();
    };

    initAuth();
  }, [loadUser]);

  /**
   * Sign up function
   */
  const signUp = useCallback(async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    const response = await signUpWithEmail(email, password, name);
    
    if (response.success && response.user) {
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
    }
    
    return response;
  }, []);

  /**
   * Logout function
   */
  const logout = useCallback(async (): Promise<void> => {
    await signOut();
    setUser(null);
    router.push('/');
  }, [router]);

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
