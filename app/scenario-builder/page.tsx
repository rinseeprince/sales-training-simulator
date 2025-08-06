'use client'

import { useAuth } from '@/components/auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { ScenarioBuilder } from '@/components/pages/scenario-builder'

export default function ScenarioBuilderPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <MainLayout>
      <ScenarioBuilder />
    </MainLayout>
  )
}
