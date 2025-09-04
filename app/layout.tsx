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
        
        {/* Session management and smart cache initialization */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize session and cache management
              (function() {
                console.log('🚀 Starting app initialization...');
                
                // Initialize session manager first (handles tab close issues)
                const initSessionManager = () => {
                  import('/lib/session-manager.js').then(module => {
                    module.SessionManager.initialize();
                    console.log('✅ Session manager initialized');
                  }).catch(e => console.warn('Session manager init failed:', e));
                };
                
                // Initialize cache manager (handles version updates)
                const initCacheManager = () => {
                  import('/lib/cache-manager.js').then(module => {
                    module.CacheManager.initialize();
                    console.log('✅ Cache manager initialized');
                  }).catch(e => console.warn('Cache manager init failed:', e));
                };
                
                // Smart version checking (only when needed)
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
                        
                        // Clear only app caches (not aggressive)
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
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', () => {
                    initSessionManager();
                    initCacheManager();
                    checkVersion();
                  });
                } else {
                  initSessionManager();
                  initCacheManager(); 
                  checkVersion();
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
