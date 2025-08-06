'use client'

import { useAuth } from '@/components/auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { ComplianceSettings } from '@/components/pages/compliance-settings'
import { redirect } from 'next/navigation'

export default function CompliancePage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  if (user.role !== 'admin') {
    redirect('/')
  }

  return (
    <MainLayout>
      <ComplianceSettings />
    </MainLayout>
  )
}
