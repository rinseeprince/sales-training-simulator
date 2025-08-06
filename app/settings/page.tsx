'use client'

import { useAuth } from '@/components/auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { SettingsPage } from '@/components/pages/settings'

export default function Settings() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <MainLayout>
      <SettingsPage />
    </MainLayout>
  )
}
