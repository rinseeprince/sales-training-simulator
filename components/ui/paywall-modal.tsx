'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Zap, Crown, Users, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  simulationLimit?: {
    count: number
    limit: number
    remaining: number
    isPaid: boolean
  }
  title?: string
  description?: string
}

export function PaywallModal({ 
  isOpen, 
  onClose, 
  simulationLimit,
  title = "Simulation Limit Reached",
  description = "You've reached your free simulation limit for this month."
}: PaywallModalProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleUpgrade = async () => {
    setIsNavigating(true)
    try {
      router.push('/pricing')
      onClose()
    } finally {
      setIsNavigating(false)
    }
  }

  // Show different content based on whether limit is reached or approaching
  const isLimitReached = simulationLimit ? simulationLimit.remaining === 0 : true
  const isApproachingLimit = simulationLimit ? simulationLimit.remaining <= 3 && simulationLimit.remaining > 0 : false

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(97, 174, 177, 0.2)' }}>
            {isLimitReached ? (
              <Lock className="h-6 w-6" style={{ color: '#61aeb1' }} />
            ) : (
              <Zap className="h-6 w-6" style={{ color: '#61aeb1' }} />
            )}
          </div>
          <DialogTitle className="text-xl font-semibold">
            {isLimitReached ? title : "Upgrade to Continue"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isLimitReached ? (
              description
            ) : (
              `You have ${simulationLimit?.remaining} simulation${simulationLimit?.remaining === 1 ? '' : 's'} remaining. Upgrade for unlimited access.`
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Current usage display */}
        {simulationLimit && (
          <div className="my-6 rounded-lg border p-4" style={{ backgroundColor: 'rgba(97, 174, 177, 0.1)', borderColor: 'rgba(97, 174, 177, 0.3)' }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: '#61aeb1' }}>Monthly Usage</span>
              <Badge variant={isLimitReached ? "destructive" : "secondary"} className="text-xs px-2 py-1" style={{ backgroundColor: 'rgba(97, 174, 177, 0.2)', color: '#61aeb1', borderColor: 'rgba(97, 174, 177, 0.3)' }}>
                Free Plan
              </Badge>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm" style={{ color: 'rgba(97, 174, 177, 0.8)' }}>
                {simulationLimit.count} of {simulationLimit.limit} used
              </span>
              <span className="text-sm font-medium" style={{ color: '#61aeb1' }}>
                {simulationLimit.remaining} remaining
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(97, 174, 177, 0.3)' }}>
              <div 
                className={`h-full transition-all duration-300`}
                style={{ 
                  width: `${Math.min((simulationLimit.count / simulationLimit.limit) * 100, 100)}%`,
                  backgroundColor: isLimitReached ? '#ef4444' : isApproachingLimit ? '#f59e0b' : '#61aeb1'
                }}
              />
            </div>
          </div>
        )}

        {/* Upgrade benefits */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border p-3" style={{ backgroundColor: 'rgba(97, 174, 177, 0.1)', borderColor: 'rgba(97, 174, 177, 0.3)' }}>
            <Crown className="h-5 w-5 flex-shrink-0" style={{ color: '#61aeb1' }} />
            <div className="text-sm">
              <div className="font-medium" style={{ color: '#61aeb1' }}>More Simulations</div>
              <div style={{ color: 'rgba(97, 174, 177, 0.8)' }}>Get more reps in</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3" style={{ backgroundColor: 'rgba(97, 174, 177, 0.1)', borderColor: 'rgba(97, 174, 177, 0.3)' }}>
            <Users className="h-5 w-5 flex-shrink-0" style={{ color: '#61aeb1' }} />
            <div className="text-sm">
              <div className="font-medium" style={{ color: '#61aeb1' }}>Access to IVY</div>
              <div style={{ color: 'rgba(97, 174, 177, 0.8)' }}>AI-powered sales assistant</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3" style={{ backgroundColor: 'rgba(97, 174, 177, 0.1)', borderColor: 'rgba(97, 174, 177, 0.3)' }}>
            <Zap className="h-5 w-5 flex-shrink-0" style={{ color: '#61aeb1' }} />
            <div className="text-sm">
              <div className="font-medium" style={{ color: '#61aeb1' }}>Advanced Features</div>
              <div style={{ color: 'rgba(97, 174, 177, 0.8)' }}>Enhanced analytics & coaching</div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto bg-white hover:bg-gray-50 font-medium rounded-xl px-6 py-2.5"
            style={{ borderColor: 'rgba(97, 174, 177, 0.3)', color: 'rgba(97, 174, 177, 0.8)' }}
          >
            {isLimitReached ? 'Maybe Later' : 'Continue with Free'}
          </Button>
          <Button 
            onClick={handleUpgrade}
            disabled={isNavigating}
            className="w-full sm:w-auto bg-white hover:bg-gray-50 shadow-sm font-medium rounded-xl px-6 py-2.5"
            style={{ borderColor: 'rgba(97, 174, 177, 0.3)', color: '#61aeb1', border: '1px solid rgba(97, 174, 177, 0.3)' }}
          >
            {isNavigating ? 'Loading...' : 'View Pricing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}