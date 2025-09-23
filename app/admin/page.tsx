'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { AdminPanel } from '@/components/pages/admin-panel'
import { redirect } from 'next/navigation'

export default function AdminPage() {
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

  if (user.role !== 'admin' && user.role !== 'manager') {
    redirect('/')
  }

  return (
    <MainLayout>
      <AdminPanel />
    </MainLayout>
  )
}
