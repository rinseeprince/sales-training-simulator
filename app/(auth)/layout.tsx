'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { redirect } from 'next/navigation'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useSupabaseAuth()

  // If user is already logged in, redirect to dashboard
  if (!isLoading && user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
} 