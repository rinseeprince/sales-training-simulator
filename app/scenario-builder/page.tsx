'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { ScenarioBuilder } from '@/components/pages/scenario-builder'

export default function ScenarioBuilderPage() {
  const { user } = useSupabaseAuth()

  if (!user) {
    return null
  }

  return (
    <MainLayout>
      <ScenarioBuilder />
    </MainLayout>
  )
}
