'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { 
  Play, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Filter
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { supabaseClient as supabase } from '@/lib/supabase-auth'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { AssignmentModal } from '@/components/ui/assignment-modal'

interface SavedScenario {
  id: string
  title: string
  prompt: string
  prospect_name?: string
  duration?: string
  voice?: string
  created_at: string
  updated_at: string
  created_by?: string
  is_company_generated?: boolean
}

interface ScenarioAssignment {
  id: string
  scenario_id: string
  scenario?: SavedScenario
  assigned_by: string
  assigned_to_user: string
  deadline?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
  created_at: string
  updated_at: string
  call_id?: string
  assigner?: {
    name: string
    email: string
  }
}

export function SavedScenarios() {
  const router = useRouter()
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [assignments, setAssignments] = useState<ScenarioAssignment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('my-scenarios')
  const [loadingScenarios, setLoadingScenarios] = useState(true)
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [userRole, setUserRole] = useState<string>('user')
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [scenarioToAssign, setScenarioToAssign] = useState<SavedScenario | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scenarioToDelete, setScenarioToDelete] = useState<SavedScenario | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Define load functions with useCallback to prevent recreation
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
  
  const loadScenarios = useCallback(async () => {
    if (!user) {
      return
    }
    
    try {
      setLoadingScenarios(true)
      
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`)
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile')
      }
      
      const actualUserId = profileData.userProfile.id
      
      const response = await fetch(`/api/scenarios?userId=${actualUserId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load scenarios')
      }
      
      const data = await response.json()
      setScenarios(data.scenarios || [])
    } catch (error) {
      console.error('Error loading scenarios:', error)
      toast({
        title: "Error",
        description: "Failed to load saved scenarios",
        variant: "destructive",
      })
    } finally {
      setLoadingScenarios(false)
    }
  }, [user, toast])
  
  const loadAssignments = useCallback(async () => {
    if (!user) {
      return
    }
    
    try {
      setLoadingAssignments(true)
      
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`)
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile')
      }
      
      const actualUserId = profileData.userProfile.id
      
      const response = await fetch(`/api/assignments?userId=${actualUserId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load assignments')
      }
      
      const data = await response.json()
      setAssignments(data.assignments || [])
    } catch (error) {
      console.error('Error loading assignments:', error)
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      })
    } finally {
      setLoadingAssignments(false)
    }
  }, [user, toast])
  
  // Load user role
  useEffect(() => {
    loadUserRole()
  }, [loadUserRole])
  
  // Load scenarios and assignments when component mounts or tab changes
  useEffect(() => {
    loadUserRole()
    
    if (activeTab === 'my-scenarios') {
      loadScenarios()
    } else {
      loadAssignments()
    }
    
    // Reload data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        if (activeTab === 'my-scenarios') {
          loadScenarios()
        } else {
          loadAssignments()
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeTab, user, loadUserRole, loadScenarios, loadAssignments])
  
  const handleRunScenario = (scenario: SavedScenario) => {
    // Store scenario data in localStorage
    localStorage.setItem('selectedScenario', JSON.stringify({
      title: scenario.title,
      prompt: scenario.prompt,
      prospectName: scenario.prospect_name,
      duration: scenario.duration,
      voice: scenario.voice,
      enableStreaming: true,
      timestamp: Date.now()
    }))
    
    // Navigate to scenario builder
    router.push('/scenario-builder')
  }
  
  const handleRunAssignment = (assignment: ScenarioAssignment) => {
    if (!assignment.scenario) return
    
    // Store scenario data with assignment ID
    localStorage.setItem('selectedScenario', JSON.stringify({
      title: assignment.scenario.title,
      prompt: assignment.scenario.prompt,
      prospectName: assignment.scenario.prospect_name,
      duration: assignment.scenario.duration,
      voice: assignment.scenario.voice,
      assignmentId: assignment.id,
      enableStreaming: true,
      timestamp: Date.now()
    }))
    
    // Update assignment status to in_progress if not started
    if (assignment.status === 'not_started') {
      supabase
        .from('scenario_assignments')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', assignment.id)
        .then(() => {
          // Reload assignments to reflect the change
          loadAssignments()
        })
    }
    
    // Navigate to scenario builder
    router.push('/scenario-builder')
  }
  
  const handleEditScenario = (scenario: SavedScenario) => {
    // Store scenario data for editing
    localStorage.setItem('editScenario', JSON.stringify(scenario))
    router.push('/scenario-builder')
  }
  
  const handleDeleteClick = (scenario: SavedScenario) => {
    setScenarioToDelete(scenario)
    setDeleteDialogOpen(true)
  }
  
  const handleDeleteConfirm = async () => {
    if (!scenarioToDelete) return
    
    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/scenarios/${scenarioToDelete.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete scenario')
      }
      
      toast({
        title: "Success",
        description: "Scenario deleted successfully",
      })
      
      setDeleteDialogOpen(false)
      setScenarioToDelete(null)
      loadScenarios()
    } catch (error) {
      console.error('Error deleting scenario:', error)
      toast({
        title: "Error",
        description: "Failed to delete scenario",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }
  
  const handleAssignScenario = (scenario: SavedScenario) => {
    setScenarioToAssign(scenario)
    setAssignmentModalOpen(true)
  }
  
  // Filter scenarios based on search
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })
  
  // Filter assignments based on search
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.scenario?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.scenario?.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      not_started: { label: 'Not Started', variant: 'secondary' as const, icon: Clock },
      in_progress: { label: 'In Progress', variant: 'default' as const, icon: AlertCircle },
      completed: { label: 'Completed', variant: 'outline' as const, icon: CheckCircle },
      overdue: { label: 'Overdue', variant: 'destructive' as const, icon: AlertCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }
  
  const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin'
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Saved Scenarios</h1>
          <p className="text-slate-600 mt-2">Manage your training scenarios and assignments</p>
        </div>
        <Button onClick={() => router.push('/scenario-builder')} className="rounded-xl">
          Create New Scenario
        </Button>
      </div>
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
        <Input
          type="text"
          placeholder="Search scenarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-xl border-slate-200"
        />
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="my-scenarios">My Scenarios</TabsTrigger>
          <TabsTrigger value="assigned">
            Assigned to Me
            {assignments.filter(a => a.status !== 'completed').length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {assignments.filter(a => a.status !== 'completed').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* My Scenarios Tab */}
        <TabsContent value="my-scenarios" className="space-y-4">
          {loadingScenarios ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredScenarios.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No scenarios found</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                                 <TableHeader>
                   <TableRow className="bg-slate-50">
                     <TableHead className="font-semibold">Title</TableHead>
                     <TableHead className="font-semibold">Prospect</TableHead>
                     <TableHead className="font-semibold">Created</TableHead>
                     <TableHead className="font-semibold">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {filteredScenarios.map((scenario) => (
                    <TableRow key={scenario.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold text-slate-900">{scenario.title}</p>
                          <p className="text-sm text-slate-500 line-clamp-1">{scenario.prompt}</p>
                        </div>
                      </TableCell>
                                             <TableCell>
                         <div className="flex items-center gap-1">
                           <User className="h-4 w-4 text-slate-400" />
                           <span className="text-slate-600">
                             {scenario.prospect_name || 'Default'}
                           </span>
                         </div>
                       </TableCell>
                       <TableCell className="text-slate-600">
                         {formatDate(scenario.created_at)}
                       </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRunScenario(scenario)}
                            className="rounded-lg"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Run
                          </Button>
                          {isManagerOrAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignScenario(scenario)}
                              className="rounded-lg"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditScenario(scenario)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(scenario)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        {/* Assigned to Me Tab */}
        <TabsContent value="assigned" className="space-y-4">
          {loadingAssignments ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No assigned scenarios</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Scenario</TableHead>
                    <TableHead className="font-semibold">Assigned By</TableHead>
                    <TableHead className="font-semibold">Deadline</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {assignment.scenario?.title || 'Unknown Scenario'}
                          </p>
                          <p className="text-sm text-slate-500 line-clamp-1">
                            {assignment.scenario?.prompt || ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-slate-600">
                          <p className="font-medium">{assignment.assigner?.name || 'Manager'}</p>
                          <p className="text-sm text-slate-500">{assignment.assigner?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment.deadline ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className={cn(
                              "text-slate-600",
                              new Date(assignment.deadline) < new Date() && assignment.status !== 'completed' && "text-red-600 font-medium"
                            )}>
                              {formatDate(assignment.deadline)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">No deadline</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(assignment.status)}
                      </TableCell>
                      <TableCell>
                        {assignment.status === 'completed' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (assignment.call_id) {
                                router.push(`/review?callId=${assignment.call_id}`)
                              }
                            }}
                            className="rounded-lg"
                          >
                            View Results
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleRunAssignment(assignment)}
                            className="rounded-lg"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Dialog */}
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
          scenario={scenarioToAssign}
        />
      </div>
    )
  }