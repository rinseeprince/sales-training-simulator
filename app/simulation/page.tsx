'use client'

import { useAuth } from '@/components/auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { LiveSimulation } from '@/components/pages/live-simulation'

export default function SimulationPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <MainLayout>
      <LiveSimulation />
    </MainLayout>
  )
}
