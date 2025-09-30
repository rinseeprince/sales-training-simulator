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

  const fetchCall = async () => {
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

    setLoading(true)
    setError(null)

    try {
      // Use the new organization-based API client
      const { apiRequest } = await import('@/lib/api-client')
      
      // Create an AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const callData = await apiRequest(`/api/calls?callId=${callId}`, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // The new API returns { success: true, call: {...} }
      if (callData.success && callData.call) {
        setCall(callData.call)
      } else {
        setCall(null)
        setError(null) // Don't set error for not found calls
      }
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

  useEffect(() => {
    fetchCall()
  }, [callId])

  // Listen for user data refresh events (tab switching)
  useEffect(() => {
    const handleUserDataRefresh = () => {
      console.log('useCallData: Refreshing call data due to tab switch')
      fetchCall()
    }

    window.addEventListener('userDataRefresh', handleUserDataRefresh)
    
    return () => {
      window.removeEventListener('userDataRefresh', handleUserDataRefresh)
    }
  }, [callId])

  return { call, loading, error }
} 