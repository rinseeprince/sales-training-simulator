'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { ScenarioBuilder } from '@/components/pages/scenario-builder'

export default function ScenarioBuilderPage() {
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

  return (
    <MainLayout>
      <ScenarioBuilder />
    </MainLayout>
  )
}
