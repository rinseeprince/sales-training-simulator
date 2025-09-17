'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { Homepage } from '@/components/pages/homepage'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { user, isLoading } = useSupabaseAuth()
  const router = useRouter()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    if (!isLoading && user && !hasRedirected) {
      console.log('🏠 Homepage: Redirecting authenticated user to dashboard')
      setHasRedirected(true)
      // Use window.location.href for more reliable redirect
      window.location.href = '/dashboard'
    }
  }, [user, isLoading, hasRedirected])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return <Homepage />
}
