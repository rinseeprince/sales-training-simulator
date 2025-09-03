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
import { ReviewModal } from '@/components/ui/review-modal'

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
  console.log('Dashboard user object:', user)
  const router = useRouter()
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
        return <Trophy className="h-4 w-4 text-primary" />
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
        return <Badge className="bg-primary">Certified</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

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
            Ready to improve your sales skills?
          </p>
        </div>
        <Link href="/scenario-builder">
          <Button className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium">
            <Play className="mr-2 h-4 w-4" />
            Start New Simulation
          </Button>
        </Link>
      </motion.div>

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
                const status = call.score !== null && call.score >= 90 ? 'certified' : call.score !== null ? 'completed' : 'awaiting_review';
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
                        backgroundColor: status === 'certified' ? '#10b981' : status === 'completed' ? '#048998' : '#f59e0b'
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
                        status === 'certified' ? 'bg-emerald-50 text-emerald-700' :
                        status === 'completed' ? 'bg-primary/10 text-primary' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {status === 'certified' ? 'Certified' : status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
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
    </div>
  )
}
