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
      const response = await fetch(`/api/check-simulation-limit?userId=${user.id}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check simulation limit')
      }

      if (!data.success) {
        throw new Error(data.error || 'Simulation limit check failed')
      }

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