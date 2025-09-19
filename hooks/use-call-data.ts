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
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ callId })
        if (userId) {
          params.append('userId', userId)
        }

        // Create an AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

        const response = await fetch(`/api/calls?${params}`, {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
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
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            setError('Request timed out. Please refresh the page and try again.')
          } else {
            setError(err.message)
          }
        } else {
          setError('Failed to fetch call data')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCall()
  }, [callId, userId])

  return { call, loading, error }
} 