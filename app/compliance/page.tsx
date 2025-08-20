'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { ComplianceSettings } from '@/components/pages/compliance-settings'
import { redirect } from 'next/navigation'

export default function CompliancePage() {
  const { user } = useSupabaseAuth()

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
