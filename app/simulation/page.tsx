'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { LiveSimulation } from '@/components/pages/live-simulation'

export default function SimulationPage() {
  const { user, isLoading } = useSupabaseAuth()
  const router = useRouter()

  // Check for scenario data - allow URL parameters OR localStorage
  useEffect(() => {
    // First, check if we have URL parameters (from Play button)
    const urlParams = new URLSearchParams(window.location.search)
    const urlPrompt = urlParams.get('prompt')
    
    if (urlPrompt) {
      // URL parameters found - allow page to load
      console.log('🔄 Page-level check: URL parameters found, allowing simulation to load')
      return
    }
    
    // No URL parameters, check localStorage (from Scenario Builder)
    const savedScenario = localStorage.getItem('currentScenario')
    
    if (!savedScenario) {
      // No scenario data at all - redirect immediately
      console.log('🔄 Page-level check: No URL params or localStorage, redirecting to builder')
      router.replace('/scenario-builder')
      return
    }

    try {
      const parsed = JSON.parse(savedScenario)
      // Check if scenario data is recent (within last hour)
      const isRecent = parsed.timestamp && (Date.now() - parsed.timestamp) < 3600000
      
      if (!isRecent) {
        // Scenario data is stale - clear and redirect
        console.log('🔄 Page-level check: localStorage data is stale, redirecting to builder')
        localStorage.removeItem('currentScenario')
        router.replace('/scenario-builder')
        return
      }
      
      console.log('🔄 Page-level check: localStorage data is valid, allowing simulation to load')
    } catch (error) {
      // Invalid scenario data - clear and redirect
      console.log('🔄 Page-level check: localStorage data is invalid, redirecting to builder')
      localStorage.removeItem('currentScenario')
      router.replace('/scenario-builder')
      return
    }
  }, [router])

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
      <LiveSimulation />
    </MainLayout>
  )
}
