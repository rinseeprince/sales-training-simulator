'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthContext,
  AuthUser,
  UserPermissions,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  EnhancedScenario,
  UserRole,
  ApiResponse
} from '@/types/auth';

const AuthContext = createContext<AuthContext | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
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
      const response = await authenticatedFetch('/api/auth/me');
      
      if (!response.ok) {
        throw new Error('Failed to load user');
      }

      const data: ApiResponse<{ user: AuthUser; permissions?: UserPermissions }> = await response.json();
      
      if (data.success && data.data) {
        setUser(data.data.user);
        setPermissions(data.data.permissions || null);
      } else {
        throw new Error(data.error || 'Failed to load user');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      // Clear invalid session
      localStorage.removeItem('session_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setPermissions(null);
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
  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: ApiResponse<LoginResponse> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const loginData = data.data!;

      if (loginData.success && loginData.session_token) {
        // Store tokens
        localStorage.setItem('session_token', loginData.session_token);
        if (loginData.refresh_token) {
          localStorage.setItem('refresh_token', loginData.refresh_token);
        }

        // Set user state
        setUser(loginData.user!);
        setPermissions(loginData.permissions || null);
      }

      return loginData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  /**
   * Register function
   */
  const register = useCallback(async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<RegisterResponse> = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      return result.data!;
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
      await authenticatedFetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local state regardless of API call success
      localStorage.removeItem('session_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setPermissions(null);
      router.push('/auth/signin');
    }
  }, [authenticatedFetch, router]);

  /**
   * Verify email function
   */
  const verifyEmail = useCallback(async (data: VerifyEmailRequest): Promise<VerifyEmailResponse> => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<VerifyEmailResponse> = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Email verification failed');
      }

      const verifyData = result.data!;

      // Update user state if verification successful
      if (verifyData.success && verifyData.user) {
        setUser(prevUser => prevUser ? { ...prevUser, email_verified: true } : verifyData.user!);
      }

      return verifyData;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }, []);

  /**
   * Forgot password function
   */
  const forgotPassword = useCallback(async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<ForgotPasswordResponse> = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Password reset request failed');
      }

      return result.data!;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }, []);

  /**
   * Reset password function
   */
  const resetPassword = useCallback(async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<ResetPasswordResponse> = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Password reset failed');
      }

      return result.data!;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }, []);

  /**
   * Accept invitation function
   */
  const acceptInvitation = useCallback(async (data: AcceptInvitationRequest): Promise<AcceptInvitationResponse> => {
    try {
      const response = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<AcceptInvitationResponse> = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Invitation acceptance failed');
      }

      const acceptData = result.data!;

      if (acceptData.success && acceptData.session_token) {
        // Store tokens
        localStorage.setItem('session_token', acceptData.session_token);

        // Set user state
        setUser(acceptData.user!);
      }

      return acceptData;
    } catch (error) {
      console.error('Accept invitation error:', error);
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

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: Partial<AuthUser>): Promise<void> => {
    try {
      const response = await authenticatedFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const result: ApiResponse<AuthUser> = await response.json();

      if (result.success && result.data) {
        setUser(result.data);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }, [authenticatedFetch]);

  /**
   * Check if user has specific role(s)
   */
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!user) return false;

    if (Array.isArray(role)) {
      return role.includes(user.role);
    }

    // Role hierarchy: admin > manager > user
    const roleHierarchy = { user: 1, manager: 2, admin: 3 };
    return roleHierarchy[user.role] >= roleHierarchy[role];
  }, [user]);

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;

    // Admin has all permissions
    if (user.role === 'admin') return true;

    // Check custom permissions for managers
    if (user.role === 'manager' && permissions) {
      switch (permission) {
        case 'manage_team':
          return true;
        case 'share_scenarios':
          return permissions.allow_scenario_sharing;
        case 'manage_user_permissions':
          return true;
        case 'invite_users':
          return true;
        default:
          return false;
      }
    }

    // Basic user permissions
    switch (permission) {
      case 'create_scenarios':
        return canSaveScenarios();
      case 'view_own_data':
        return true;
      default:
        return false;
    }
  }, [user, permissions]);

  /**
   * Check if user can access specific scenario
   */
  const canAccessScenario = useCallback((scenario: EnhancedScenario): boolean => {
    if (!user) return false;

    // Admin can access all scenarios
    if (user.role === 'admin') return true;

    // User created the scenario
    if (scenario.created_by === user.id) return true;

    // Public scenarios
    if (scenario.visibility === 'public') return true;

    // Manager shared scenarios (if user's manager created it)
    if (scenario.visibility === 'manager_shared' && user.manager_id === scenario.created_by) {
      return true;
    }

    // Check explicit access permissions
    if (scenario.access_permissions) {
      return scenario.access_permissions.some(access => access.user_id === user.id);
    }

    return false;
  }, [user]);

  /**
   * Check if user can save scenarios
   */
  const canSaveScenarios = useCallback((): boolean => {
    if (!user) return false;

    // Admin and managers can always save
    if (user.role === 'admin' || user.role === 'manager') return true;

    // For users, check manager's permission settings
    if (permissions) {
      return permissions.allow_user_saving;
    }

    // Default to true if no restrictions set
    return true;
  }, [user, permissions]);

  const contextValue: AuthContext = {
    user,
    permissions,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword,
    acceptInvitation,
    refreshUser,
    updateProfile,
    hasRole,
    hasPermission,
    canAccessScenario,
    canSaveScenarios,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContext {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
