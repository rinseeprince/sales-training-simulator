'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Play, 
  Clock, 
 
  Search, 
  Filter,
  Phone,
  Target,
  ArrowLeft,
  Trash2,
  MoreVertical,
  X
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
import { EnhancedScoring } from '@/lib/types'
import { ReviewModal } from '@/components/ui/review-modal'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'

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
  enhanced_scoring?: EnhancedScoring
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
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [selectedSimulations, setSelectedSimulations] = useState<Set<string>>(new Set())
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)
  const { toast } = useToast()

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

  const getScoreBadge = (simulation: Simulation) => {
    const score = simulation.enhanced_scoring?.overallScore || simulation.score;
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>
    if (score >= 80) return <Badge className="bg-primary">Good</Badge>
    if (score >= 70) return <Badge className="bg-yellow-500">Fair</Badge>
    return <Badge variant="destructive">Needs Work</Badge>
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleSimulationClick = (simulationId: string) => {
    setSelectedCallId(simulationId)
    setReviewModalOpen(true)
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
      console.log('Deleting individual simulation:', simulationToDelete.id)
      
      const response = await fetch(`/api/calls/${simulationToDelete.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Remove from local state
        setSimulations(prev => prev.filter(sim => sim.id !== simulationToDelete.id))
        setDeleteDialogOpen(false)
        setSimulationToDelete(null)
        
        toast({
          title: "Success",
          description: "Simulation deleted successfully",
        })
      } else {
        const errorText = await response.text()
        console.error('Failed to delete simulation:', response.status, errorText)
        toast({
          title: "Error",
          description: `Failed to delete simulation: ${response.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting simulation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete simulation",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectSimulation = (simulationId: string, checked: boolean) => {
    const newSelected = new Set(selectedSimulations)
    if (checked) {
      newSelected.add(simulationId)
    } else {
      newSelected.delete(simulationId)
    }
    setSelectedSimulations(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSimulations(new Set(filteredSimulations.map(s => s.id)))
    } else {
      setSelectedSimulations(new Set())
    }
  }


  const handleBatchDeleteClick = () => {
    setBatchDeleteDialogOpen(true)
  }

  const handleBatchDeleteConfirm = async () => {
    try {
      setIsBatchDeleting(true)
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get the actual user ID from the user profile
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`)
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile')
      }

      const actualUserId = profileData.userProfile.id
      const callIds = Array.from(selectedSimulations)
      console.log('Attempting to delete simulations:', callIds, 'for user:', actualUserId)
      
      const response = await fetch('/api/calls/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callIds: callIds,
          userId: actualUserId
        }),
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`Failed to delete simulations: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      console.log('Delete successful:', result)
      
      // Remove from local state - only remove the ones that were actually deleted
      const deletedIds = result.deletedIds || callIds
      setSimulations(prev => prev.filter(sim => !deletedIds.includes(sim.id)))
      
      toast({
        title: "Success",
        description: `${result.deletedCount || selectedSimulations.size} simulation${(result.deletedCount || selectedSimulations.size) === 1 ? '' : 's'} deleted successfully`,
      })
      
      setBatchDeleteDialogOpen(false)
      setSelectedSimulations(new Set())
    } catch (error) {
      console.error('Error deleting simulations:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete simulations",
        variant: "destructive",
      })
    } finally {
      setIsBatchDeleting(false)
    }
  }

  const clearSelection = () => {
    setSelectedSimulations(new Set())
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
      {/* Compressed Hero Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] px-6 py-4 h-20"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">All Simulations</h1>
          <p className="text-sm text-slate-500">
            Review and analyze your training sessions
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-slate-900">{simulations.length}</div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Total Simulations</div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search simulations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 rounded-lg border-slate-200 focus:ring-primary"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={filterScore} onValueChange={setFilterScore}>
              <SelectTrigger className="w-full sm:w-48 rounded-lg border-slate-200 px-4 py-3 focus:ring-primary">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span>Excellent (90+)</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Good (70-89)</span>
                  </div>
                </SelectItem>
                <SelectItem value="low">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Needs Work (&lt;70)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48 rounded-lg border-slate-200 px-4 py-3 focus:ring-primary">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date (Newest)</SelectItem>
                <SelectItem value="score">Score (Highest)</SelectItem>
                <SelectItem value="duration">Duration (Longest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Bulk Actions Bar */}
      {selectedSimulations.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-900">
              {selectedSimulations.size} simulation{selectedSimulations.size === 1 ? '' : 's'} selected
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSelection}
              className="text-blue-600 hover:text-blue-700 h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBatchDeleteClick}
            className="h-8"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Selected
          </Button>
        </motion.div>
      )}

      {/* Simulations Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {filteredSimulations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Phone className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No simulations found</h3>
              <p className="text-slate-500 text-center mb-6 max-w-md">
                {searchTerm || filterScore !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start your first simulation to see it here'
                }
              </p>
              <Link href="/scenario-builder">
                <Button className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium">
                  <Play className="mr-2 h-4 w-4" />
                  Start New Simulation
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredSimulations.length > 0 && selectedSimulations.size === filteredSimulations.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all simulations"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Scenario</TableHead>
                  <TableHead className="font-semibold">Score</TableHead>
                  <TableHead className="font-semibold">Duration</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSimulations.map((simulation) => (
                  <TableRow key={simulation.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedSimulations.has(simulation.id)}
                        onCheckedChange={(checked) => handleSelectSimulation(simulation.id, checked as boolean)}
                        aria-label={`Select ${simulation.scenario_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold text-slate-900">{simulation.scenario_name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          {simulation.talk_ratio && (
                            <span>Talk: {Math.round(simulation.talk_ratio)}%</span>
                          )}
                          {simulation.objections_handled !== undefined && (
                            <>
                              <span>•</span>
                              <span>Objections: {simulation.objections_handled}</span>
                            </>
                          )}
                          {simulation.cta_used !== undefined && (
                            <>
                              <span>•</span>
                              <span className={simulation.cta_used ? 'text-emerald-600' : 'text-amber-600'}>
                                CTA: {simulation.cta_used ? 'Yes' : 'No'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">
                          {simulation.enhanced_scoring?.overallScore || simulation.score}
                        </span>
                        <Badge 
                          variant={(simulation.enhanced_scoring?.overallScore || simulation.score) >= 90 ? "default" :
                                  (simulation.enhanced_scoring?.overallScore || simulation.score) >= 80 ? "secondary" :
                                  (simulation.enhanced_scoring?.overallScore || simulation.score) >= 70 ? "outline" : "destructive"}
                        >
                          {(simulation.enhanced_scoring?.overallScore || simulation.score) >= 90 
                            ? 'Excellent' 
                            : (simulation.enhanced_scoring?.overallScore || simulation.score) >= 80 
                            ? 'Good' 
                            : (simulation.enhanced_scoring?.overallScore || simulation.score) >= 70 
                            ? 'Fair' 
                            : 'Needs Work'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          {formatDuration(simulation.duration)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {new Date(simulation.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSimulationClick(simulation.id)}
                          className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 rounded-xl font-medium"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => handleDeleteClick(e, simulation)}
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
      </motion.div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false)
          setSelectedCallId(null)
        }}
        callId={selectedCallId}
        title={selectedCallId ? simulations.find(s => s.id === selectedCallId)?.scenario_name : undefined}
      />

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

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Simulations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedSimulations.size} simulation{selectedSimulations.size === 1 ? '' : 's'}? 
              This action cannot be undone and will permanently remove all selected simulations and their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDeleteConfirm}
              disabled={isBatchDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isBatchDeleting ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
