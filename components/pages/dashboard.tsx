'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, FileText, Clock, CheckCircle, Trophy, Target, TrendingUp, Phone, Users, Trash2 } from 'lucide-react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ReviewModal } from '@/components/ui/review-modal'
import { supabaseClient } from '@/lib/supabase-auth'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Call, User, AssignmentCompletion } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Type definitions

interface Scenario {
  id: string
  title: string
  persona: string
  difficulty: string
  created_at: string
}

interface Stats {
  totalCalls: number
  averageScore: number
  certifications: number
  improvement: number
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  department: string
}

interface TeamMetrics {
  totalCalls: number
  avgScore: number
  pendingReviews: number
  approvedCalls: number
  teamMembers: number
  completionRate: number
}

interface Review {
  id: string
  status: string
  manager_feedback?: string
  score_override?: number
  reviewed_at?: string
  created_at: string
  calls?: {
    id: string
    score?: number
    transcript?: string
    duration?: string
    rep_id: string
    created_at: string
    simple_users?: {
      id: string
      name: string
      email: string
    }
  }
  assignment_id?: string
  scenario_assignments?: {
    id: string
    scenario_id: string
    scenarios?: {
      title: string
    }
  }
}

// const recentSimulations = [
//   {
//     id: 1,
//     title: 'Cold Outbound - Tech Startup',
//     status: 'completed',
//     score: 85,
//     date: '2024-01-15',
//     duration: '12 min'
//   },
//   {
//     id: 2,
//     title: 'Objection Handling - Enterprise',
//     status: 'awaiting_review',
//     score: null,
//     date: '2024-01-14',
//     duration: '18 min'
//   },
//   {
//     id: 3,
//     title: 'Negotiation - SaaS Deal',
//     status: 'certified',
//     score: 92,
//     date: '2024-01-13',
//     duration: '25 min'
//   }
// ]

const savedScenarios = [
  {
    id: 1,
    title: 'Enterprise Software Demo',
    type: 'Discovery Call (Inbound Generated)',
    difficulty: 'Medium',
    lastUsed: '2024-01-10'
  },
  {
    id: 2,
    title: 'Price Objection Handling',
    type: 'Objection Handling',
    difficulty: 'Hard',
    lastUsed: '2024-01-08'
  },
  {
    id: 3,
    title: 'Quick Product Pitch',
    type: 'Elevator Pitch',
    difficulty: 'Easy',
    lastUsed: '2024-01-05'
  }
]

