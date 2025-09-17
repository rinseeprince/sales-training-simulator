import { useQuery } from '@tanstack/react-query'
import { authenticatedGet } from '@/lib/api-client'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'

export interface Scenario {
  id: string
  title: string
  prompt: string
  prospect_name?: string
  voice?: string
  is_company_generated?: boolean
  created_at: string
  updated_at: string
  user_id: string
}

export function useScenarios(userId?: string) {
  const { user } = useSupabaseAuth()
  const targetUserId = userId || user?.id

  return useQuery({
    queryKey: ['scenarios', targetUserId],
    queryFn: async () => {
      if (!targetUserId) {
        console.log('🔄 No user available for scenarios')
        return []
      }
      
      console.log('🔄 Fetching scenarios for user:', targetUserId)
      const response = await authenticatedGet(`/api/scenarios?userId=${targetUserId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch scenarios: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Scenarios loaded:', data.scenarios?.length || 0)
      return data.scenarios || []
    },
    enabled: !!targetUserId, // Only run when user exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
} 