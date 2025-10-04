'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Play } from 'lucide-react'
import { PostCallReview } from '@/components/pages/post-call-review'
import * as DialogPrimitive from "@radix-ui/react-dialog"

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  callId: string | null
  title?: string
  isManagerReview?: boolean
  onReviewSubmit?: (reviewData: { status: string; feedback?: string; scoreOverride?: number }) => void
}

export function ReviewModal({ isOpen, onClose, callId, title, isManagerReview, onReviewSubmit }: ReviewModalProps) {
  // Check for reviewCallId in URL on mount to support direct links
  useEffect(() => {
    if (!isOpen) {
      const url = new URL(window.location.href)
      const reviewCallId = url.searchParams.get('reviewCallId')
      if (reviewCallId && callId === reviewCallId) {
        // Modal should be open based on URL
        // This will be handled by parent components
      }
    }
  }, [])

  // Update URL params when modal opens/closes for better UX and back button support
  useEffect(() => {
    if (isOpen && callId) {
      // Add callId to URL without navigation
      const url = new URL(window.location.href)
      url.searchParams.set('reviewCallId', callId)
      window.history.pushState({}, '', url.toString())
    } else if (!isOpen) {
      // Don't manipulate URL when closing - let parent handle navigation
      // This prevents conflicts with router.push() calls
    }
  }, [isOpen, callId])

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href)
      const reviewCallId = url.searchParams.get('reviewCallId')
      
      if (!reviewCallId && isOpen) {
        onClose()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isOpen, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="!z-[9998] backdrop-blur-sm bg-black/60" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] !z-[9999] w-[96vw] max-w-[1400px] translate-x-[-50%] translate-y-[-50%] border border-slate-200/50 bg-white p-0 duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-97 data-[state=open]:zoom-in-97 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] max-h-[92vh] flex flex-col overflow-hidden [&>button]:hidden rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1)]"
          aria-describedby={undefined}
        >
          <DialogHeader className="shrink-0 px-8 py-6 pb-5 border-b border-slate-100/80 bg-white/95 backdrop-blur-sm sticky top-0 z-[110] rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Play className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-slate-900 mb-1">
                    {title || 'Call Review'}
                  </DialogTitle>
                  <p className="text-sm text-slate-500">Performance analysis and coaching feedback</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-9 w-9 p-0 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 backdrop-blur-sm transition-all duration-200 hover:scale-105"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-gradient-to-b from-slate-50/30 to-slate-50/60" style={{ maxHeight: 'calc(92vh - 140px)' }}>
            <div className="px-8 py-6">
              {callId ? (
                <PostCallReview 
                  modalCallId={callId}
                  isInModal={true}
                  isManagerReview={isManagerReview}
                  onReviewSubmit={onReviewSubmit}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
