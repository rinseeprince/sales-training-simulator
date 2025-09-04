// Session management for tab close scenarios
'use client';

export class SessionManager {
  private static readonly SESSION_KEY = 'app_session_state';
  private static readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private static heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize session management
   */
  static initialize(): void {
    if (typeof window === 'undefined') return;

    console.log('🔄 Initializing session manager...');
    
    // Clean up stale sessions first
    this.cleanupStaleSession();
    
    // Set up session heartbeat
    this.startHeartbeat();
    
    // Handle tab visibility changes
    this.setupVisibilityHandling();
    
    // Handle tab close/refresh
    this.setupUnloadHandling();
  }

  /**
   * Start session heartbeat to track active sessions
   */
  private static startHeartbeat(): void {
    // Update session timestamp regularly
    this.updateSessionTimestamp();
    
    this.heartbeatTimer = setInterval(() => {
      this.updateSessionTimestamp();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Update session timestamp
   */
  private static updateSessionTimestamp(): void {
    try {
      const sessionData = {
        timestamp: Date.now(),
        tabId: this.getTabId(),
        userAgent: navigator.userAgent.substring(0, 100) // Truncated for storage
      };
      
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.warn('Failed to update session timestamp:', error);
    }
  }

  /**
   * Get unique tab ID
   */
  private static getTabId(): string {
    let tabId = sessionStorage.getItem('tab_id');
    if (!tabId) {
      tabId = Date.now() + '-' + Math.random().toString(36).substring(2);
      sessionStorage.setItem('tab_id', tabId);
    }
    return tabId;
  }

  /**
   * Handle tab visibility changes
   */
  private static setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('🔍 Tab hidden, pausing heartbeat');
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
      } else {
        console.log('🔍 Tab visible, resuming heartbeat');
        this.startHeartbeat();
        
        // Check for stale session when tab becomes visible
        this.cleanupStaleSession();
      }
    });

    // Handle window focus/blur
    window.addEventListener('focus', () => {
      this.cleanupStaleSession();
    });
  }

  /**
   * Handle tab close/refresh scenarios
   */
  private static setupUnloadHandling(): void {
    // Handle page unload (tab close, refresh, navigate away)
    window.addEventListener('beforeunload', () => {
      console.log('🚪 Tab closing, cleaning up session...');
      this.cleanupOnUnload();
    });

    // Handle page hide (more reliable than beforeunload)
    window.addEventListener('pagehide', () => {
      console.log('🚪 Page hiding, cleaning up session...');
      this.cleanupOnUnload();
    });
  }

  /**
   * Clean up session on tab close
   */
  private static cleanupOnUnload(): void {
    try {
      // Clear all session storage (temporary data)
      sessionStorage.clear();

      // Clear temporary localStorage entries but preserve auth and preferences
      const tempKeys = [
        'temp_call_',
        'currentScenario',
        'scenario_builder_',
        'simulation_state',
        'cache_',
        'last_version_check'
      ];

      Object.keys(localStorage).forEach(key => {
        if (tempKeys.some(prefix => key.startsWith(prefix))) {
          localStorage.removeItem(key);
        }
      });

      // Mark session as closed cleanly
      localStorage.setItem('session_closed_cleanly', 'true');
      
      console.log('✅ Session cleanup completed');
      
    } catch (error) {
      console.warn('Session cleanup failed:', error);
    }
  }

  /**
   * Clean up stale session data on startup
   */
  private static cleanupStaleSession(): void {
    try {
      // Check if previous session was closed cleanly
      const closedCleanly = localStorage.getItem('session_closed_cleanly');
      
      if (!closedCleanly) {
        console.log('🧹 Detected unclean session closure, cleaning up...');
        
        // Clear potentially corrupted session data
        sessionStorage.clear();
        
        // Clear temporary localStorage entries
        const tempKeys = [
          'temp_call_',
          'currentScenario',
          'scenario_builder_',
          'simulation_state'
        ];

        Object.keys(localStorage).forEach(key => {
          if (tempKeys.some(prefix => key.startsWith(prefix))) {
            localStorage.removeItem(key);
            console.log('🗑️ Cleared stale data:', key);
          }
        });

        // Clear application caches if available
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              if (name.includes('next') || name.includes('static') || name.includes('repscore')) {
                caches.delete(name);
                console.log('🗑️ Cleared stale cache:', name);
              }
            });
          }).catch(e => console.warn('Cache cleanup failed:', e));
        }

        // Show notification about cleanup
        this.showCleanupNotification();
      }

      // Remove the cleanup flag
      localStorage.removeItem('session_closed_cleanly');
      
    } catch (error) {
      console.warn('Stale session cleanup failed:', error);
    }
  }

  /**
   * Show cleanup notification to user
   */
  private static showCleanupNotification(): void {
    // Only show if we're not in the middle of authentication
    const isAuthPage = window.location.pathname.includes('/auth/');
    if (isAuthPage) return;

    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3b82f6;
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
          <span>Session restored after unexpected closure</span>
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
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);
  }

  /**
   * Check if session is stale
   */
  static isSessionStale(): boolean {
    try {
      const sessionData = sessionStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return true;

      const parsed = JSON.parse(sessionData);
      const age = Date.now() - parsed.timestamp;
      
      // Consider session stale after 5 minutes of inactivity
      return age > 5 * 60 * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Force session cleanup (for troubleshooting)
   */
  static forceCleanup(): void {
    console.log('🧹 Force cleaning session...');
    
    // Clear everything except essential auth data
    const preserve = ['supabase.auth.token', 'theme', 'sidebarOpen'];
    const toPreserve: Record<string, string> = {};
    
    preserve.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) toPreserve[key] = value;
    });

    localStorage.clear();
    sessionStorage.clear();

    // Clear caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }

    // Restore preserved data
    Object.entries(toPreserve).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    // Reload page
    window.location.reload();
  }

  /**
   * Cleanup on destroy
   */
  static destroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
