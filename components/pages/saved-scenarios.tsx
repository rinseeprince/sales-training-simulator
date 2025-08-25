'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, Search, Filter, Calendar, Tag, Trash2, Edit, BookOpen, ArrowLeft } from 'lucide-react'
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
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'

interface SavedScenario {
  id: string
  title: string
  prompt: string
  duration?: string
  voice?: string
  created_at: string
  updated_at: string
}

export function SavedScenarios() {
  const router = useRouter()
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scenarioToDelete, setScenarioToDelete] = useState<SavedScenario | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load saved scenarios
  useEffect(() => {
    loadScenarios()
  }, [user])

  const loadScenarios = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Get the correct user ID from simple_users table
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile: ' + profileData.error);
      }

      const actualUserId = profileData.userProfile.id;
      
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
      setLoading(false)
    }
  }

  const handleRunScenario = (scenario: SavedScenario) => {
    // Convert scenario to simulation format
    const simulationData = {
      title: scenario.title,
      prompt: scenario.prompt,
      duration: scenario.duration || '5 minutes',
      voice: scenario.voice || 'professional-male',
      saveReuse: false,
      timestamp: Date.now()
    }

    // Save to localStorage and navigate to simulation
    localStorage.setItem('currentScenario', JSON.stringify(simulationData))
    router.push('/simulation')
  }

  const handleEditScenario = (scenario: SavedScenario) => {
    // Convert scenario to scenario builder format
    const builderData = {
      title: scenario.title,
      prompt: scenario.prompt,
      duration: scenario.duration || '',
      voice: scenario.voice || '',
      saveReuse: true,
      scenarioId: scenario.id // Include ID for editing
    }

    // Save to localStorage and navigate to scenario builder
    localStorage.setItem('editScenario', JSON.stringify(builderData))
    router.push('/scenario-builder')
  }

  const handleDeleteClick = (scenario: SavedScenario) => {
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

      if (!response.ok) {
        throw new Error('Failed to delete scenario')
      }

      toast({
        title: "Success",
        description: "Scenario deleted successfully",
      })

      setDeleteDialogOpen(false)
      setScenarioToDelete(null)
      // Reload scenarios
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

  // Removed difficulty functions - not used in prompt-only system

  // Filter scenarios
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    
    // For now, show all scenarios since we don't have difficulty/industry in prompt-only system
    return matchesSearch
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved Scenarios</h1>
            <p className="text-muted-foreground mt-2">
              Your reusable training templates for sales enablement and practice
            </p>
          </div>
          <Button onClick={() => router.push('/scenario-builder')}>
            <BookOpen className="mr-2 h-4 w-4" />
            Create New Scenario
          </Button>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search scenarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Scenarios Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {filteredScenarios.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No scenarios found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {scenarios.length === 0 
                    ? "You haven't saved any scenarios yet. Create your first scenario to get started!"
                    : "No scenarios match your current filters. Try adjusting your search criteria."
                  }
                </p>
                <Button onClick={() => router.push('/scenario-builder')}>
                  Create Your First Scenario
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredScenarios.map((scenario, index) => (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{scenario.title}</CardTitle>
                                        <div className="flex items-center space-x-2">
                    {scenario.duration && (
                      <Badge variant="outline">{scenario.duration}</Badge>
                    )}
                    {scenario.voice && (
                      <Badge variant="outline">{scenario.voice}</Badge>
                    )}
                  </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground" style={{display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                    {scenario.prompt}
                  </p>
                  
                  {/* Tags removed - prompt-only system doesn't use tags */}

                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="mr-1 h-3 w-3" />
                    Created {formatDate(scenario.created_at)}
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => handleRunScenario(scenario)}
                      className="flex-1"
                      size="sm"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Run Scenario
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditScenario(scenario)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(scenario)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {filteredScenarios.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-sm text-muted-foreground"
        >
          Showing {filteredScenarios.length} of {scenarios.length} scenarios
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{scenarioToDelete?.title}"? This action cannot be undone and will permanently remove the scenario and its data.
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
    </div>
  )
}