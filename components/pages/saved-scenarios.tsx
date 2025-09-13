'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  FileText, 
  Calendar, 
  Clock, 
  User, 
  Play, 
  Edit, 
  Trash2, 
  Copy,
  Building,
  CheckCircle,
  AlertCircle,
  Timer,
  XCircle
} from 'lucide-react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { authenticatedGet, authenticatedPatch } from '@/lib/api-client'

interface Scenario {
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

interface ScenarioAssignment {
  id: string
  scenario_id: string
  assigned_by: string
  assigned_to_user: string
  deadline?: string
  status: 'not_started' | 'in_progress' | 'completed'
  completed_at?: string
  result?: 'pass' | 'fail'
  scenario?: Scenario
  assigner?: {
    name: string
    email: string
  }
}

export function SavedScenarios() {
  const { user } = useSupabaseAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [assignments, setAssignments] = useState<ScenarioAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('my-scenarios')

  useEffect(() => {
    if (user) {
      loadScenarios()
      loadAssignments()
    }
  }, [user])

  // Handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'assigned') {
      setActiveTab('assigned-scenarios')
    }
  }, [searchParams])

  const loadScenarios = async () => {
    try {
      console.log('🔍 Loading scenarios...')
      const profileResponse = await authenticatedGet(`/api/user-profile?authUserId=${user?.id}`)
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        console.error('❌ Failed to get user profile:', profileData.error)
        return
      }

      console.log('🔍 Fetching scenarios for user:', profileData.userProfile.id)
      const response = await authenticatedGet(`/api/scenarios?userId=${profileData.userProfile.id}`)
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Scenarios loaded:', data.scenarios?.length || 0)
        setScenarios(data.scenarios || [])
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to load scenarios:', errorData)
        toast({
          title: "Error",
          description: errorData.error || "Failed to load scenarios",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Error loading scenarios:', error)
      toast({
        title: "Error",
        description: "Failed to load scenarios",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    try {
      console.log('🔍 Loading assignments...')
      console.log('🔍 Making request to: /api/scenario-assignments?scope=my')
      
      const response = await authenticatedGet('/api/scenario-assignments?scope=my')
      console.log('🔍 Assignment response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Assignments loaded:', data.assignments?.length || 0)
        console.log('📋 Assignment data:', data)
        setAssignments(data.assignments || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        console.error('❌ Failed to load assignments:', errorData)
        console.error('❌ Response status:', response.status)
        console.error('❌ Response statusText:', response.statusText)
      }
    } catch (error) {
      console.error('❌ Error loading assignments:', error)
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handlePlayScenario = (scenario: Scenario | undefined) => {
    if (!scenario) return
    
    console.log('🎮 Play scenario clicked:', scenario.title)
    
    const params = new URLSearchParams({
      prompt: scenario.prompt,
      prospectName: scenario.prospect_name || 'Prospect',
      voice: scenario.voice || 'rachel'
    })
    
    console.log('🎮 Navigating to simulation with params:', params.toString())
    router.push(`/simulation?${params.toString()}`)
  }

  const handleEditScenario = (scenario: Scenario) => {
    console.log('✏️ Edit scenario clicked:', scenario.title)
    
    localStorage.setItem('editScenario', JSON.stringify({
      title: scenario.title,
      prompt: scenario.prompt,
      prospectName: scenario.prospect_name,
      voice: scenario.voice,
      saveReuse: true
    }))
    
    console.log('✏️ Navigating to scenario builder')
    router.push('/scenario-builder')
  }

  const handleDeleteScenario = async (scenarioId: string) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return

    try {
      const response = await fetch(`/api/scenarios/${scenarioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Scenario deleted successfully"
        })
        loadScenarios()
      } else {
        throw new Error('Failed to delete scenario')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete scenario",
        variant: "destructive"
      })
    }
  }

  const handleDuplicateScenario = async (scenario: Scenario) => {
    try {
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user?.id}`)
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile')
      }

      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${scenario.title} (Copy)`,
          prompt: scenario.prompt,
          prospectName: scenario.prospect_name,
          voice: scenario.voice,
          userId: profileData.userProfile.id
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Scenario duplicated successfully"
        })
        loadScenarios()
      } else {
        throw new Error('Failed to duplicate scenario')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate scenario",
        variant: "destructive"
      })
    }
  }

  const handleUpdateAssignmentStatus = async (assignmentId: string, status: string) => {
    try {
      const response = await authenticatedPatch('/api/scenario-assignments', {
        assignmentId,
        status
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Assignment status updated"
        })
        loadAssignments()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update assignment status",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (status: string, deadline?: string) => {
    const isOverdue = deadline && new Date(deadline) < new Date() && status !== 'completed'
    
    if (isOverdue) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Overdue
      </Badge>
    }

    switch (status) {
      case 'completed':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      case 'in_progress':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Timer className="h-3 w-3" />
          In Progress
        </Badge>
      default:
        return <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Not Started
        </Badge>
    }
  }

  const filteredScenarios = scenarios.filter(scenario => 
    scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scenario.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.scenario?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          assignment.scenario?.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterStatus === 'all') return matchesSearch
    
    const isOverdue = assignment.deadline && 
                      new Date(assignment.deadline) < new Date() && 
                      assignment.status !== 'completed'
    
    if (filterStatus === 'overdue') return matchesSearch && isOverdue
    return matchesSearch && assignment.status === filterStatus
  })

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Saved Scenarios</h1>
            <p className="text-sm text-slate-500">Manage your scenarios and assignments</p>
          </div>
          <Button onClick={() => router.push('/scenario-builder')}>
            <FileText className="mr-2 h-4 w-4" />
            Create New Scenario
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="p-6 border-b border-slate-200">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search scenarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {activeTab === 'assigned-scenarios' && (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-scenarios">My Scenarios</TabsTrigger>
            <TabsTrigger value="assigned-scenarios">
              Assigned Scenarios
              {assignments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {assignments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-scenarios" className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="mt-4 text-slate-500">Loading scenarios...</p>
              </div>
            ) : filteredScenarios.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No scenarios found</p>
                <Button 
                  onClick={() => router.push('/scenario-builder')} 
                  className="mt-4"
                  variant="outline"
                >
                  Create Your First Scenario
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredScenarios.map((scenario) => (
                  <Card key={scenario.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {scenario.title}
                            {scenario.is_company_generated && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                Company
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-2 line-clamp-2">
                            {scenario.prompt}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePlayScenario(scenario)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditScenario(scenario)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicateScenario(scenario)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {!scenario.is_company_generated && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteScenario(scenario.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(scenario.created_at), 'MMM d, yyyy')}
                        </div>
                        {scenario.prospect_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {scenario.prospect_name}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assigned-scenarios" className="p-6">
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No assigned scenarios</p>
                <p className="text-sm text-slate-400 mt-2">
                  Scenarios assigned to you will appear here
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredAssignments.map((assignment) => (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {assignment.scenario?.title || 'Untitled Scenario'}
                            {getStatusBadge(assignment.status, assignment.deadline)}
                          </CardTitle>
                          <CardDescription className="mt-2 line-clamp-2">
                            {assignment.scenario?.prompt}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {assignment.status !== 'completed' && (
                            <Button
                              size="sm"
                              onClick={() => handlePlayScenario(assignment.scenario)}
                            >
                              <Play className="mr-1 h-4 w-4" />
                              Start
                            </Button>
                          )}
                          {assignment.status === 'not_started' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateAssignmentStatus(assignment.id, 'in_progress')}
                            >
                              Mark In Progress
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Assigned by {assignment.assigner?.name || 'Manager'}
                          </div>
                          {assignment.deadline && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due {format(new Date(assignment.deadline), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                        {assignment.result && (
                          <Badge variant={assignment.result === 'pass' ? 'default' : 'destructive'}>
                            {assignment.result === 'pass' ? 'Passed' : 'Failed'}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}