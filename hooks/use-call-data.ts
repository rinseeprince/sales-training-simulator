import { useState, useEffect } from 'react'
import { Call } from '@/lib/types'

interface UseCallDataProps {
  callId?: string
  userId?: string
}

export function useCallData({ callId, userId }: UseCallDataProps) {
  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!callId) {
      setCall(null)
      return
    }

    const fetchCall = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ callId })
        if (userId) {
          params.append('userId', userId)
        }

        const response = await fetch(`/api/calls?${params}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch call data')
        }

        const callData = await response.json()
        setCall(callData)
      } catch (err) {
        console.error('Error fetching call data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch call data')
      } finally {
        setLoading(false)
      }
    }

    fetchCall()
  }, [callId, userId])

  return { call, loading, error }
} 