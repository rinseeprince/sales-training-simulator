'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, Search, Filter, Calendar, Tag, Trash2, Edit, BookOpen, ArrowLeft, Mic } from 'lucide-react'
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
  prospect_name?: string
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

  const handleRunScenario = async (scenario: SavedScenario) => {
    // Check simulation limit before proceeding
    if (user) {
      try {
        // Get the correct user ID from simple_users table
        const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
        const profileData = await profileResponse.json();
        
        if (!profileData.success) {
          console.error('Failed to get user profile:', profileData.error);
          // Continue anyway if profile check fails - will be enforced when recording starts
        } else {
          const actualUserId = profileData.userProfile.id;
          
          const response = await fetch(`/api/check-simulation-limit?userId=${actualUserId}`)
          const data = await response.json()
          
          if (!data.canSimulate) {
            toast({
              title: "Simulation Limit Reached",
              description: data.message || "You've reached your free simulation limit. Please upgrade to continue.",
              variant: "destructive",
              action: (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => router.push('/pricing')}
                >
                  Upgrade
                </Button>
              )
            })
            return
          }
          
          // Show remaining simulations for free users (informational only)
          if (data.remaining && data.remaining > 0 && data.remaining <= 10) {
            toast({
              title: "Simulations Remaining",
              description: `You have ${data.remaining} free simulation${data.remaining === 1 ? '' : 's'} left. Count will be used when you start recording.`,
            })
          }
        }
      } catch (error) {
        console.error('Failed to check simulation limit:', error)
        // Continue anyway if check fails - will be enforced when recording starts
      }
    }

    // Convert scenario to simulation format
    console.log('🔍 Running saved scenario:', scenario);
    const simulationData = {
      title: scenario.title,
      prompt: scenario.prompt,
      prospectName: scenario.prospect_name || '', // Include saved prospect name
      duration: scenario.duration || '5 minutes',
      voice: scenario.voice || 'professional-male',
      saveReuse: false,
      timestamp: Date.now()
    }
    console.log('🔍 Simulation data for localStorage:', simulationData);

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
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 mb-1">Saved Scenarios</h1>
            <p className="text-sm text-slate-500">Your reusable training templates for sales practice</p>
          </div>
          <Button 
            onClick={() => router.push('/scenario-builder')} 
            className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm rounded-xl px-6 py-2.5 font-medium"
          >
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
        className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
            />
          </div>
        </div>
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No scenarios found</h3>
                <p className="text-slate-500 text-center mb-6 max-w-md">
                  {scenarios.length === 0 
                    ? "You haven't saved any scenarios yet. Create your first scenario to get started!"
                    : "No scenarios match your current filters. Try adjusting your search criteria."
                  }
                </p>
                <Button onClick={() => router.push('/scenario-builder')} className="bg-primary hover:bg-primary/90 text-white">
                  Create Your First Scenario
                </Button>
              </div>
            </div>
          </div>
        ) : (
          filteredScenarios.map((scenario, index) => (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <div className="h-full bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 truncate mb-2">{scenario.title}</h3>
                    <div className="flex items-center flex-wrap gap-2">
                      {scenario.voice && (
                        <Badge className="rounded-full px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium">
                          <Mic className="mr-1 h-3 w-3" />
                          {scenario.voice.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      )}
                      <Badge className="rounded-full px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium">
                        Template
                      </Badge>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 ml-4">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {scenario.prompt}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center text-xs text-slate-500">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(scenario.created_at)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {scenario.prompt.length} chars
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button 
                      onClick={() => handleRunScenario(scenario)}
                      className="flex-1 bg-white hover:bg-slate-50 text-primary border border-primary/20 rounded-xl shadow-sm px-4 py-2 font-medium"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Run
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditScenario(scenario)}
                      className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(scenario)}
                      className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-red-600 shadow-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
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