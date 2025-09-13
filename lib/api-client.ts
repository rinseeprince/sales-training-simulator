import { supabaseClient } from './supabase-auth';

// Cache for authentication token to avoid repeated session calls
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get cached authentication token or refresh if needed
 */
async function getAuthToken(): Promise<string | null> {
  // Check if cached token is still valid (with 5 minute buffer)
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 300000) { // 5 minutes buffer
            console.log('🔍 Token cache info:', { 
              cached: true, 
              tokenAge: Math.round((now - (tokenExpiry - 300000)) / 1000) + 's ago', 
              expiresIn: Math.round((tokenExpiry - now) / 1000) + 's' 
            });            console.log('🔍 Using cached token:', cachedToken.substring(0, 20) + '...');    return cachedToken;
  }

  try {
    // Get fresh session
    const { data: { session }, error } = await supabaseClient.auth.getSession();
            console.log('🔍 Fetching fresh session from Supabase...');    
    if (error) {
      console.error('Failed to get session:', error);
      cachedToken = null;
            console.log('🔍 Token cache cleared due to error');      tokenExpiry = 0;
      return null;
    }

    if (!session?.access_token) {
      console.error('No session token available');
      cachedToken = null;
            console.log('🔍 Token cache cleared due to error');      tokenExpiry = 0;
      return null;
    }

    // Cache the token with its expiry time
    cachedToken = session.access_token;
            console.log('🔍 Fresh token fetched, expires at:', new Date(tokenExpiry).toISOString());    tokenExpiry = (session.expires_at || 0) * 1000; // Convert to milliseconds
    
    return cachedToken;
  } catch (error) {
    console.error('Error getting auth token:', error);
    cachedToken = null;
            console.log('🔍 Token cache cleared due to error');    tokenExpiry = 0;
    return null;
  }
}

/**
 * Clear cached token (useful for logout or token refresh)
 */
export function clearAuthTokenCache(): void {
  cachedToken = null;
            console.log('🔍 Token cache cleared due to error');  tokenExpiry = 0;
}

/**
 * Authenticated fetch wrapper with retry logic and token caching
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {},
  retries: number = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const token = await getAuthToken();
            console.log('🔍 Using token:', token ? token.substring(0, 20) + '...' : 'null');      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Add the authorization header
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      };

      console.log('🔍 Making authenticated request to:', url, `(attempt ${attempt + 1}/${retries + 1})`);
            console.log('🔍 Request details:', { url, method: options.method || 'GET', headers: options.headers });
      // Make the request with authentication
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // If we get 401, clear the cached token and retry
      if (response.status === 401 && attempt < retries) {
                console.log('🔍 Got 401, clearing token cache and retrying...');        console.log('🔄 Got 401, clearing token cache and retrying...');
        clearAuthTokenCache();
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(`🚨 Request failed (attempt ${attempt + 1}/${retries + 1}):`, error);
      
      // Clear token cache on error and retry
      if (attempt < retries) {
        clearAuthTokenCache();
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Authenticated GET request
 */
export async function authenticatedGet(url: string): Promise<Response> {
  return authenticatedFetch(url, { method: 'GET' });
}

/**
 * Authenticated POST request
 */
export async function authenticatedPost(
  url: string, 
  data?: any
): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Authenticated PATCH request
 */
export async function authenticatedPatch(
  url: string, 
  data?: any
): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Authenticated DELETE request
 */
export async function authenticatedDelete(url: string): Promise<Response> {
  return authenticatedFetch(url, { method: 'DELETE' });
} 