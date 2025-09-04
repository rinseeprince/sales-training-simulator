// Authentication and cache cleanup utilities
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Enhanced logout with comprehensive cleanup - can be used as emergency logout
 */
export const emergencyLogout = async (): Promise<boolean> => {
  console.log('🚨 Emergency logout initiated...');
  
  try {
    // Create fresh Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Attempt signout with timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Emergency logout timeout')), 3000)
    );
    
    try {
      await Promise.race([supabase.auth.signOut(), timeoutPromise]);
      console.log('✅ Supabase signout completed');
    } catch (error) {
      console.warn('⚠️ Supabase signout failed, continuing with cleanup:', error);
    }
    
    // Force clear ALL auth-related storage
    try {
      // Clear all Supabase keys
      const allKeys = Object.keys(localStorage);
      const supabaseKeys = allKeys.filter(key => 
        key.includes('supabase') || 
        key.includes('sb-') ||
        key.includes('auth')
      );
      
      supabaseKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed localStorage key: ${key}`);
      });
      
      // Clear all session storage
      sessionStorage.clear();
      
      // Clear all auth cookies
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      console.log('✅ Emergency cleanup completed');
      return true;
    } catch (storageError) {
      console.error('❌ Storage cleanup failed:', storageError);
      return false;
    }
  } catch (error) {
    console.error('❌ Emergency logout failed:', error);
    return false;
  }
};

export const clearAuthState = async () => {
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all auth-related storage
    const authKeys = [
      'supabase.auth.token',
      'sb-auth-token',
      'supabase-auth-token',
      'auth-token',
      'sb-' + supabaseUrl.split('//')[1] + '-auth-token',
      'sb-' + supabaseUrl.split('//')[1] + '-auth-token-code-verifier'
    ];
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Clear auth cookies
    const authCookies = ['sb-access-token', 'sb-refresh-token'];
    authCookies.forEach(cookie => {
      document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    return true;
  } catch (error) {
    console.error('Auth cleanup failed:', error);
    return false;
  }
};

export const clearAllCache = async () => {
  try {
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.includes('repscore') || 
              cacheName.includes('next') || 
              cacheName.includes('workbox')) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    }
    
    // Clear local storage (preserve essential data)
    const preserve = ['theme', 'user-preferences'];
    const toPreserve: Record<string, string> = {};
    
    preserve.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) toPreserve[key] = value;
    });
    
    localStorage.clear();
    sessionStorage.clear();
    
    // Restore preserved data
    Object.entries(toPreserve).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    return true;
  } catch (error) {
    console.error('Cache cleanup failed:', error);
    return false;
  }
};

export const forceAppRefresh = async () => {
  try {
    // Clear all caches first
    await clearAllCache();
    
    // Force reload with cache bypass
    window.location.reload();
  } catch (error) {
    console.error('Force refresh failed:', error);
    // Fallback to simple reload
    window.location.reload();
  }
};

export const clearUserData = async () => {
  try {
    // Clear auth state
    await clearAuthState();
    
    // Clear application cache
    await clearAllCache();
    
    // Clear any user-specific data
    const userDataKeys = [
      'user-scenarios',
      'call-history',
      'user-settings',
      'performance-data'
    ];
    
    userDataKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    return true;
  } catch (error) {
    console.error('User data cleanup failed:', error);
    return false;
  }
};
