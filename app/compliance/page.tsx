'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { ComplianceSettings } from '@/components/pages/compliance-settings'
import { redirect } from 'next/navigation'

export default function CompliancePage() {
  const { user, isLoading } = useSupabaseAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (user.subscription_status !== 'admin') {
    redirect('/')
  }

  return (
    <MainLayout>
      <ComplianceSettings />
    </MainLayout>
  )
}
