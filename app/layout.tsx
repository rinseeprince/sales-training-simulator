import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { SupabaseAuthProvider } from '@/components/supabase-auth-provider'
import { UpdateBanner } from '@/components/ui/update-banner'
import { QueryProvider } from '@/components/query-provider'

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
        <QueryProvider>
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
        </QueryProvider>
      </body>
    </html>
  )
}