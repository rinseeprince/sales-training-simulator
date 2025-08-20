'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Play, FileText, Clock, CheckCircle, AlertCircle, Trophy, Target, TrendingUp, Phone } from 'lucide-react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Type definitions
interface Call {
  id: string
  scenario_name: string
  score: number | null
  created_at: string
  duration: string
}

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

const recentSimulations = [
  {
    id: 1,
    title: 'Cold Outbound - Tech Startup',
    status: 'completed',
    score: 85,
    date: '2024-01-15',
    duration: '12 min'
  },
  {
    id: 2,
    title: 'Objection Handling - Enterprise',
    status: 'awaiting_review',
    score: null,
    date: '2024-01-14',
    duration: '18 min'
  },
  {
    id: 3,
    title: 'Negotiation - SaaS Deal',
    status: 'certified',
    score: 92,
    date: '2024-01-13',
    duration: '25 min'
  }
]

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
  const [calls, setCalls] = useState<Call[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalCalls: 0,
    averageScore: 0,
    certifications: 0,
    improvement: 0
  })

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
        
        // Fetch calls
        const callsResponse = await fetch(`/api/calls?userId=${actualUserId}`)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'awaiting_review':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'certified':
        return <Trophy className="h-4 w-4 text-teal-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      case 'awaiting_review':
        return <Badge variant="outline">Awaiting Review</Badge>
      case 'certified':
        return <Badge className="bg-teal-500">Certified</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Ready to improve your sales skills with AI-powered simulations?
            </p>
          </div>
          <Link href="/scenario-builder">
            <Button size="lg" className="mt-4 sm:mt-0">
              <Play className="mr-2 h-5 w-5" />
              Start New Simulation
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : 'Total completed calls'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.averageScore}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : 'Average call score'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certifications</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.certifications}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : 'High-scoring calls (90+)'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : '+0%'}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : 'vs. last period'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Simulations */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Simulations</CardTitle>
              <CardDescription>
                Your latest training sessions and their status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading calls...</div>
              ) : calls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No calls yet. Start your first simulation!</div>
              ) : (
                calls.slice(0, 3).map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/review?callId=${call.id}`)}
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(call.score !== null && call.score >= 90 ? 'certified' : call.score !== null ? 'completed' : 'awaiting_review')}
                      <div>
                        <p className="font-medium">{call.scenario_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(call.created_at).toLocaleDateString()} • {call.duration}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {call.score !== null && (
                        <span className="text-sm font-medium">
                          {call.score}/100
                        </span>
                      )}
                      {getStatusBadge(call.score !== null && call.score >= 90 ? 'certified' : call.score !== null ? 'completed' : 'awaiting_review')}
                    </div>
                  </div>
                ))
              )}
              <div className="pt-1">
                <Link href="/simulations">
                  <Button variant="outline" className="w-full">
                    View All Simulations
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Saved Scenarios */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Saved Scenarios</CardTitle>
              <CardDescription>
                Your reusable training templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading scenarios...</div>
              ) : scenarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No scenarios yet. Create your first one!</div>
              ) : (
                scenarios.slice(0, 3).map((scenario) => (
                  <div
                    key={scenario.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{scenario.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {scenario.persona} • {scenario.difficulty}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(scenario.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
              <div className="pt-1">
                <Link href="/scenario-builder">
                  <Button variant="outline" className="w-full">
                    <FileText className="mr-2 h-4 w-4" />
                    Create New Scenario
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Progress Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>
              Level up your sales skills with gamified training
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Level 7 Sales Professional</span>
                  <span className="text-sm text-muted-foreground">2,340 / 3,000 XP</span>
                </div>
                <Progress value={78} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  660 XP to Level 8
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trophy className="h-6 w-6 text-teal-600" />
                  </div>
                  <p className="text-sm font-medium">Cold Caller</p>
                  <p className="text-xs text-muted-foreground">Earned</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium">Objection Handler</p>
                  <p className="text-xs text-muted-foreground">Earned</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium">Negotiator</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Trophy className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium">Closer</p>
                  <p className="text-xs text-muted-foreground">Locked</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
