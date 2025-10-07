'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSimulationLimit } from '@/hooks/use-simulation-limit'
import { PaywallModal } from '@/components/ui/paywall-modal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  User, 
  Calendar,
  MessageSquare,
  Clock,
  Building,
  Bot,
  Mic
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { supabaseClient as supabase } from '@/lib/supabase-auth'

interface SavedScenario {
  id: string
  title: string
  prompt: string
  prospect_name?: string
  duration?: string
  voice?: string
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

interface AssignmentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  assignment: ScenarioAssignment | null
  onAssignmentUpdated?: () => void
}

export function AssignmentDetailsModal({ 
  isOpen, 
  onClose, 
  assignment,
  onAssignmentUpdated 
}: AssignmentDetailsModalProps) {
  const router = useRouter()
  const { checkSimulationLimit, isChecking } = useSimulationLimit()
  const [isStarting, setIsStarting] = useState(false)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [simulationLimit, setSimulationLimit] = useState<any>(null)

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP')
  }

  const isIvyScenario = (scenario: SavedScenario) => {
    return scenario.voice === 'ivy-voice' || scenario.prospect_name === 'Ivy'
  }

  const handleStartScenario = async () => {
    if (!assignment?.scenario) return

    // Check simulation limit before proceeding
    const limitCheck = await checkSimulationLimit();
    if (limitCheck) {
      setSimulationLimit(limitCheck);
      
      // If user can't simulate, show paywall modal
      if (!limitCheck.canSimulate) {
        setIsPaywallOpen(true);
        return;
      }
      
      // Show warning if approaching limit
      if (limitCheck.remaining <= 3 && limitCheck.remaining > 0 && !limitCheck.isPaid) {
        setIsPaywallOpen(true);
        return;
      }
    }

    try {
      setIsStarting(true)

      // Update assignment status to in_progress if not started
      if (assignment.status === 'not_started') {
        const { error } = await supabase
          .from('scenario_assignments')
          .update({ 
            status: 'in_progress', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', assignment.id)

        if (error) {
          console.error('Error updating assignment status:', error)
        } else {
          // Notify parent component to refresh data
          onAssignmentUpdated?.()
        }
      }

      // Store assignment ID separately for tracking
      localStorage.setItem('currentAssignmentId', assignment.id)

      if (isIvyScenario(assignment.scenario)) {
        // For IVY scenarios, store in IVY format and navigate to IVY page
        localStorage.setItem('selectedIvyScenario', JSON.stringify({
          title: assignment.scenario.title,
          prompt: assignment.scenario.prompt,
          assignmentId: assignment.id,
          isAssignment: true,
          timestamp: Date.now()
        }))
        onClose()
        router.push('/ivy')
      } else {
        // For regular scenarios, store scenario data for simulation
        localStorage.setItem('currentScenario', JSON.stringify({
          title: assignment.scenario.title,
          prompt: assignment.scenario.prompt,
          prospectName: assignment.scenario.prospect_name,
          duration: assignment.scenario.duration,
          voice: assignment.scenario.voice,
          assignmentId: assignment.id,
          isAssignment: true, // Flag to indicate this is an assignment
          enableStreaming: true,
          timestamp: Date.now()
        }))
        onClose()
        router.push('/simulation')
      }

    } catch (error) {
      console.error('Error starting assignment:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const handlePaywallClose = () => {
    setIsPaywallOpen(false);
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      not_started: { label: 'Not Started', variant: 'secondary' as const, icon: Clock },
      in_progress: { label: 'In Progress', variant: 'default' as const, icon: Play },
      completed: { label: 'Completed', variant: 'outline' as const, icon: Play },
      overdue: { label: 'Overdue', variant: 'destructive' as const, icon: Clock }
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

  const isOverdue = assignment?.deadline && 
    new Date(assignment.deadline) < new Date() && 
    assignment.status !== 'completed'

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] z-[70]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Assignment Details
          </DialogTitle>
          <DialogDescription>
            Review your assigned training scenario and start when ready
          </DialogDescription>
        </DialogHeader>
        
        {assignment && (
          <div className="space-y-6">
            {/* Assignment Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Status:</span>
                {getStatusBadge(assignment.status)}
              </div>
              {assignment.deadline && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className={cn(
                    "text-sm",
                    isOverdue ? "text-red-600 font-medium" : "text-slate-600"
                  )}>
                    Due: {formatDate(assignment.deadline)}
                  </span>
                </div>
              )}
            </div>

            {/* Assigned By */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Assigned by</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  {assignment.assigner?.name || 'Manager'}
                </p>
                <p className="text-sm text-slate-500">
                  {assignment.assigner?.email}
                </p>
              </div>
            </div>

            {/* Scenario Details */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {assignment.scenario?.title}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-slate-600 mb-1">Scenario Description</h4>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded p-3">
                    {assignment.scenario?.prompt}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isIvyScenario(assignment.scenario) ? (
                    <>
                      <Bot className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-slate-600">
                        <span className="font-medium">Type:</span> IVY Voice Simulation
                      </span>
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-0.5">
                        Voice AI
                      </Badge>
                    </>
                  ) : assignment.scenario?.prospect_name ? (
                    <>
                      <Building className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        <span className="font-medium">Prospect:</span> {assignment.scenario.prospect_name}
                      </span>
                    </>
                  ) : null}
                </div>

                {assignment.scenario?.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      <span className="font-medium">Duration:</span> {assignment.scenario.duration}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions</h4>
              <p className="text-sm text-blue-800">
                This is a training assignment. You'll proceed directly to the call simulation 
                with the scenario parameters set by your manager. Complete the call to fulfill 
                this assignment.
              </p>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isStarting}>
            Cancel
          </Button>
          <Button 
            onClick={handleStartScenario} 
            disabled={!assignment?.scenario || isStarting || isChecking}
            className="min-w-[120px] bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium"
          >
            {isStarting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Starting...
              </>
            ) : isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Checking...
              </>
            ) : (
              <>
                {assignment?.scenario && isIvyScenario(assignment.scenario) ? (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Voice Call
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Scenario
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Paywall Modal */}
    <PaywallModal
      isOpen={isPaywallOpen}
      onClose={handlePaywallClose}
      simulationLimit={simulationLimit}
      title={simulationLimit?.canSimulate ? "Upgrade to Continue" : "Simulation Limit Reached"}
      description={simulationLimit?.canSimulate 
        ? `You have ${simulationLimit?.remaining} simulation${simulationLimit?.remaining === 1 ? '' : 's'} remaining. Upgrade for unlimited access.`
        : "You've reached your free simulation limit for this month. Upgrade to continue training."
      }
    />
  </>
  )
}