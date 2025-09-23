'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CheckCircle, 
  AlertCircle, 
  ThumbsDown, 
  MessageSquare, 
  Star,
  Clock
} from 'lucide-react'

interface ManagerReviewActionsProps {
  callId: string
  currentScore?: number
  onReviewSubmit: (reviewData: { 
    status: string
    feedback?: string
    scoreOverride?: number 
  }) => void
}

export function ManagerReviewActions({ 
  callId, 
  currentScore, 
  onReviewSubmit 
}: ManagerReviewActionsProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [feedback, setFeedback] = useState('')
  const [scoreOverride, setScoreOverride] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedStatus) return

    setIsSubmitting(true)
    try {
      const reviewData: any = {
        status: selectedStatus
      }

      if (feedback.trim()) {
        reviewData.feedback = feedback.trim()
      }

      if (scoreOverride && !isNaN(parseInt(scoreOverride))) {
        reviewData.scoreOverride = parseInt(scoreOverride)
      }

      await onReviewSubmit(reviewData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusOptions = [
    {
      value: 'approved',
      label: 'Approve Call',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Call meets quality standards and demonstrates good performance'
    },
    {
      value: 'needs_improvement',
      label: 'Needs Improvement',
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'Call shows potential but requires coaching and improvement'
    },
    {
      value: 'rejected',
      label: 'Reject Call',
      icon: ThumbsDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Call does not meet quality standards and needs significant work'
    }
  ]

  const selectedStatusData = statusOptions.find(opt => opt.value === selectedStatus)

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>Manager Review</span>
          </CardTitle>
          <Badge variant="outline" className="text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Review Action Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-slate-700">Review Decision</Label>
          <div className="grid gap-3">
            {statusOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedStatus === option.value
              return (
                <div
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={`
                    relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                    ${isSelected 
                      ? `${option.bgColor} ${option.borderColor}` 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? option.color : 'text-slate-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${isSelected ? option.color : 'text-slate-700'}`}>
                          {option.label}
                        </span>
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs">Selected</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{option.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Score Override */}
        {selectedStatus && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-700">
              Score Override (Optional)
            </Label>
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder={currentScore ? `Current: ${currentScore}` : 'Enter new score'}
                  value={scoreOverride}
                  onChange={(e) => setScoreOverride(e.target.value)}
                  className="w-24"
                />
              </div>
              <span className="text-sm text-slate-500">
                {currentScore && `Current score: ${currentScore}/100`}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Override the AI-generated score if you believe it doesn't accurately reflect performance
            </p>
          </div>
        )}

        {/* Feedback */}
        {selectedStatus && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-700">
              Feedback & Coaching Notes
              {selectedStatus !== 'approved' && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <Textarea
              placeholder={
                selectedStatus === 'approved' 
                  ? 'Optional: Add positive feedback or areas that went well...'
                  : 'Provide specific feedback and coaching guidance for improvement...'
              }
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {selectedStatus !== 'approved' && feedback.trim().length < 10 && (
              <p className="text-xs text-orange-600">
                Please provide detailed feedback for non-approved calls
              </p>
            )}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-sm text-slate-500">
            {selectedStatusData && (
              <div className="flex items-center space-x-2">
                <selectedStatusData.icon className={`h-4 w-4 ${selectedStatusData.color}`} />
                <span>Ready to {selectedStatusData.label.toLowerCase()}</span>
              </div>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStatus || isSubmitting || (selectedStatus !== 'approved' && feedback.trim().length < 10)}
            className={`
              ${selectedStatusData?.value === 'approved' 
                ? 'bg-green-600 hover:bg-green-700' 
                : selectedStatusData?.value === 'needs_improvement'
                ? 'bg-orange-600 hover:bg-orange-700'
                : selectedStatusData?.value === 'rejected'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-primary hover:bg-primary/90'
              } text-white
            `}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              <>
                {selectedStatusData?.icon && <selectedStatusData.icon className="h-4 w-4 mr-2" />}
                Submit Review
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}