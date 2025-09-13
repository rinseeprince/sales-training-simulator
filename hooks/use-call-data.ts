import { useState, useEffect } from 'react'
import { Call } from '@/lib/types'
import { authenticatedGet } from '@/lib/api-client'
import { useLoadingManager } from '@/lib/loading-manager'

interface UseCallDataProps {
  callId?: string
  userId?: string
}

export function useCallData({ callId, userId }: UseCallDataProps) {
  const loadingManager = useLoadingManager()
  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!callId) {
      setCall(null)
      return
    }

    // Check for temporary call data first
    const tempData = sessionStorage.getItem(`temp_call_${callId}`)
    if (tempData) {
      try {
        const parsedTempData = JSON.parse(tempData)
        // Don't fetch from API if we have temp data
        setCall(null) // We'll handle temp data separately in the component
        setLoading(false)
        setError(null)
        return
      } catch (error) {
        console.error('Error parsing temp call data:', error)
        // Continue to fetch from API if temp data is invalid
      }
    }

    const fetchCall = async () => {
      const callKey = `call-data-${callId}-${userId || 'no-user'}`
      
      try {
        await loadingManager.withLoading(callKey, async () => {
          setLoading(true)
          setError(null)

          const params = new URLSearchParams({ callId })
          if (userId) {
            params.append('userId', userId)
          }

          const response = await authenticatedGet(`/api/calls?${params}`)
          
          if (!response.ok) {
            const errorData = await response.json()
            // If call not found and we might have temp data, don't treat as error
            if (response.status === 404) {
              setCall(null)
              setError(null) // Don't set error for not found calls
              return
            }
            throw new Error(errorData.error || 'Failed to fetch call data')
          }

          const callData = await response.json()
          setCall(callData)
        })
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