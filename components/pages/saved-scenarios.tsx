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
  XCircle,
  Users
} from 'lucide-react'
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
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { authenticatedGet, authenticatedPatch } from '@/lib/api-client'
import { AssignmentModal } from '@/components/assignment/assignment-modal'
import { EditScenarioModal } from '@/components/scenario/edit-scenario-modal'

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
  score?: number
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  
  // Rep filtering state for admins/managers
  const [selectedRep, setSelectedRep] = useState<string>('')
  const [domainUsers, setDomainUsers] = useState<Array<{id: string, name: string, email: string}>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Check if user is admin or manager
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => {
    if (user) {
      loadScenarios()
      loadAssignments()
      if (isAdminOrManager) {
        loadDomainUsers()
      }
    }
  }, [user, isAdminOrManager])

  // Handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'assigned') {
      setActiveTab('assigned-scenarios')
    }
  }, [searchParams])

  // Smart refresh: Reload assignments when page gains focus or becomes visible
  useEffect(() => {
    if (!user) return

    const handlePageFocus = () => {
      console.log('📱 Saved Scenarios page gained focus - checking for assignment completion...')
      
      // Check if an assignment was just completed
      const completionFlag = localStorage.getItem('assignmentJustCompleted')
      if (completionFlag) {
        const completionTime = parseInt(completionFlag)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        
        if (completionTime > fiveMinutesAgo) {
          localStorage.removeItem('assignmentJustCompleted')
          loadAssignments()
          return
        } else {
          localStorage.removeItem('assignmentJustCompleted') // Clean up old flag
        }
      }
      
      // Regular refresh on focus
      loadAssignments()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Saved Scenarios page became visible - refreshing assignments...')
        loadAssignments()
      }
    }

    // Listen for page focus events
    window.addEventListener('focus', handlePageFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup listeners
    return () => {
      window.removeEventListener('focus', handlePageFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  // URL parameter detection: Check if returning from assignment completion
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const fromSimulation = urlParams.get('fromSimulation')
    const completedAssignment = urlParams.get('completedAssignment')
    
    if (fromSimulation === 'true' || completedAssignment) {
      loadAssignments()
      
      // Clean up URL parameters
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('fromSimulation')
      newUrl.searchParams.delete('completedAssignment')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])

  // Reload assignments when selected rep changes
  useEffect(() => {
    if (user && isAdminOrManager) {
      loadAssignments()
    }
  }, [selectedRep])

  const loadScenarios = async () => {
    try {
      // MIGRATION UPDATE: user.id is now the same as simple_users.id
      const response = await authenticatedGet(`/api/scenarios?userId=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
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
      // Build the query parameters
      let url = '/api/scenario-assignments?scope='
      if (selectedRep && isAdminOrManager) {
        url += `all&repId=${selectedRep}`
      } else {
        url += 'my'
      }
      
      console.log('🔍 Assignments API call:', { url, selectedRep, userRole: user?.role });
      
      const response = await authenticatedGet(url)
      
      if (response.ok) {
        const data = await response.json()
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

  const loadDomainUsers = async () => {
    if (!user?.email || !isAdminOrManager) return
    
    try {
      setLoadingUsers(true)
      const response = await authenticatedGet(`/api/users/search?currentUserEmail=${user.email}&currentUserRole=${user.role}`)
      
      if (response.ok) {
        const data = await response.json()
        setDomainUsers(data.users || [])
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to load domain users:', errorData)
      }
    } catch (error) {
      console.error('❌ Error loading domain users:', error)
    } finally {
      setLoadingUsers(false)
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

  const handlePlayAssignment = (assignment: ScenarioAssignment) => {
    if (!assignment.scenario) return
    
    console.log('🎮 === ASSIGNMENT PLAY CLICKED ===')
    console.log('🎮 Assignment details:', {
      assignmentId: assignment.id,
      assignmentIdType: typeof assignment.id,
      scenarioTitle: assignment.scenario.title,
      assignmentStatus: assignment.status
    })
    
    const params = new URLSearchParams({
      prompt: assignment.scenario.prompt,
      prospectName: assignment.scenario.prospect_name || 'Prospect',
      voice: assignment.scenario.voice || 'rachel',
      assignmentId: assignment.id // Pass assignment ID for tracking
    })
    
    console.log('🎮 URL parameters being passed:', {
      assignmentId: assignment.id,
      paramsString: params.toString(),
      hasAssignmentId: params.has('assignmentId'),
      assignmentIdFromParams: params.get('assignmentId')
    })
    console.log('🎮 Full navigation URL:', `/simulation?${params.toString()}`)
    
    router.push(`/simulation?${params.toString()}`)
  }

  const handleViewAssignmentResults = async (assignment: ScenarioAssignment) => {
    try {
      console.log('📊 View assignment results clicked:', assignment.id)
      
      // Find the call associated with this completed assignment
      const response = await authenticatedGet(`/api/calls?assignmentId=${assignment.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.calls && data.calls.length > 0) {
          const call = data.calls[0] // Most recent call for this assignment
          console.log('📊 Found call for assignment:', call.id)
          router.push(`/review?callId=${call.id}`)
        } else {
          console.log('📊 No calls found for assignment, showing generic message')
          toast({
            title: "No Results Found",
            description: "Could not find the completed call for this assignment.",
            variant: "destructive"
          })
        }
      } else {
        throw new Error('Failed to fetch assignment calls')
      }
    } catch (error) {
      console.error('❌ Error viewing assignment results:', error)
      toast({
        title: "Error",
        description: "Failed to load assignment results",
        variant: "destructive"
      })
    }
  }

  const handleEditScenario = (scenario: Scenario) => {
    console.log('✏️ Edit scenario clicked:', scenario.title)
    setSelectedScenario(scenario)
    setEditModalOpen(true)
  }

  const handleAssignToUsers = (scenario: Scenario) => {
    console.log('👥 Assign to users clicked:', scenario.title)
    setSelectedScenario(scenario)
    setAssignmentModalOpen(true)
  }

  const handleDeleteScenario = (scenario: Scenario) => {
    setScenarioToDelete(scenario)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!scenarioToDelete) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/scenarios/${scenarioToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Scenario deleted successfully"
        })
        setScenarios(prev => prev.filter(scenario => scenario.id !== scenarioToDelete.id))
        setDeleteDialogOpen(false)
        setScenarioToDelete(null)
      } else {
        throw new Error('Failed to delete scenario')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete scenario",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicateScenario = async (scenario: Scenario) => {
    try {
      // MIGRATION UPDATE: user.id is now the same as simple_users.id
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${scenario.title} (Copy)`,
          prompt: scenario.prompt,
          prospectName: scenario.prospect_name,
          voice: scenario.voice,
          userId: user?.id
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

  const getStatusBadge = (assignment: ScenarioAssignment) => {
    const { status, deadline, score } = assignment
    const isOverdue = deadline && new Date(deadline) < new Date() && status !== 'completed'
    
    if (isOverdue) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Overdue
      </Badge>
    }

    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="flex items-center gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" />
              Completed
            </Badge>
            {score && (
              <Badge variant="outline" className="text-xs">
                {score}%
              </Badge>
            )}
          </div>
        )
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
          <Button 
            onClick={() => router.push('/scenario-builder')} 
            className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium"
          >
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
            {activeTab === 'assigned-scenarios' && isAdminOrManager && (
              <Select value={selectedRep || "all"} onValueChange={(value) => setSelectedRep(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by rep" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reps</SelectItem>
                  {domainUsers.map((rep) => (
                    <SelectItem key={rep.id} value={rep.id}>
                      {rep.name || rep.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              {selectedRep && isAdminOrManager ? 'Team Assignments' : 'Assigned Scenarios'}
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
                  className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium mt-4"
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
                          {(user?.role === 'manager' || user?.role === 'admin') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignToUsers(scenario)}
                              title="Assign to Users"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          )}
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
                              onClick={() => handleDeleteScenario(scenario)}
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
                <p className="text-slate-500">
                  {selectedRep && isAdminOrManager ? 'No assignments for selected rep' : 'No assigned scenarios'}
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  {selectedRep && isAdminOrManager 
                    ? 'This rep has no scenario assignments' 
                    : 'Scenarios assigned to you will appear here'
                  }
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
                            {getStatusBadge(assignment)}
                          </CardTitle>
                          <CardDescription className="mt-2 line-clamp-2">
                            {assignment.scenario?.prompt}
                          </CardDescription>
                          {assignment.status === 'completed' && assignment.completed_at && (
                            <div className="mt-2 text-sm text-slate-500">
                              Completed on {format(new Date(assignment.completed_at), 'MMM dd, yyyy')}
                              {assignment.result && (
                                <span className={`ml-2 font-medium ${assignment.result === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                                  ({assignment.result === 'pass' ? 'Passed' : 'Failed'})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {/* Only show play/action buttons when viewing your own assignments */}
                          {!selectedRep && assignment.status !== 'completed' && (
                            <Button
                              size="sm"
                              onClick={() => handlePlayAssignment(assignment)}
                            >
                              <Play className="mr-1 h-4 w-4" />
                              Start
                            </Button>
                          )}
                          {assignment.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewAssignmentResults(assignment)}
                            >
                              View Results
                            </Button>
                          )}
                          {!selectedRep && assignment.status === 'not_started' && (
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{scenarioToDelete?.title}"? 
              This action cannot be undone and will permanently remove the scenario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        scenario={selectedScenario}
        onAssignmentCreated={() => {
          loadAssignments()
          setAssignmentModalOpen(false)
        }}
      />

      {/* Edit Scenario Modal */}
      <EditScenarioModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        scenario={selectedScenario}
        onScenarioUpdated={() => {
          loadScenarios()
          setEditModalOpen(false)
        }}
      />

    </div>
  )
}