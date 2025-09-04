// Version checking system to prevent cache issues
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

export interface VersionInfo {
  version: string;
  buildTime: string;
  needsUpdate: boolean;
}

export const checkForUpdates = async (): Promise<VersionInfo | null> => {
  try {
    const response = await fetch('/api/version', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.warn('Version check failed:', response.status);
      return null;
    }
    
    const serverVersion = await response.json();
    const needsUpdate = serverVersion.version !== APP_VERSION;
    
    return {
      version: serverVersion.version,
      buildTime: serverVersion.buildTime,
      needsUpdate
    };
  } catch (error) {
    console.warn('Version check error:', error);
    return null;
  }
};

export const forceRefresh = () => {
  // Clear all caches first
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        if (name.includes('repscore') || name.includes('next')) {
          caches.delete(name);
        }
      });
    });
  }
  
  // Clear local storage (but preserve auth if needed)
  const authKeys = ['supabase.auth.token', 'sb-auth-token'];
  const authData: Record<string, string> = {};
  
  authKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) authData[key] = value;
  });
  
  localStorage.clear();
  sessionStorage.clear();
  
  // Restore auth data
  Object.entries(authData).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
  
  // Force reload with cache bypass
  window.location.reload();
};

export const clearAuthState = () => {
  // Clear all auth-related storage
  const keysToRemove = [
    'supabase.auth.token',
    'sb-auth-token',
    'supabase-auth-token',
    'auth-token'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  // Clear cookies (basic approach)
  document.cookie.split(";").forEach(c => {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  window.location.reload();
};
