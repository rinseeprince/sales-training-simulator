'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { LiveSimulation } from '@/components/pages/live-simulation'

export default function SimulationPage() {
  const { user } = useAuth()
  const router = useRouter()

  // Force redirect to scenario builder - this page should only be accessed through scenario builder
  useEffect(() => {
    const savedScenario = localStorage.getItem('currentScenario')
    
    if (!savedScenario) {
      // No scenario data at all - redirect immediately
      router.replace('/scenario-builder')
      return
    }

    try {
      const parsed = JSON.parse(savedScenario)
      // Check if scenario data is recent (within last hour)
      const isRecent = parsed.timestamp && (Date.now() - parsed.timestamp) < 3600000
      
      if (!isRecent) {
        // Scenario data is stale - clear and redirect
        localStorage.removeItem('currentScenario')
        router.replace('/scenario-builder')
        return
      }
    } catch (error) {
      // Invalid scenario data - clear and redirect
      localStorage.removeItem('currentScenario')
      router.replace('/scenario-builder')
      return
    }
  }, [router])

  if (!user) {
    return null
  }

  return (
    <MainLayout>
      <LiveSimulation />
    </MainLayout>
  )
}
