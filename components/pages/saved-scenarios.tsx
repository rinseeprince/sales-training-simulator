'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar, 
  Clock, 
  User, 
  Edit, 
  Trash2, 
  Play, 
  Plus, 
  Search, 
  Filter,
  CheckCircle,
  AlertCircle,
  Target,
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
import { useScenarioAssignments, useRefreshAssignments, type ScenarioAssignment } from '@/hooks/use-scenario-assignments'
import { useScenarios, type Scenario } from '@/hooks/use-scenarios'
import { useFocusRefresh } from '@/hooks/use-focus-refresh'

export function SavedScenarios() {
  const { user } = useSupabaseAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  // Local state
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

  // Use React Query hooks
  const { data: scenarios = [], isLoading: scenariosLoading, refetch: refetchScenarios } = useScenarios()
  const { data: assignments = [], isLoading: assignmentsLoading } = useScenarioAssignments('my')
  const refreshAssignments = useRefreshAssignments()

  // Use focus refresh hook
  useFocusRefresh('saved-scenarios-assignments', async () => {
    if (!user?.id) return
    console.log('🎯 SavedScenarios: Refreshing assignments on focus...')
    await refreshAssignments('my')
  }, true) // Always enable, but check user inside callback

  // Handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'assigned') {
      setActiveTab('assigned-scenarios')
    }
  }, [searchParams])

  // Load domain users for admin/manager filtering
  const loadDomainUsers = useCallback(async () => {
    if (!user?.email || !isAdminOrManager) return
    
    setLoadingUsers(true)
    try {
      const response = await authenticatedGet(`/api/users/search?currentUserEmail=${user.email}&currentUserRole=${user.role}`)
      if (response.ok) {
        const data = await response.json()
        setDomainUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to load domain users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }, [user?.email, user?.role, isAdminOrManager])

  useEffect(() => {
    if (isAdminOrManager) {
      loadDomainUsers()
    }
  }, [isAdminOrManager, loadDomainUsers])

  // Handle scenario play
  const handlePlayScenario = (scenario: Scenario | undefined) => {
    if (!scenario) return
    
    const params = new URLSearchParams({
      prompt: scenario.prompt,
      prospectName: scenario.prospect_name || 'Prospect',
      voice: scenario.voice || 'rachel'
    })
    
    router.push(`/simulation?${params.toString()}`)
  }

  // Handle assignment play
  const handlePlayAssignment = (assignment: ScenarioAssignment) => {
    if (!assignment.scenario) return
    
    const params = new URLSearchParams({
      prompt: assignment.scenario.prompt,
      prospectName: assignment.scenario.prospect_name || 'Prospect',
      voice: assignment.scenario.voice || 'rachel',
      assignmentId: assignment.id
    })
    
    router.push(`/simulation?${params.toString()}`)
  }

  // Delete scenario
  const handleDeleteScenario = async () => {
    if (!scenarioToDelete) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/scenarios/${scenarioToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.id}` // This should use proper auth token
        }
      })
      
      if (response.ok) {
        toast({
          title: "Scenario deleted",
          description: "The scenario has been successfully deleted."
        })
        refetchScenarios()
      } else {
        throw new Error('Failed to delete scenario')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete scenario. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setScenarioToDelete(null)
    }
  }

  // Filter functions
  const filteredScenarios = scenarios.filter((scenario: Scenario) => 
    scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scenario.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAssignments = assignments.filter((assignment: ScenarioAssignment) => {
    const matchesSearch = assignment.scenario?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.scenario?.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  const loading = scenariosLoading || assignmentsLoading

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Scenarios</h1>
          <p className="text-muted-foreground mt-1">Manage your training scenarios and assignments</p>
        </div>
        <Button onClick={() => router.push('/scenario-builder')}>
          <Plus className="mr-2 h-4 w-4" />
          New Scenario
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {activeTab === 'assigned-scenarios' && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-scenarios">My Scenarios ({filteredScenarios.length})</TabsTrigger>
          <TabsTrigger value="assigned-scenarios">Assignments ({filteredAssignments.length})</TabsTrigger>
        </TabsList>

        {/* My Scenarios Tab */}
        <TabsContent value="my-scenarios" className="space-y-6">
          {filteredScenarios.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No scenarios found</h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'Create your first scenario to get started'}
                </p>
                <Button onClick={() => router.push('/scenario-builder')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Scenario
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredScenarios.map((scenario: Scenario) => (
                <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{scenario.title}</CardTitle>
                        <CardDescription className="line-clamp-3">
                          {scenario.prompt}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Button
                          size="sm"
                          onClick={() => handlePlayScenario(scenario)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Play
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedScenario(scenario)
                            setEditModalOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdminOrManager && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedScenario(scenario)
                              setAssignmentModalOpen(true)
                            }}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setScenarioToDelete(scenario)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Assigned Scenarios Tab */}
        <TabsContent value="assigned-scenarios" className="space-y-6">
          {filteredAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No assignments found</h3>
                <p className="text-gray-500 text-center">
                  {searchQuery ? 'Try adjusting your search terms' : 'You have no training assignments at the moment'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map((assignment: ScenarioAssignment) => (
                <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {assignment.scenario?.title || 'Untitled Scenario'}
                        </CardTitle>
                        <CardDescription className="line-clamp-3">
                          {assignment.scenario?.prompt || 'No description available'}
                        </CardDescription>
                      </div>
                      <Badge 
                        className={
                          assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          assignment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }
                      >
                        {assignment.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Assigned by {assignment.assigner?.name || 'Manager'}</span>
                        </div>
                        {assignment.deadline && (
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {format(new Date(assignment.deadline), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handlePlayAssignment(assignment)}
                        disabled={assignment.status === 'completed'}
                      >
                        {assignment.status === 'completed' ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Completed
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Start Training
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => {
          setAssignmentModalOpen(false)
          setSelectedScenario(null)
        }}
        scenario={selectedScenario}
      />

             <EditScenarioModal
         isOpen={editModalOpen}
         onClose={() => {
           setEditModalOpen(false)
           setSelectedScenario(null)
         }}
         scenario={selectedScenario}
         onScenarioUpdated={() => {
           refetchScenarios()
           setEditModalOpen(false)
           setSelectedScenario(null)
         }}
       />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{scenarioToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScenario}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}