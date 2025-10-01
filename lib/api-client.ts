import { supabaseClient } from './supabase-auth';

/**
 * Get the current Supabase session token for API calls
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // FIRST: Try to get token from storage directly (bypass broken Supabase client)
    const storedToken = getStoredAuthToken();
    if (storedToken) {
      return storedToken;
    }
    
    // SECOND: Try getSession with short timeout
    const getSessionWithTimeout = () => {
      return Promise.race([
        supabaseClient.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 1500)
        )
      ]) as Promise<any>;
    };
    
    let session = null;
    let sessionError = null;
    
    try {
      const result = await getSessionWithTimeout();
      session = result.data?.session;
      sessionError = result.error;
      
      // Store token for future use if we got one
      if (session?.access_token) {
        storeAuthToken(session.access_token, session.refresh_token);
      }
    } catch (timeoutError) {
      sessionError = timeoutError;
    }
    
    if (sessionError || !session?.access_token) {
      // Try stored tokens one more time
      const fallbackToken = getStoredAuthToken();
      if (fallbackToken) {
        return fallbackToken;
      }
      
      return null;
    }
    return session.access_token;
  } catch (error) {
    // Final fallback: try stored token
    const emergencyToken = getStoredAuthToken();
    if (emergencyToken) {
      return emergencyToken;
    }
    
    return null;
  }
}

/**
 * Store auth tokens in multiple storage locations for reliability
 */
export function storeAuthToken(accessToken: string, refreshToken?: string): void {
  try {
    const tokenData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      stored_at: Date.now()
    };
    
    const tokenString = JSON.stringify(tokenData);
    
    // Store in multiple places for redundancy
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('backup_auth_token', tokenString);
      window.sessionStorage.setItem('backup_auth_token', tokenString);
    }
  } catch (error) {
    console.warn('Failed to store backup token:', error);
  }
}

/**
 * Get stored auth token as fallback when Supabase client fails
 */
function getStoredAuthToken(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    
    // Try multiple storage locations
    const sources = [
      () => window.localStorage.getItem('backup_auth_token'),
      () => window.sessionStorage.getItem('backup_auth_token'),
      // Also try Supabase's own storage keys
      () => window.localStorage.getItem('supabase.auth.token'),
      () => {
        // Try to find Supabase session in localStorage
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.includes('supabase') && key.includes('auth')) {
            const value = window.localStorage.getItem(key);
            if (value) {
              try {
                const parsed = JSON.parse(value);
                if (parsed.access_token) {
                  return JSON.stringify({ access_token: parsed.access_token, stored_at: Date.now() });
                }
              } catch (e) {
                // Not JSON, continue
              }
            }
          }
        }
        return null;
      }
    ];
    
    for (const getToken of sources) {
      try {
        const tokenString = getToken();
        if (tokenString) {
          const tokenData = JSON.parse(tokenString);
          
          // Check if token is not too old (24 hours max)
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          const tokenAge = Date.now() - (tokenData.stored_at || 0);
          
          if (tokenAge < maxAge && tokenData.access_token) {
            return tokenData.access_token;
          }
        }
      } catch (error) {
        // Continue to next source
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Error accessing stored tokens:', error);
    return null;
  }
}

/**
 * Make authenticated API requests with organization context
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('Not authenticated - please sign in again');
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000); // 10 second timeout
  
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
}

/**
 * Enterprise API client methods
 */
export const api = {
  // Get scenarios for organization
  async getScenarios(includeShared = false) {
    const params = includeShared ? '?includeShared=true' : '';
    return apiRequest(`/api/scenarios${params}`);
  },
  
  // Create scenario
  async createScenario(scenarioData: any) {
    return apiRequest('/api/scenarios', {
      method: 'POST',
      body: JSON.stringify(scenarioData),
    });
  },
  
  // Get organization info
  async getOrganization(includeUsage = false, includeMembers = false) {
    const params = new URLSearchParams();
    if (includeUsage) params.append('includeUsage', 'true');
    if (includeMembers) params.append('includeMembers', 'true');
    
    const queryString = params.toString();
    return apiRequest(`/api/organizations${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get calls for organization (filtered by user role)
  async getCalls(includeAssignments = false) {
    const params = includeAssignments ? '?includeAssignments=true' : '';
    return apiRequest(`/api/calls${params}`);
  },
  
  // Save a call with organization context
  async saveCall(callData: any) {
    return apiRequest('/api/save-call', {
      method: 'POST',
      body: JSON.stringify(callData),
    });
  },
};