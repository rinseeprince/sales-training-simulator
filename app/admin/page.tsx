'use client'

import { useAuth } from '@/components/auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { AdminPanel } from '@/components/pages/admin-panel'
import { redirect } from 'next/navigation'

export default function AdminPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  if (user.role !== 'manager' && user.role !== 'admin') {
    redirect('/')
  }

  return (
    <MainLayout>
      <AdminPanel />
    </MainLayout>
  )
}
