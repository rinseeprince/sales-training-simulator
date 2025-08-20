'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleUser, LoginRequest, RegisterRequest, AuthResponse } from '@/lib/simple-auth';

interface SimpleAuthContext {
  user: SimpleUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  verifyEmail: (token: string, email: string) => Promise<AuthResponse>;
  refreshUser: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContext | undefined>(undefined);

interface SimpleAuthProviderProps {
  children: React.ReactNode;
}

export function SimpleAuthProvider({ children }: SimpleAuthProviderProps) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  /**
   * API request helper with authentication
   */
  const authenticatedFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const sessionToken = localStorage.getItem('session_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }, []);

  /**
   * Load user data from API
   */
  const loadUser = useCallback(async (): Promise<void> => {
    try {
      const response = await authenticatedFetch('/api/simple-auth/me');
      
      if (!response.ok) {
        throw new Error('Failed to load user');
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        throw new Error(data.message || 'Failed to load user');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      // Clear invalid session
      localStorage.removeItem('session_token');
      setUser(null);
    }
  }, [authenticatedFetch]);

  /**
   * Initialize authentication state
   */
  useEffect(() => {
    const initAuth = async () => {
      const sessionToken = localStorage.getItem('session_token');
      
      if (sessionToken) {
        await loadUser();
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, [loadUser]);

  /**
   * Login function
   */
  const login = useCallback(async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/simple-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.session_token) {
        // Store session token
        localStorage.setItem('session_token', data.session_token);
        setUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  /**
   * Register function
   */
  const register = useCallback(async (registerData: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/simple-auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }, []);

  /**
   * Logout function
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Call logout API to invalidate session
      await authenticatedFetch('/api/simple-auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local state regardless of API call success
      localStorage.removeItem('session_token');
      setUser(null);
      router.push('/auth/signin');
    }
  }, [authenticatedFetch, router]);

  /**
   * Verify email function
   */
  const verifyEmail = useCallback(async (token: string, email: string): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/simple-auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, email }),
      });

      const data = await response.json();

      // Update user state if verification successful
      if (data.success && data.user) {
        setUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }, []);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    if (isAuthenticated) {
      await loadUser();
    }
  }, [isAuthenticated, loadUser]);

  const contextValue: SimpleAuthContext = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    verifyEmail,
    refreshUser,
  };

  return (
    <SimpleAuthContext.Provider value={contextValue}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export function useSimpleAuth(): SimpleAuthContext {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}
