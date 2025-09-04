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
        
        {/* Cache clearing script for existing users */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Clear old caches on load to prevent stale content
              (function() {
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    names.forEach(function(name) {
                      if (name.includes('repscore') || name.includes('next')) {
                        caches.delete(name);
                      }
                    });
                  }).catch(function(err) {
                    console.warn('Cache cleanup failed:', err);
                  });
                }
                
                // Clear old localStorage entries that might cause issues
                try {
                  const oldKeys = ['old-auth-token', 'cached-scenarios', 'app-state'];
                  oldKeys.forEach(function(key) {
                    localStorage.removeItem(key);
                  });
                } catch (err) {
                  console.warn('localStorage cleanup failed:', err);
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
