import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authenticatedGet } from '@/lib/api-client'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'

export interface ScenarioAssignment {
  id: string
  scenario_id: string
  assigned_by: string
  assigned_to_user: string
  deadline?: string
  status: 'not_started' | 'in_progress' | 'completed'
  completed_at?: string
  result?: 'pass' | 'fail'
  score?: number
  scenario?: {
    id: string
    title: string
    prompt: string
    prospect_name?: string
    voice?: string
    is_company_generated?: boolean
  }
  assigner?: {
    name: string
    email: string
  }
}

export function useScenarioAssignments(scope: 'my' | 'all' = 'my') {
  const { user } = useSupabaseAuth()

  return useQuery({
    queryKey: ['scenario-assignments', scope, user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('🔄 No user available for scenario assignments')
        return []
      }
      
      console.log('🔄 Fetching scenario assignments:', scope)
      const response = await authenticatedGet(`/api/scenario-assignments?scope=${scope}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch assignments: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Scenario assignments loaded:', data.assignments?.length || 0)
      return data.assignments || []
    },
    enabled: !!user?.id, // Only run when user exists
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useRefreshAssignments() {
  const queryClient = useQueryClient()
  
  return (scope: 'my' | 'all' = 'my') => {
    console.log('🔄 Manually refreshing assignments:', scope)
    return queryClient.invalidateQueries({
      queryKey: ['scenario-assignments', scope]
    })
  }
} 