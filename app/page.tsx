'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { SimpleSignInForm } from '@/components/auth/simple-sign-in-form'
import { MainLayout } from '@/components/layout/main-layout'
import { Dashboard } from '@/components/pages/dashboard'

export default function HomePage() {
  const { user, isLoading } = useSupabaseAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <SimpleSignInForm />
  }

  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  )
}
