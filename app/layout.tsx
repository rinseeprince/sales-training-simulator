import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { SupabaseAuthProvider } from '@/components/supabase-auth-provider'
import { UpdateBanner } from '@/components/ui/update-banner'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SalesAI Simulator - AI-Powered Sales Training',
  description: 'Advanced sales roleplay and training simulator with real-time voice interactions',
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseAuthProvider>
            <UpdateBanner />
            {children}
            <Toaster />
          </SupabaseAuthProvider>
        </ThemeProvider>
        
        {/* Inline session and cache management */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Inline session and cache management
              (function() {
                console.log('🚀 Starting app initialization...');
                
                // Session Manager (inline implementation)
                const SessionManager = {
                  SESSION_KEY: 'app_session_state',
                  
                  initialize: function() {
                    console.log('🔄 Initializing session manager...');
                    this.cleanupStaleSession();
                    this.setupUnloadHandling();
                  },
                  
                  cleanupStaleSession: function() {
                    try {
                      const closedCleanly = localStorage.getItem('session_closed_cleanly');
                      
                      if (!closedCleanly) {
                        console.log('🧹 Detected unclean session closure, cleaning up...');
                        
                        // FIXED: Clear only specific sessionStorage keys, NOT all sessionStorage
                        // This preserves Supabase auth tokens that might be in sessionStorage
                        const sessionTempKeys = ['temp_call_', 'scenario_builder_', 'simulation_state', 'tab_id', 'app_session_state'];
                        Object.keys(sessionStorage).forEach(key => {
                          if (sessionTempKeys.some(prefix => key.startsWith(prefix))) {
                            sessionStorage.removeItem(key);
                            console.log('🗑️ Cleared stale session data:', key);
                          }
                        });
                        
                        // Clear temporary localStorage entries
                        const tempKeys = ['temp_call_', 'currentScenario', 'scenario_builder_', 'simulation_state'];
                        Object.keys(localStorage).forEach(key => {
                          if (tempKeys.some(prefix => key.startsWith(prefix))) {
                            localStorage.removeItem(key);
                            console.log('🗑️ Cleared stale data:', key);
                          }
                        });

                        // Clear application caches
                        if ('caches' in window) {
                          caches.keys().then(names => {
                            names.forEach(name => {
                              if (name.includes('next') || name.includes('static')) {
                                caches.delete(name);
                                console.log('🗑️ Cleared stale cache:', name);
                              }
                            });
                          }).catch(e => console.warn('Cache cleanup failed:', e));
                        }

                        this.showCleanupNotification();
                      }

                      localStorage.removeItem('session_closed_cleanly');
                    } catch (error) {
                      console.warn('Stale session cleanup failed:', error);
                    }
                  },
                  
                  setupUnloadHandling: function() {
                    const cleanup = () => {
                      try {
                        // FIXED: Clear only specific sessionStorage keys, NOT all sessionStorage
                        // This preserves Supabase auth tokens
                        const sessionTempKeys = ['temp_call_', 'scenario_builder_', 'simulation_state', 'tab_id', 'app_session_state'];
                        Object.keys(sessionStorage).forEach(key => {
                          if (sessionTempKeys.some(prefix => key.startsWith(prefix))) {
                            sessionStorage.removeItem(key);
                          }
                        });
                        const tempKeys = ['temp_call_', 'currentScenario', 'scenario_builder_', 'simulation_state'];
                        Object.keys(localStorage).forEach(key => {
                          if (tempKeys.some(prefix => key.startsWith(prefix))) {
                            localStorage.removeItem(key);
                          }
                        });
                        localStorage.setItem('session_closed_cleanly', 'true');
                      } catch (error) {
                        console.warn('Session cleanup failed:', error);
                      }
                    };
                    
                    window.addEventListener('beforeunload', cleanup);
                    window.addEventListener('pagehide', cleanup);
                  },
                  
                  showCleanupNotification: function() {
                    if (window.location.pathname.includes('/auth/')) return;
                    
                    const notification = document.createElement('div');
                    notification.innerHTML = \`
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
                    \`;
                    
                    document.body.appendChild(notification);
                    setTimeout(() => {
                      if (notification.parentNode) {
                        notification.style.animation = 'slideIn 0.3s ease-out reverse';
                        setTimeout(() => notification.remove(), 300);
                      }
                    }, 4000);
                  }
                };
                
                // Version checking
                const checkVersion = async () => {
                  try {
                    const response = await fetch('/api/version', { cache: 'no-cache' });
                    if (response.ok) {
                      const server = await response.json();
                      const stored = localStorage.getItem('app_cache_version');
                      
                      if (!stored) {
                        localStorage.setItem('app_cache_version', JSON.stringify(server));
                        return;
                      }
                      
                      const current = JSON.parse(stored);
                      if (current.version !== server.version || current.buildTime !== server.buildTime) {
                        console.log('🔄 Version change detected, clearing caches...');
                        
                        if ('caches' in window) {
                          caches.keys().then(names => {
                            names.forEach(name => {
                              if (name.includes('next') || name.includes('static')) {
                                caches.delete(name);
                              }
                            });
                          });
                        }
                        
                        localStorage.setItem('app_cache_version', JSON.stringify(server));
                      }
                    }
                  } catch (e) {
                    console.warn('Version check failed:', e);
                  }
                };
                
                // Initialize everything
                const init = () => {
                  SessionManager.initialize();
                  checkVersion();
                  console.log('✅ App initialization complete');
                };
                
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', init);
                } else {
                  init();
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