export function Dashboard() {
  const { user } = useSupabaseAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [calls, setCalls] = useState<Call[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalCalls: 0,
    averageScore: 0,
    certifications: 0,
    improvement: 0
  })
  
  // Manager Dashboard State
  const [userRole, setUserRole] = useState<string>('user')
  const [isManagerView, setIsManagerView] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics>({
    totalCalls: 0,
    avgScore: 0,
    pendingReviews: 0,
    approvedCalls: 0,
    teamMembers: 0,
    completionRate: 0
  })
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoadingManagerData, setIsLoadingManagerData] = useState(false)
  const [managerDataError, setManagerDataError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState('30')
  const [deletingAssignmentIds, setDeletingAssignmentIds] = useState<Set<string>>(new Set())
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<{call: Call, completion: AssignmentCompletion & { assignment_id: string }} | null>(null)

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const session = await supabaseClient.auth.getSession()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (session.data.session?.access_token) {
      headers['Authorization'] = `Bearer ${session.data.session.access_token}`
    }
    
    return headers
  }, [])
  
  // Load user role
  const loadUserRole = useCallback(async () => {
    if (!user) return
    
    try {
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`)
      const profileData = await profileResponse.json()
      
      if (profileData.success) {
        setUserRole(profileData.userProfile.role || 'user')
      }
    } catch (error) {
      console.error('Error loading user role:', error)
    }
  }, [user])
  
  // Load user role when component mounts
  useEffect(() => {
    if (user) {
      loadUserRole()
    }
  }, [user, loadUserRole])

  // Fetch calls and scenarios data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      
      try {
        // Get the correct user ID from simple_users table
        const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
        const profileData = await profileResponse.json();
        
        if (!profileData.success) {
          console.error('Failed to get user profile:', profileData.error);
          return;
        }

        const actualUserId = profileData.userProfile.id;
        
        
        // Fetch calls with assignment completion status
        const callsResponse = await fetch(`/api/calls?userId=${actualUserId}&includeAssignments=true`)
        if (callsResponse.ok) {
          const callsData = await callsResponse.json()
          setCalls(callsData.calls || [])
          
          // Calculate stats
          const totalCalls = callsData.calls?.length || 0
          const scores = callsData.calls?.map((call: Call) => call.score).filter((score: number | null) => score !== null) || []
          const averageScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
          const certifications = callsData.calls?.filter((call: Call) => call.score !== null && call.score >= 90).length || 0
          
          setStats({
            totalCalls,
            averageScore,
            certifications,
            improvement: 0 // TODO: Calculate improvement over time
          })
        }
        
        // Fetch scenarios
        const scenariosResponse = await fetch(`/api/scenarios?userId=${actualUserId}`)
        if (scenariosResponse.ok) {
          const scenariosData = await scenariosResponse.json()
          setScenarios(scenariosData.scenarios || [])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [user])
  
  // Fetch manager data when in manager view with exact same fallback as assign scenario modal
  useEffect(() => {
    const fetchManagerData = async () => {
      console.log('🔍 CLIENT DEBUG: fetchManagerData called with:', {
        user: !!user,
        isManagerView,
        userRole,
        hasAccess: ['manager', 'admin'].includes(userRole || '')
      })
      
      if (!user || !isManagerView || !['manager', 'admin'].includes(userRole || '')) {
        console.log('🔍 CLIENT DEBUG: Skipping manager data fetch - conditions not met')
        return
      }
      
      console.log('🔍 CLIENT DEBUG: Starting manager data fetch...')
      setIsLoadingManagerData(true)
      setManagerDataError(null)
      
      try {
        // Get team metrics with exact same fallback pattern as assign scenario modal
        const metricsTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Metrics query timeout')), 5000)
        })
        
        const headers = await getAuthHeaders()
        console.log('🔍 CLIENT DEBUG: Making metrics API call to:', `/api/manager-reviews/metrics?timeRange=${dateRange}`)
        
        // DEBUG: First call debug endpoint to see what data exists
        try {
          const debugResponse = await fetch('/api/debug-metrics', { headers })
          if (debugResponse.ok) {
            const debugData = await debugResponse.json()
            console.log('🔍 CLIENT DEBUG: Debug endpoint data:', debugData)
            console.log('🔍 CLIENT DEBUG: Auth user:', debugData.debug?.authUser)
            console.log('🔍 CLIENT DEBUG: Current user:', debugData.debug?.currentUser)
            console.log('🔍 CLIENT DEBUG: Domain:', debugData.debug?.domain)
            console.log('🔍 CLIENT DEBUG: Team members found:', debugData.debug?.teamMembers)
            console.log('🔍 CLIENT DEBUG: Calls found:', debugData.debug?.calls)
            console.log('🔍 CLIENT DEBUG: Assignments found:', debugData.debug?.assignments)
          }
        } catch (e) {
          console.log('🔍 CLIENT DEBUG: Debug endpoint failed:', e)
        }
        
        const metricsQueryPromise = fetch(`/api/manager-reviews/metrics?timeRange=${dateRange}`, { headers })
          .then(async (response) => {
            console.log('🔍 CLIENT DEBUG: Metrics API response status:', response.status)
            if (response.ok) {
              const data = await response.json()
              console.log('🔍 CLIENT DEBUG: Metrics API response data:', data)
              console.log('🔍 CLIENT DEBUG: Metrics object details:', JSON.stringify(data.metrics, null, 2))
              return { data: data.metrics || {}, error: null }
            } else {
              const errorText = await response.text()
              console.error('🔍 CLIENT DEBUG: Metrics API error:', response.status, errorText)
              throw new Error(`Metrics API error: ${response.status}`)
            }
          })
        
        const { data: metricsData, error: metricsError } = await Promise.race([
          metricsQueryPromise,
          metricsTimeoutPromise
        ]).catch(async (timeoutError) => {
          console.warn('📊 Metrics API timed out, using fallback:', timeoutError)
          // Fallback: API call with fresh headers with better error handling
          try {
            const response = await fetch('/api/manager-reviews/metrics?' + new URLSearchParams({
              timeRange: dateRange
            }), { headers: await getAuthHeaders() })
            
            if (response.ok) {
              const fallbackData = await response.json()
              return { data: fallbackData.metrics || {}, error: null }
            } else {
              console.warn('📊 Fallback metrics API failed, returning empty metrics')
              return { 
                data: {
                  totalCalls: 0,
                  avgScore: 0,
                  pendingReviews: 0,
                  approvedCalls: 0,
                  teamMembers: 0,
                  completionRate: 0
                }, 
                error: null 
              }
            }
          } catch (fallbackError) {
            console.warn('📊 Fallback metrics threw error, returning empty metrics:', fallbackError)
            return { 
              data: {
                totalCalls: 0,
                avgScore: 0,
                pendingReviews: 0,
                approvedCalls: 0,
                teamMembers: 0,
                completionRate: 0
              }, 
              error: null 
            }
          }
        }) as { data: TeamMetrics; error: Error | null }
        
        if (metricsError) {
          console.error('❌ Failed to load team metrics:', metricsError)
        } else {
          console.log('🔍 CLIENT DEBUG: Setting team metrics:', metricsData)
          setTeamMetrics(metricsData)
        }
        
        // Get team members with exact same fallback pattern as assign scenario modal
        const emailDomain = user.email?.split('@')[1] || ''
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        })
        
        const queryPromise = supabaseClient
          .from('simple_users')
          .select('id, email, name, role, department')
          .like('email', `%@${emailDomain}`)
          .order('name')
        
        const { data: teamMembersData, error: teamMembersError } = await Promise.race([
          queryPromise,
          timeoutPromise
        ]).catch(async (timeoutError) => {
          console.warn('👥 Team members query timed out, using fallback:', timeoutError)
          // Fallback to using the API endpoint directly (like assign scenario modal)
          const response = await fetch('/api/assignments?' + new URLSearchParams({
            domain: emailDomain
          }))
          
          if (!response.ok) {
            throw new Error('Failed to load users via API')
          }
          
          const apiData = await response.json()
          return { data: apiData.users, error: null }
        }) as { data: TeamMember[] | null; error: Error | null }
        
        if (teamMembersError) {
          console.error('❌ Failed to load team members:', teamMembersError)
          setManagerDataError('Failed to load team members. Please refresh or try again.')
        } else {
          setTeamMembers(teamMembersData || [])
        }
        
        // Get reviews with timeout fallback
        const reviewsTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Reviews query timeout')), 5000)
        })
        
        const reviewParams = new URLSearchParams({
          status: assignmentFilter === 'all' ? 'pending' : assignmentFilter,
          search: searchQuery,
          user: selectedUser
        })
        
        const reviewsQueryPromise = fetch(`/api/manager-reviews?${reviewParams}`, { headers })
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json()
              return { data: data.reviews || [], error: null }
            } else {
              throw new Error(`Reviews API error: ${response.status}`)
            }
          })
        
        const { data: reviewsData, error: reviewsError } = await Promise.race([
          reviewsQueryPromise,
          reviewsTimeoutPromise
        ]).catch(async (timeoutError) => {
          console.warn('📋 Reviews API timed out, using fallback:', timeoutError)
          // Fallback: Fresh API call with simpler error handling
          try {
            const response = await fetch(`/api/manager-reviews?${reviewParams}`, { 
              headers: await getAuthHeaders() 
            })
            
            if (response.ok) {
              const fallbackData = await response.json()
              return { data: fallbackData.reviews || [], error: null }
            } else {
              console.warn('📋 Fallback API also failed, returning empty array')
              return { data: [], error: null }
            }
          } catch (fallbackError) {
            console.warn('📋 Fallback API threw error, returning empty array:', fallbackError)
            return { data: [], error: null }
          }
        }) as { data: Review[]; error: Error | null }
        
        if (reviewsError) {
          console.error('❌ Failed to load reviews:', reviewsError)
        } else {
          setReviews(reviewsData || [])
        }
        
      } catch (error) {
        console.error('💥 Error fetching manager data:', error)
        setManagerDataError('Failed to load manager dashboard data. Please refresh or try again.')
      } finally {
        setIsLoadingManagerData(false)
      }
    }

    // Add visibility change listener like assign scenario modal
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isManagerView && user) {
        fetchManagerData()
      }
    }

    fetchManagerData()
    
    // Reload data when tab becomes visible (like assign scenario modal)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, isManagerView, userRole, selectedUser, assignmentFilter, dateRange, searchQuery, getAuthHeaders])

  // Delete assignment function
  const handleDeleteAssignment = async (call: Call, assignmentCompletion: AssignmentCompletion & { assignment_id: string }) => {
    if (!user?.id || !assignmentCompletion?.assignment_id) return
    
    // Check if assignment is approved
    if (assignmentCompletion.review_status !== 'approved') {
      toast({
        title: "Error",
        description: "Only approved assignments can be deleted.",
        variant: "destructive"
      })
      return
    }

    // Store the assignment to delete and open the modal
    setAssignmentToDelete({call, completion: assignmentCompletion})
    setDeleteModalOpen(true)
  }

  // Handle the actual deletion after confirmation
  const handleDeleteConfirm = async () => {
    if (!assignmentToDelete) return
    
    const { call, completion: assignmentCompletion } = assignmentToDelete

    // Get the current user profile to access the actualUserId
    let currentUserId: string
    try {
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user?.id}`)
      const profileData = await profileResponse.json()
      if (!profileData.success) {
        throw new Error('Failed to get user profile')
      }
      currentUserId = profileData.userProfile.id
    } catch (error) {
      console.error('Error getting user profile:', error)
      toast({
        title: "Error",
        description: "Failed to get user information. Please try again.",
        variant: "destructive"
      })
      setDeleteModalOpen(false)
      setAssignmentToDelete(null)
      return
    }

    const assignmentId = assignmentCompletion.assignment_id
    setDeletingAssignmentIds(prev => new Set(prev).add(assignmentId))

    try {
      const response = await fetch(`/api/assignments?assignmentId=${assignmentId}&userId=${currentUserId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete assignment')
      }

      // Remove the call from the local state
      setCalls(prevCalls => prevCalls.filter(c => c.id !== call.id))
      
      // Show success message
      toast({
        title: "Success",
        description: "Assignment deleted successfully!",
        variant: "default"
      })
      
      // Close the modal
      setDeleteModalOpen(false)
      setAssignmentToDelete(null)
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast({
        title: "Error",
        description: "Failed to delete assignment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setDeletingAssignmentIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(assignmentId)
        return newSet
      })
    }
  }

  // Moved status helper functions inline since they're only used in one place

  return (
    <div className="space-y-6">
      {/* Compressed Hero Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] px-6 py-4 h-20"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Welcome back, {
              user?.name 
                ? user.name.split(' ')[0] 
                : user?.email 
                  ? user.email.split('@')[0].replace(/[._]/g, ' ').split(' ')[0]
                  : 'User'
            }!
          </h1>
          <p className="text-sm text-slate-500">
            {isManagerView ? 'Review and approve your team\'s performance' : 'Ready to improve your sales skills?'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Toggle for Managers/Admins */}
          {(userRole === 'manager' || userRole === 'admin') && (
            <div className="flex items-center space-x-3 bg-slate-50 rounded-lg p-1">
              <button
                onClick={() => setIsManagerView(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  !isManagerView 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Play className="h-4 w-4" />
                <span>My Dashboard</span>
              </button>
              <button
                onClick={() => {
                  console.log('🔍 CLIENT DEBUG: Team Review button clicked, switching to manager view')
                  setIsManagerView(true)
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isManagerView 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Team Review</span>
              </button>
            </div>
          )}
          <Link href="/scenario-builder">
            <Button className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium">
              <Play className="mr-2 h-4 w-4" />
              Start New Simulation
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Conditional Rendering: Manager View or Regular Dashboard */}
      {!isManagerView ? (
        <>
          {/* Modern Metric Tiles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Total Calls Tile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6 hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">TOTAL CALLS</span>
            <Phone className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-3xl font-semibold text-slate-900 mb-1">
            {loading ? (
              <div className="w-12 h-8 bg-slate-200 rounded skeleton"></div>
            ) : (
              stats.totalCalls
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-0.5">
              {/* Mini sparkline placeholder */}
              <div className="w-1 h-3 bg-slate-200 rounded-full"></div>
              <div className="w-1 h-4 bg-slate-300 rounded-full"></div>
              <div className="w-1 h-2 bg-slate-200 rounded-full"></div>
              <div className="w-1 h-5 bg-slate-400 rounded-full"></div>
              <div className="w-1 h-3 bg-slate-300 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Average Score Tile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6 hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">AVERAGE SCORE</span>
            <Target className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-3xl font-semibold text-slate-900 mb-1">
            {loading ? (
              <div className="w-12 h-8 bg-slate-200 rounded skeleton"></div>
            ) : (
              stats.averageScore
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-0.5">
              {/* Mini sparkline */}
              <div className="w-1 h-2 bg-emerald-200 rounded-full"></div>
              <div className="w-1 h-3 bg-emerald-300 rounded-full"></div>
              <div className="w-1 h-4 bg-emerald-400 rounded-full"></div>
              <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
              <div className="w-1 h-4 bg-emerald-400 rounded-full"></div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">
              ↗ +2.3%
            </span>
          </div>
        </div>

        {/* Certifications Tile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6 hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">CERTIFICATIONS</span>
            <Trophy className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-3xl font-semibold text-slate-900 mb-1">
            {loading ? (
              <div className="w-12 h-8 bg-slate-200 rounded skeleton"></div>
            ) : (
              stats.certifications
            )}
          </div>
          <div className="flex items-center space-x-2">
            {stats.certifications === 0 ? (
              <span className="text-xs text-slate-500">Create your first certification</span>
            ) : (
              <>
                <div className="flex space-x-0.5">
                  <div className="w-1 h-3 bg-amber-300 rounded-full"></div>
                  <div className="w-1 h-2 bg-amber-200 rounded-full"></div>
                  <div className="w-1 h-4 bg-amber-400 rounded-full"></div>
                  <div className="w-1 h-3 bg-amber-300 rounded-full"></div>
                  <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs">
                  ↗ +1
                </span>
              </>
            )}
          </div>
        </div>

        {/* Improvement Tile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6 hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">IMPROVEMENT</span>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-3xl font-semibold text-slate-900 mb-1">
            {loading ? (
              <div className="w-12 h-8 bg-slate-200 rounded skeleton"></div>
            ) : (
              '0%'
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-0.5">
              <div className="w-1 h-3 bg-slate-200 rounded-full"></div>
              <div className="w-1 h-3 bg-slate-200 rounded-full"></div>
              <div className="w-1 h-3 bg-slate-200 rounded-full"></div>
              <div className="w-1 h-3 bg-slate-200 rounded-full"></div>
              <div className="w-1 h-3 bg-slate-200 rounded-full"></div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">
              → No change this week
            </span>
          </div>
        </div>
      </motion.div>


      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Simulations */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Recent Simulations</h3>
            <p className="text-sm text-slate-500">Your latest training sessions</p>
          </div>
          
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-slate-100">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-2 h-2 bg-slate-200 rounded-full skeleton"></div>
                      <div className="flex-1">
                        <div className="w-32 h-4 bg-slate-200 rounded skeleton mb-1"></div>
                        <div className="w-24 h-3 bg-slate-200 rounded skeleton"></div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-1.5 bg-slate-200 rounded skeleton"></div>
                      <div className="w-16 h-6 bg-slate-200 rounded-full skeleton"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : calls.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Phone className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 mb-2">No calls yet</p>
                <p className="text-xs text-slate-400">Start your first simulation to see it here</p>
              </div>
            ) : (
              calls.slice(0, 3).map((call) => {
                // Check if this call has been approved by a manager
                const callWithAssignments = call as Call & { assignment_completions?: AssignmentCompletion[] }
                const assignmentCompletion = callWithAssignments.assignment_completions?.[0]
                const isApproved = assignmentCompletion?.review_status === 'approved'
                
                const status = isApproved 
                  ? 'passed' 
                  : call.score !== null && call.score >= 90 
                    ? 'certified' 
                    : call.score !== null 
                      ? 'completed' 
                      : 'awaiting_review';
                return (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all duration-150 cursor-pointer group"
                    onClick={() => {
                      setSelectedCallId(call.id)
                      setReviewModalOpen(true)
                    }}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                        backgroundColor: status === 'passed' ? '#3b82f6' : status === 'certified' ? '#10b981' : status === 'completed' ? '#048998' : '#f59e0b'
                      }}></div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate">{call.scenario_name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(call.created_at).toLocaleDateString()} • {call.duration}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      {call.score !== null && (
                        <div className="flex items-center space-x-1">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${call.score}%`,
                                backgroundColor: call.score >= 90 ? '#10b981' : call.score >= 70 ? '#048998' : '#f59e0b'
                              }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-slate-700 w-8 text-right">
                            {call.score}
                          </span>
                        </div>
                      )}
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        status === 'passed' ? 'bg-blue-50 text-blue-700' :
                        status === 'certified' ? 'bg-emerald-50 text-emerald-700' :
                        status === 'completed' ? 'bg-primary/10 text-primary' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {status === 'passed' ? 'Passed' : status === 'certified' ? 'Certified' : status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                      {/* Delete button for passed assignments */}
                      {status === 'passed' && assignmentCompletion && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation() // Prevent opening the review modal
                            handleDeleteAssignment(call, assignmentCompletion)
                          }}
                          disabled={deletingAssignmentIds.has(assignmentCompletion.assignment_id)}
                          className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                          title="Delete approved assignment"
                        >
                          {deletingAssignmentIds.has(assignmentCompletion.assignment_id) ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-slate-400"></div>
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="pt-4 border-t border-slate-100 mt-6">
            <Link href="/simulations">
              <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50">
                View All Simulations
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Saved Scenarios */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Saved Scenarios</h3>
            <p className="text-sm text-slate-500">Your reusable training templates</p>
          </div>
          
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-slate-100">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-8 h-8 bg-slate-200 rounded-lg skeleton"></div>
                      <div className="flex-1">
                        <div className="w-40 h-4 bg-slate-200 rounded skeleton mb-2"></div>
                        <div className="flex space-x-2">
                          <div className="w-16 h-5 bg-slate-200 rounded-full skeleton"></div>
                          <div className="w-12 h-5 bg-slate-200 rounded-full skeleton"></div>
                        </div>
                      </div>
                    </div>
                    <div className="w-16 h-3 bg-slate-200 rounded skeleton"></div>
                  </div>
                ))}
              </div>
            ) : scenarios.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 mb-2">No scenarios yet</p>
                <p className="text-xs text-slate-400">Create your first scenario template</p>
              </div>
            ) : (
              scenarios.slice(0, 3).map((scenario, index) => {
                const emojis = ['📞', '🛒', '🏦', '💼', '🎯', '🚀'];
                const emoji = emojis[index % emojis.length];
                return (
                  <div
                    key={scenario.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all duration-150 group"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                        {emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate">{scenario.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs">
                            Discovery
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs">
                            Medium
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0">
                      {new Date(scenario.created_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="pt-4 border-t border-slate-100 mt-6">
            <Link href="/scenario-builder">
              <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50">
                <FileText className="mr-2 h-4 w-4" />
                Create New Scenario
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Progress Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Your Progress</h3>
          <p className="text-sm text-slate-500">Level up your sales skills with gamified training</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-900">Level 7 Sales Professional</span>
              <span className="text-sm text-slate-500">2,340 / 3,000 XP</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
                style={{ width: '78%' }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">660 XP to Level 8</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-slate-900">Cold Caller</p>
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs mt-1">
                Earned
              </span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Target className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-slate-900">Objection Handler</p>
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs mt-1">
                Earned
              </span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-slate-900">Negotiator</p>
              <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs mt-1">
                In Progress
              </span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Trophy className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900">Closer</p>
              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-xs mt-1">
                Locked
              </span>
            </div>
          </div>
        </div>
      </motion.div>

        </>
      ) : (
        /* Manager Dashboard View */
        <div className="space-y-6">
          {/* Manager Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* User Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Team Member</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Members</SelectItem>
                    {(() => {
                      return teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))
                    })()}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignment Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Review Status</label>
                <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="all">All Reviews</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Time Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Search</label>
                <Input
                  placeholder="Search calls, users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </motion.div>

          {/* Manager Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">PENDING REVIEWS</span>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-3xl font-semibold text-slate-900 mb-1">
                {isLoadingManagerData ? (
                  <div className="w-12 h-8 bg-slate-200 rounded skeleton"></div>
                ) : (
                  teamMetrics.pendingReviews
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">TEAM AVG SCORE</span>
                <Target className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-3xl font-semibold text-slate-900 mb-1">
                {isLoadingManagerData ? (
                  <div className="w-12 h-8 bg-slate-200 rounded skeleton"></div>
                ) : (
                  Math.round(teamMetrics.avgScore || 0)
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">TEAM MEMBERS</span>
                <Users className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-3xl font-semibold text-slate-900 mb-1">
                {isLoadingManagerData ? (
                  <div className="w-12 h-8 bg-slate-200 rounded skeleton"></div>
                ) : (
                  teamMembers.length
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">COMPLETION RATE</span>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-3xl font-semibold text-slate-900 mb-1">
                {isLoadingManagerData ? (
                  <div className="w-12 h-8 bg-slate-200 rounded skeleton"></div>
                ) : (
                  `${Math.round(teamMetrics.completionRate || 0)}%`
                )}
              </div>
            </div>
          </motion.div>

          {/* Review Queue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Review Queue</h3>
              <p className="text-sm text-slate-500">Calls awaiting your review and approval</p>
            </div>
            
            {managerDataError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{managerDataError}</p>
              </div>
            )}
            
            {isLoadingManagerData ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-2">No reviews pending</p>
                <p className="text-xs text-slate-400">All team calls have been reviewed</p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold">Scenario</TableHead>
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Score</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.slice(0, 10).map((review) => (
                      <TableRow key={review.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {review.scenario_assignments?.scenarios?.title || 'Unknown Scenario'}
                            </p>
                            <p className="text-sm text-slate-500 line-clamp-1">
                              {review.calls?.transcript ? review.calls.transcript.slice(0, 80) + '...' : 'No transcript available'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-primary">
                                {(review.calls?.simple_users?.name || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {review.calls?.simple_users?.name || 'Unknown User'}
                              </p>
                              <p className="text-sm text-slate-500">
                                {review.calls?.simple_users?.email || 'No email'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {new Date(review.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {review.calls?.score ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{review.calls.score}</span>
                              <Badge 
                                variant={review.calls.score >= 90 ? "default" : review.calls.score >= 80 ? "secondary" : review.calls.score >= 70 ? "outline" : "destructive"}
                              >
                                {review.calls.score >= 90 ? 'Excellent' : review.calls.score >= 80 ? 'Good' : review.calls.score >= 70 ? 'Fair' : 'Needs Work'}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-slate-400">No Score</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={review.status === 'pending' ? 'outline' : 
                                   review.status === 'approved' ? 'default' : 
                                   review.status === 'needs_improvement' ? 'secondary' : 'destructive'}
                          >
                            {review.status === 'pending' ? 'Pending' :
                             review.status === 'approved' ? 'Approved' :
                             review.status === 'needs_improvement' ? 'Needs Work' : 'Rejected'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 rounded-xl font-medium"
                            onClick={() => {
                              if (review.calls?.id) {
                                setSelectedCallId(review.calls.id)
                                setReviewModalOpen(true)
                              }
                            }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false)
          setSelectedCallId(null)
        }}
        callId={selectedCallId}
        title={selectedCallId ? calls.find(c => c.id === selectedCallId)?.scenario_name : undefined}
      />

      {/* Delete Assignment Confirmation Dialog */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Approved Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this approved assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteModalOpen(false)
              setAssignmentToDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={assignmentToDelete ? deletingAssignmentIds.has(assignmentToDelete.completion.assignment_id) : false}
              className="bg-red-600 hover:bg-red-700"
            >
              {assignmentToDelete && deletingAssignmentIds.has(assignmentToDelete.completion.assignment_id) ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
