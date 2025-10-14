'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Zap,
  Copy,
  RefreshCw
} from 'lucide-react'

interface SimpleCoachingPanelProps {
  feedback: string | null
  isLoading?: boolean
  onRefresh?: () => void
}

export function SimpleCoachingPanel({ feedback, isLoading = false, onRefresh }: SimpleCoachingPanelProps) {
  
  const copyToClipboard = () => {
    if (feedback) {
      navigator.clipboard.writeText(feedback)
    }
  }

  const formatFeedback = (text: string) => {
    // Split by double newlines to create paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim())
    
    return paragraphs.map((paragraph, index) => {
      // Check if paragraph is a header (starts with number or bullet)
      const isHeader = /^(\d+\.|•|\*|-|#)/.test(paragraph.trim())
      
      if (isHeader) {
        return (
          <div key={index} className="mb-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
              {paragraph.trim()}
            </h4>
          </div>
        )
      }
      
      // Regular paragraph
      return (
        <div key={index} className="mb-4">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {paragraph.trim()}
          </p>
        </div>
      )
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-slate-700">Analyzing Your Call</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Getting detailed coaching feedback from AI...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <Zap className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p>No coaching feedback available</p>
        {onRefresh && (
          <Button 
            onClick={onRefresh} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Get Coaching Feedback
          </Button>
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/50 rounded-lg flex items-center justify-center">
            <Zap className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">AI Coaching Feedback</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Detailed analysis and recommendations</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-8 w-8 p-0"
            title="Copy feedback"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 w-8 p-0"
              title="Refresh feedback"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Feedback content */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {formatFeedback(feedback)}
        </div>
      </div>
    </motion.div>
  )
}