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
        
        {/* Smart cache management script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Smart cache initialization
              (function() {
                // Only clear caches if we detect a version mismatch
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
                        
                        // Clear only app caches
                        if ('caches' in window) {
                          caches.keys().then(names => {
                            names.forEach(name => {
                              if (name.includes('next') || name.includes('static') || name.includes('repscore')) {
                                caches.delete(name);
                              }
                            });
                          });
                        }
                        
                        // Clear temporary session data only
                        const tempKeys = ['temp_call_', 'currentScenario', 'scenario_builder_', 'simulation_state'];
                        Object.keys(sessionStorage).forEach(key => {
                          if (tempKeys.some(prefix => key.startsWith(prefix))) {
                            sessionStorage.removeItem(key);
                          }
                        });
                        
                        localStorage.setItem('app_cache_version', JSON.stringify(server));
                      }
                    }
                  } catch (e) {
                    console.warn('Version check failed:', e);
                  }
                };
                
                checkVersion();
                
                // Initialize cache manager when DOM is ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', () => {
                    import('/lib/cache-manager.js').then(module => {
                      module.CacheManager.initialize();
                    }).catch(e => console.warn('Cache manager init failed:', e));
                  });
                } else {
                  import('/lib/cache-manager.js').then(module => {
                    module.CacheManager.initialize();
                  }).catch(e => console.warn('Cache manager init failed:', e));
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
