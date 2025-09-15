'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
import { EnhancedScoring } from '@/lib/types'
import { ReviewModal } from '@/components/ui/review-modal'
import { authenticatedGet } from '@/lib/api-client'
import { useLoadingManager } from '@/lib/loading-manager'

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
  const loadingManager = useLoadingManager()
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
  const [userRole, setUserRole] = useState<'user' | 'manager' | 'admin'>('user')
  const [viewScope, setViewScope] = useState<'my' | 'all'>('my')
  const [selectedRep, setSelectedRep] = useState<string>('')
  const [reps, setReps] = useState<Array<{id: string, name: string, email: string}>>([])
  const [selectedSimulations, setSelectedSimulations] = useState<string[]>([])
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  // Fetch user role and simulations
  useEffect(() => {
    if (!user?.id) return
    
    const fetchData = async () => {
      await loadingManager.withLoading('simulations-data', async () => {
        setLoading(true)
        
        try {
        // Get the user profile with role
        const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
        const profileData = await profileResponse.json();
        
        if (!profileData.success) {
          console.error('Failed to get user profile:', profileData.error);
          return;
        }

        const actualUserId = profileData.userProfile.id;
        const role = profileData.userProfile.role || 'user';
        setUserRole(role);
        
        // Set default view scope based on role
        if (role === 'manager' || role === 'admin') {
          setViewScope('all');
          
          // Fetch list of reps for filtering
          const repsResponse = await fetch('/api/users?role=user');
          if (repsResponse.ok) {
            const repsData = await repsResponse.json();
            setReps(repsData.users || []);
          }
        } else {
          setViewScope('my');
        }
        
        // Fetch simulations based on scope
        const scope = (role === 'manager' || role === 'admin') ? 'all' : 'my';
        const response = await fetch(`/api/calls?scope=${scope}&userId=${actualUserId}`)
        if (response.ok) {
          const data = await response.json()
          setSimulations(data.calls || [])
        }
        } catch (error) {
          console.error('Error fetching data:', error)
        } finally {
          setLoading(false)
        }
      }); // Close loading manager wrapper
    }
    
    fetchData()
  }, [user])

  // Refetch simulations when filters change
  const refetchSimulations = async () => {
    if (!user?.id) return;
    
    try {
      await loadingManager.withLoading('refetch-simulations', async () => {
        setLoading(true);
        
        const profileResponse = await authenticatedGet(`/api/user-profile?authUserId=${user.id}`);
        const profileData = await profileResponse.json();
        const actualUserId = profileData.userProfile.id;
        
        let url = `/api/calls?scope=${viewScope}&userId=${actualUserId}`;
        if (selectedRep && viewScope === 'all') {
          url += `&repId=${selectedRep}`;
        }
        
        const response = await authenticatedGet(url);
        if (response.ok) {
          const data = await response.json();
          setSimulations(data.calls || []);
        }
      });
    } catch (error) {
      console.error('Error refetching simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewScope || selectedRep) {
      refetchSimulations();
    }
  }, [viewScope, selectedRep])

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

  const handleSelectSimulation = (simulationId: string, checked: boolean) => {
    if (checked) {
      setSelectedSimulations(prev => [...prev, simulationId])
    } else {
      setSelectedSimulations(prev => prev.filter(id => id !== simulationId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSimulations(filteredSimulations.map(sim => sim.id))
    } else {
      setSelectedSimulations([])
    }
  }

  const handleBatchDelete = () => {
    if (selectedSimulations.length === 0) return
    setBatchDeleteDialogOpen(true)
  }

  const handleBatchDeleteConfirm = async () => {
    setIsBatchDeleting(true)
    try {
      // Delete all selected simulations in parallel
      const deletePromises = selectedSimulations.map(id =>
        fetch(`/api/calls/${id}`, { method: 'DELETE' })
      )
      
      const results = await Promise.all(deletePromises)
      const successfulDeletes = results.filter(response => response.ok)
      
      if (successfulDeletes.length === selectedSimulations.length) {
        // Remove all successfully deleted simulations from local state
        setSimulations(prev => prev.filter(sim => !selectedSimulations.includes(sim.id)))
        setSelectedSimulations([])
        setBatchDeleteDialogOpen(false)
      } else {
        console.error('Some deletions failed')
        // Optionally refresh the list to get current state
        refetchSimulations()
      }
    } catch (error) {
      console.error('Error batch deleting simulations:', error)
    } finally {
      setIsBatchDeleting(false)
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
                placeholder="Search simulations..."
              />
            </div>
          
          <div className="flex items-center space-x-3">
            <Select value={filterScore} onValueChange={setFilterScore}>
              <SelectTrigger className="w-full sm:w-48 rounded-full border-slate-200 px-4 py-2 focus:ring-primary bg-slate-50 hover:bg-slate-100">
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
              <SelectTrigger className="w-full sm:w-48 rounded-full border-slate-200 px-4 py-2 focus:ring-primary bg-slate-50 hover:bg-slate-100">
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

      {/* Select All Control */}
      {filteredSimulations.length > 0 && selectedSimulations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                id="select-all"
                checked={selectedSimulations.length === filteredSimulations.length && filteredSimulations.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium text-slate-700 cursor-pointer">
                Select all {filteredSimulations.length} simulation{filteredSimulations.length !== 1 ? 's' : ''}
              </label>
            </div>
            {selectedSimulations.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSimulations([])}
                  className="text-slate-600 border-slate-300 hover:bg-slate-50"
                >
                  Clear ({selectedSimulations.length})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Simulations Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {filteredSimulations.length === 0 ? (
          <div className="col-span-full">
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
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    <Play className="mr-2 h-4 w-4" />
                    Start New Simulation
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          filteredSimulations.map((simulation, index) => (
            <motion.div
              key={simulation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <div 
                className="relative bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5 p-6"
              >
                {/* Checkbox */}
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox
                    checked={selectedSimulations.includes(simulation.id)}
                    onCheckedChange={(checked) => handleSelectSimulation(simulation.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                <div 
                  className="cursor-pointer pl-8"
                  onClick={() => handleSimulationClick(simulation.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 truncate mb-2">
                        {simulation.scenario_name}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(simulation.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(simulation.duration)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
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
                </div>
                
                <div className="space-y-4">
                  {/* Score Display */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-center">
                        <div className="text-3xl font-semibold text-slate-900 mb-1">
                          {simulation.enhanced_scoring?.overallScore || simulation.score}
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Score</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        (simulation.enhanced_scoring?.overallScore || simulation.score) >= 90 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : (simulation.enhanced_scoring?.overallScore || simulation.score) >= 80 
                          ? 'bg-primary/10 text-primary' 
                          : (simulation.enhanced_scoring?.overallScore || simulation.score) >= 70 
                          ? 'bg-amber-50 text-amber-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {(simulation.enhanced_scoring?.overallScore || simulation.score) >= 90 
                          ? 'Excellent' 
                          : (simulation.enhanced_scoring?.overallScore || simulation.score) >= 80 
                          ? 'Good' 
                          : (simulation.enhanced_scoring?.overallScore || simulation.score) >= 70 
                          ? 'Fair' 
                          : 'Needs Work'}
                      </span>
                      {simulation.audio_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${simulation.enhanced_scoring?.overallScore || simulation.score}%`,
                        backgroundColor: (simulation.enhanced_scoring?.overallScore || simulation.score) >= 90 
                          ? '#10b981' 
                          : (simulation.enhanced_scoring?.overallScore || simulation.score) >= 80
                          ? '#048998'
                          : (simulation.enhanced_scoring?.overallScore || simulation.score) >= 70 
                          ? '#f59e0b'
                          : '#ef4444'
                      }}
                    />
                  </div>

                  {/* Additional metrics if available */}
                  {(simulation.talk_ratio || simulation.objections_handled !== undefined || simulation.cta_used !== undefined) && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        {simulation.talk_ratio && (
                          <div className="flex items-center space-x-1">
                            <span>Talk Ratio:</span>
                            <span className="font-medium">{Math.round(simulation.talk_ratio)}%</span>
                          </div>
                        )}
                        {simulation.objections_handled !== undefined && (
                          <div className="flex items-center space-x-1">
                            <span>Objections:</span>
                            <span className="font-medium">{simulation.objections_handled}</span>
                          </div>
                        )}
                        {simulation.cta_used !== undefined && (
                          <div className={`flex items-center space-x-1 ${simulation.cta_used ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <span>CTA:</span>
                            <span className="font-medium">{simulation.cta_used ? 'Yes' : 'No'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </div>
            </motion.div>
          ))
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
            <AlertDialogTitle>Delete Multiple Simulations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedSimulations.length} simulation{selectedSimulations.length !== 1 ? 's' : ''}? 
              This action cannot be undone and will permanently remove the selected simulations and their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBatchDeleteConfirm}
              disabled={isBatchDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isBatchDeleting ? 'Deleting...' : `Delete ${selectedSimulations.length} Simulation${selectedSimulations.length !== 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
