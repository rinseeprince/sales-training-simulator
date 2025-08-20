'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Play, 
  Clock, 
  CheckCircle, 
  Trophy, 
  Search, 
  Filter, 
  Calendar,
  Phone,
  Target,
  ArrowLeft,
  Trash2,
  MoreVertical
} from 'lucide-react'
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
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Simulation {
  id: string
  scenario_name: string
  score: number
  duration: number
  created_at: string
  audio_url?: string
  talk_ratio?: number
  objections_handled?: number
  cta_used?: boolean
  sentiment?: string
}

export function Simulations() {
  const { user } = useSupabaseAuth()
  const router = useRouter()
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterScore, setFilterScore] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [simulationToDelete, setSimulationToDelete] = useState<Simulation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch simulations
  useEffect(() => {
    const fetchSimulations = async () => {
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
        
        const response = await fetch(`/api/calls?userId=${actualUserId}`)
        if (response.ok) {
          const data = await response.json()
          setSimulations(data.calls || [])
        }
      } catch (error) {
        console.error('Error fetching simulations:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSimulations()
  }, [user])

  // Filter and sort simulations
  const filteredSimulations = simulations
    .filter(sim => {
      const matchesSearch = sim.scenario_name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesScore = filterScore === 'all' || 
        (filterScore === 'high' && sim.score >= 90) ||
        (filterScore === 'medium' && sim.score >= 70 && sim.score < 90) ||
        (filterScore === 'low' && sim.score < 70)
      
      return matchesSearch && matchesScore
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'score':
          return b.score - a.score
        case 'duration':
          return b.duration - a.duration
        default:
          return 0
      }
    })

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>
    if (score >= 80) return <Badge className="bg-teal-500">Good</Badge>
    if (score >= 70) return <Badge className="bg-yellow-500">Fair</Badge>
    return <Badge variant="destructive">Needs Work</Badge>
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleSimulationClick = (simulationId: string) => {
    router.push(`/review?callId=${simulationId}`)
  }

  const handleDeleteClick = (e: React.MouseEvent, simulation: Simulation) => {
    e.stopPropagation() // Prevent card click
    setSimulationToDelete(simulation)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!simulationToDelete) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/calls/${simulationToDelete.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Remove from local state
        setSimulations(prev => prev.filter(sim => sim.id !== simulationToDelete.id))
        setDeleteDialogOpen(false)
        setSimulationToDelete(null)
      } else {
        console.error('Failed to delete simulation')
      }
    } catch (error) {
      console.error('Error deleting simulation:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center h-64">
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
            <h1 className="text-3xl font-bold tracking-tight">All Simulations</h1>
            <p className="text-muted-foreground mt-2">
              Review and analyze your training sessions
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{simulations.length}</div>
            <div className="text-sm text-muted-foreground">Total Simulations</div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search simulations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterScore} onValueChange={setFilterScore}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="high">High (90+)</SelectItem>
            <SelectItem value="medium">Medium (70-89)</SelectItem>
            <SelectItem value="low">Low (&lt;70)</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date (Newest)</SelectItem>
            <SelectItem value="score">Score (Highest)</SelectItem>
            <SelectItem value="duration">Duration (Longest)</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Simulations Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {filteredSimulations.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Phone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No simulations found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterScore !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start your first simulation to see it here'
              }
            </p>
            <Link href="/scenario-builder">
              <Button>
                <Play className="mr-2 h-4 w-4" />
                Start New Simulation
              </Button>
            </Link>
          </div>
        ) : (
          filteredSimulations.map((simulation, index) => (
            <motion.div
              key={simulation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                onClick={() => handleSimulationClick(simulation.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">
                        {simulation.scenario_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(simulation.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        {getScoreBadge(simulation.score)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={(e) => handleDeleteClick(e, simulation)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {simulation.audio_url && (
                        <Badge variant="outline" className="text-xs">
                          <Play className="mr-1 h-3 w-3" />
                          Audio
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Score and Duration */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">{simulation.score}/100</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDuration(simulation.duration)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${simulation.score}%` }}
                    />
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Talk Ratio</div>
                      <div className="font-medium">
                        {simulation.talk_ratio ? `${simulation.talk_ratio}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Objections</div>
                      <div className="font-medium">
                        {simulation.objections_handled || 0}
                      </div>
                    </div>
                  </div>

                  {/* CTA Status */}
                  {simulation.cta_used !== undefined && (
                    <div className="flex items-center space-x-2">
                      {simulation.cta_used ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-sm">
                        {simulation.cta_used ? 'CTA Used' : 'No CTA'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Simulation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{simulationToDelete?.scenario_name}"? 
              This action cannot be undone and will permanently remove the simulation and its data.
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
