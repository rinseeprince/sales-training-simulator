// Production-ready cache management system
'use client';

export interface CacheConfig {
  version: string;
  buildTime: string;
  forceRefresh?: boolean;
}

export class CacheManager {
  private static readonly CACHE_VERSION_KEY = 'app_cache_version';
  private static readonly LAST_CHECK_KEY = 'last_version_check';
  private static readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize cache management on app startup
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing cache manager...');
      
      // Check if we need to perform version check
      const shouldCheck = this.shouldCheckVersion();
      
      if (shouldCheck) {
        await this.checkAndUpdateCache();
      }
      
      // Set up periodic checks
      this.setupPeriodicChecks();
      
    } catch (error) {
      console.warn('Cache manager initialization failed:', error);
    }
  }

  /**
   * Check server version and update cache if needed
   */
  private static async checkAndUpdateCache(): Promise<boolean> {
    try {
      console.log('🔍 Checking for app updates...');
      
      const response = await fetch('/api/version', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.warn('Version check failed:', response.status);
        return false;
      }
      
      const serverConfig: CacheConfig = await response.json();
      const currentVersion = this.getCurrentVersion();
      
      // Update last check time
      localStorage.setItem(this.LAST_CHECK_KEY, Date.now().toString());
      
      // Check if update is needed
      if (this.needsUpdate(currentVersion, serverConfig)) {
        console.log('📦 New version detected, updating cache...');
        await this.performCacheUpdate(serverConfig);
        return true;
      }
      
      console.log('✅ App is up to date');
      return false;
      
    } catch (error) {
      console.warn('Version check error:', error);
      return false;
    }
  }

  /**
   * Get current cached version
   */
  private static getCurrentVersion(): CacheConfig | null {
    try {
      const cached = localStorage.getItem(this.CACHE_VERSION_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if cache update is needed
   */
  private static needsUpdate(current: CacheConfig | null, server: CacheConfig): boolean {
    if (!current) return true;
    
    // Version changed
    if (current.version !== server.version) return true;
    
    // Build time changed (new deployment)
    if (current.buildTime !== server.buildTime) return true;
    
    // Force refresh flag
    if (server.forceRefresh) return true;
    
    return false;
  }

  /**
   * Perform smart cache update
   */
  private static async performCacheUpdate(newConfig: CacheConfig): Promise<void> {
    try {
      // Clear only application caches, preserve user data
      await this.clearApplicationCache();
      
      // Update version info
      localStorage.setItem(this.CACHE_VERSION_KEY, JSON.stringify(newConfig));
      
      // Show update notification if not a force refresh
      if (!newConfig.forceRefresh) {
        this.showUpdateNotification();
      }
      
      console.log('✅ Cache updated successfully');
      
    } catch (error) {
      console.error('Cache update failed:', error);
    }
  }

  /**
   * Clear only application-related caches, preserve user data
   */
  private static async clearApplicationCache(): Promise<void> {
    try {
      // Clear browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const appCaches = cacheNames.filter(name => 
          name.includes('next') || 
          name.includes('static') || 
          name.includes('repscore')
        );
        
        await Promise.all(appCaches.map(name => caches.delete(name)));
        console.log('🗑️ Cleared application caches:', appCaches);
      }
      
      // Clear only stale session data, preserve user preferences
      const keysToRemove = [
        'temp_call_',
        'currentScenario',
        'scenario_builder_',
        'simulation_state'
      ];
      
      Object.keys(sessionStorage).forEach(key => {
        if (keysToRemove.some(prefix => key.startsWith(prefix))) {
          sessionStorage.removeItem(key);
        }
      });
      
    } catch (error) {
      console.warn('Cache clearing failed:', error);
    }
  }

  /**
   * Show user-friendly update notification
   */
  private static showUpdateNotification(): void {
    // Create a subtle notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%; opacity: 0.9;"></div>
          <span>App updated with latest improvements!</span>
        </div>
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);
  }

  /**
   * Set up periodic version checks
   */
  private static setupPeriodicChecks(): void {
    // Check when page becomes visible (user switches back to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.shouldCheckVersion()) {
        this.checkAndUpdateCache();
      }
    });

    // Check when user focuses on window
    window.addEventListener('focus', () => {
      if (this.shouldCheckVersion()) {
        this.checkAndUpdateCache();
      }
    });
  }

  /**
   * Check if we should perform a version check
   */
  private static shouldCheckVersion(): boolean {
    try {
      const lastCheck = localStorage.getItem(this.LAST_CHECK_KEY);
      if (!lastCheck) return true;
      
      const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
      return timeSinceLastCheck > this.CHECK_INTERVAL;
    } catch {
      return true;
    }
  }

  /**
   * Force cache refresh (for emergency use)
   */
  static async forceRefresh(): Promise<void> {
    try {
      console.log('🔄 Force refreshing application...');
      
      // Clear all application data
      await this.clearApplicationCache();
      localStorage.removeItem(this.CACHE_VERSION_KEY);
      localStorage.removeItem(this.LAST_CHECK_KEY);
      
      // Hard reload
      window.location.reload();
      
    } catch (error) {
      console.error('Force refresh failed:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  }

  /**
   * Get current app version for display
   */
  static getCurrentVersionString(): string {
    const config = this.getCurrentVersion();
    return config?.version || 'Unknown';
  }
}
