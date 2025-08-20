'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { AdminPanel } from '@/components/pages/admin-panel'
import { redirect } from 'next/navigation'

export default function AdminPage() {
  const { user } = useSupabaseAuth()

  if (!user) {
    return null
  }

  if (user.subscription_status !== 'admin') {
    redirect('/')
  }

  return (
    <MainLayout>
      <AdminPanel />
    </MainLayout>
  )
}
