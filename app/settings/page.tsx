'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { SettingsPage } from '@/components/pages/settings'

export default function Settings() {
  const { user } = useSupabaseAuth()

  if (!user) {
    return null
  }

  return (
    <MainLayout>
      <SettingsPage />
    </MainLayout>
  )
}
