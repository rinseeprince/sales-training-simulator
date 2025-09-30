'use client'

import { useState, useCallback } from 'react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'

interface SimulationLimit {
  canSimulate: boolean
  count: number
  limit: number
  remaining: number
  isPaid: boolean
  message?: string
}

interface UseSimulationLimitReturn {
  checkSimulationLimit: () => Promise<SimulationLimit | null>
  isChecking: boolean
}

export function useSimulationLimit(): UseSimulationLimitReturn {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const [isChecking, setIsChecking] = useState(false)

  const checkSimulationLimit = useCallback(async (): Promise<SimulationLimit | null> => {
    if (!user?.id) {
      console.warn('No user ID available for simulation limit check')
      return null
    }

    setIsChecking(true)
    try {
      // Use the new organization-based API client
      const { apiRequest } = await import('@/lib/api-client')
      const data = await apiRequest('/api/check-simulation-limit')

      return {
        canSimulate: data.canSimulate || false,
        count: data.count || 0,
        limit: data.limit || 50,
        remaining: data.remaining === -1 ? -1 : (data.remaining || 0),
        isPaid: data.is_paid || false,
        message: data.message
      }
    } catch (error) {
      console.error('Failed to check simulation limit:', error)
      
      // Show error toast but don't block the user - let the actual simulation start handle the enforcement
      toast({
        title: "Warning",
        description: "Could not verify simulation limit. Please try again.",
        variant: "destructive",
      })
      
      return null
    } finally {
      setIsChecking(false)
    }
  }, [user?.id, toast])

  return {
    checkSimulationLimit,
    isChecking
  }
}