'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, TrendingUp, Clock, MessageSquare, ThumbsUp, ThumbsDown, Award, RotateCcw, Headphones, Edit2, Save, X, Target, Users, Phone, FileText, Lightbulb } from 'lucide-react'
import { AudioPlayer } from '@/components/ui/audio-player'
import { useCallData } from '@/hooks/use-call-data'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useSearchParams, useRouter } from 'next/navigation'

const callData = {
  score: 87,
  talkRatio: { rep: 65, ai: 35 },
  objections: ['Price too high', 'Need to think about it', 'Not the right time'],
  ctaUsed: true,
  confidence: 'High',
  sentiment: 'Friendly',
  duration: '18:32',
  date: '2024-01-15',
  audioUrl: null // Will be populated from actual call data
}

const feedback = [
  'Excellent opening - you clearly stated the value proposition within the first 30 seconds',
  'Good job handling the price objection by focusing on ROI rather than defending the cost',
  'Consider asking more discovery questions before presenting features',
  'Strong close with a clear next step and timeline',
  'Room for improvement: Listen more actively to prospect concerns'
]



interface TempCallData {
  callId: string;
  scenarioName: string;
  duration: string;
  audioUrl: string;
  conversationHistory: any[];
  transcript: any[];
  enhanced_scoring?: any;
  enhancedScoring?: any;
  created_at?: string;
}

interface PostCallReviewProps {
  modalCallId?: string
  isInModal?: boolean
}

export function PostCallReview({ modalCallId, isInModal = false }: PostCallReviewProps = {}) {
  const { user } = useSupabaseAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const callId = modalCallId || searchParams.get('callId')
  
  const [actualUserId, setActualUserId] = useState<string | null>(null)
  
  // Get the correct user ID from simple_users table
  useEffect(() => {
    const getUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
        const profileData = await profileResponse.json();
        
        if (profileData.success) {
          setActualUserId(profileData.userProfile.id);
        }
      } catch (error) {
        console.error('Error getting user profile:', error);
      }
    };
    
    getUserProfile();
  }, [user?.id]);

  const { call, loading, error } = useCallData({ 
    callId: callId || undefined, 
    userId: actualUserId || undefined 
  })

  // Fetch most recent call if no callId is provided
  useEffect(() => {
    const fetchMostRecentCall = async () => {
      if (callId || !actualUserId) return; // Only fetch if no callId and we have userId
      
      setLoadingRecentCall(true);
      setMostRecentCall(null); // Reset state to prevent flash
      try {
        const response = await fetch(`/api/calls?userId=${actualUserId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.calls && data.calls.length > 0) {
            setMostRecentCall(data.calls[0]); // Most recent call (already sorted by created_at desc)
          } else {
            setMostRecentCall(null);
          }
        }
      } catch (error) {
        console.error('Error fetching most recent call:', error);
        setMostRecentCall(null);
      } finally {
        setLoadingRecentCall(false);
      }
    };

    fetchMostRecentCall();
  }, [callId, actualUserId]);
  
  const [managerComments, setManagerComments] = useState('')
  const [certificationLevel, setCertificationLevel] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [simulationName, setSimulationName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [tempCallData, setTempCallData] = useState<TempCallData | null>(null)
  const [isSavingCall, setIsSavingCall] = useState(false)
  const [callSaved, setCallSaved] = useState(false)
  const [coachingFeedback, setCoachingFeedback] = useState<any>(null)
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(false)
  const [mostRecentCall, setMostRecentCall] = useState<any>(null)
  const [loadingRecentCall, setLoadingRecentCall] = useState(false)

  // Check for temporary call data on mount
  useEffect(() => {
    if (callId) {
      // Check for temporary call data in session storage
      const tempData = sessionStorage.getItem(`temp_call_${callId}`)
      console.log('Checking for temp call data:', { callId, hasTempData: !!tempData })
      if (tempData) {
        try {
          const parsedTempData = JSON.parse(tempData)
          console.log('Loaded temp call data:', parsedTempData)
          setTempCallData(parsedTempData)
          setSimulationName(parsedTempData.scenarioName || 'Unnamed Simulation')
          setCallSaved(false)
        } catch (error) {
          console.error('Error parsing temp call data:', error)
        }
      }
    }
  }, [callId]) // Only depend on callId

  // Handle regular call data separately
  useEffect(() => {
    // Only update if we don't have temp data and we have call data
    if (call?.scenario_name && tempCallData === null) {
      setSimulationName(call.scenario_name)
      setCallSaved(true) // Call is already saved if it comes from database
    } else if (mostRecentCall?.scenario_name && tempCallData === null && !call) {
      setSimulationName(mostRecentCall.scenario_name)
      setCallSaved(true) // Most recent call is already saved
    } else if (tempCallData === null && !call && !mostRecentCall) {
      setSimulationName('Enterprise Software Demo') // Default fallback
    }
  }, [call?.scenario_name, mostRecentCall?.scenario_name, tempCallData]) // More specific dependencies

  const handleSaveSimulationName = async () => {
    if (!callId || !simulationName.trim()) return
    
    setIsSavingName(true)
    try {
      // If we have temp call data, just update it in session storage
      if (tempCallData) {
        const updatedTempData = {
          ...tempCallData,
          scenarioName: simulationName.trim()
        }
        sessionStorage.setItem(`temp_call_${callId}`, JSON.stringify(updatedTempData))
        setTempCallData(updatedTempData)
        setIsEditingName(false)
      } else {
        // If it's a saved call, update in database
        const response = await fetch('/api/update-simulation-name', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            callId,
            simulationName: simulationName.trim()
          })
        })
        
        if (response.ok) {
          setIsEditingName(false)
          // Optionally refresh call data
        } else {
          console.error('Failed to save simulation name')
        }
      }
    } catch (error) {
      console.error('Error saving simulation name:', error)
    } finally {
      setIsSavingName(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingName(false)
    // Reset to original name
    if (call?.scenario_name) {
      setSimulationName(call.scenario_name)
    } else if (tempCallData?.scenarioName) {
      setSimulationName(tempCallData.scenarioName)
    }
  }

  const handleSaveCall = async () => {
    if (!tempCallData || callSaved) return
    
    setIsSavingCall(true)
    try {
      // Get the correct user ID from simple_users table
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user?.id}`);
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile: ' + profileData.error);
      }

      const actualUserId = profileData.userProfile.id;
      
      const saveResponse = await fetch('/api/save-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callId: tempCallData.callId,
          transcript: tempCallData.transcript,
          repId: actualUserId, // Use the correct user ID from simple_users table
          scenarioName: tempCallData.scenarioName || simulationName.trim(),
          duration: tempCallData.duration,
          audioUrl: tempCallData.audioUrl,
          conversationHistory: tempCallData.conversationHistory,
          // Pass existing enhanced scoring to prevent regeneration
          existingEnhancedScoring: tempCallData.enhanced_scoring || tempCallData.enhancedScoring
        }),
      })
      
      if (saveResponse.ok) {
        const saveResult = await saveResponse.json()
        console.log('Call saved successfully:', saveResult)
        
        // Update temp call data with enhanced scoring from save response
        if (saveResult.enhancedScoring) {
          const updatedTempData = {
            ...tempCallData,
            enhanced_scoring: saveResult.enhancedScoring,
            enhancedScoring: saveResult.enhancedScoring // Store both field names for compatibility
          }
          sessionStorage.setItem(`temp_call_${callId}`, JSON.stringify(updatedTempData))
          setTempCallData(updatedTempData)
          console.log('🔄 Updated temp data with enhanced scoring:', saveResult.enhancedScoring)
        }
        
        setCallSaved(true)
        // Don't remove temp data immediately - let it persist for the current session
        // sessionStorage.removeItem(`temp_call_${callId}`)
        // Navigate to saved simulations page
        router.push('/simulations')
      } else {
        const errorText = await saveResponse.text()
        console.error('Failed to save call:', saveResponse.status, errorText)
        alert('Failed to save call. Please try again.')
      }
    } catch (error) {
      console.error('Error saving call:', error)
      alert('Error saving call. Please try again.')
    } finally {
      setIsSavingCall(false)
    }
  }

  const handleApprove = () => {
    console.log('Call approved')
  }

  const handleRequestRetry = () => {
    console.log('Retry requested')
  }

  // Use temp call data, then real call data, then most recent call, or fallback to demo data
  const displayData = tempCallData || call || mostRecentCall || callData
  const hasAudio = tempCallData?.audioUrl || call?.audio_url || mostRecentCall?.audio_url || callData.audioUrl

  // Ensure data safety for critical properties
  const safeDisplayData = {
    ...displayData,
    feedback: Array.isArray(displayData?.feedback) ? displayData.feedback : [],
    transcript: Array.isArray(displayData?.transcript) ? displayData.transcript : [],
    score: typeof displayData?.score === 'number' ? displayData.score : 0,
    talk_ratio: typeof displayData?.talk_ratio === 'number' ? displayData.talk_ratio : 50,
    objections_handled: typeof displayData?.objections_handled === 'number' ? displayData.objections_handled : 0,
    cta_used: typeof displayData?.cta_used === 'boolean' ? displayData.cta_used : false,
    duration: typeof displayData?.duration === 'number' ? displayData.duration : 0,
    enhancedScoring: displayData?.enhanced_scoring || displayData?.enhancedScoring || null // Handle both field names
  }

  // Load coaching feedback when we have a transcript
  useEffect(() => {
    const loadCoachingFeedback = async () => {
      // Only load if we don't have enhanced scoring data from database
      if (!safeDisplayData.transcript || safeDisplayData.transcript.length === 0 || 
          isLoadingCoaching || coachingFeedback || safeDisplayData.enhancedScoring) return;
      
      setIsLoadingCoaching(true);
      try {
        const response = await fetch('/api/coach-call', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: safeDisplayData.transcript
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setCoachingFeedback(data.data);
        }
      } catch (error) {
        console.error('Error loading coaching feedback:', error);
      } finally {
        setIsLoadingCoaching(false);
      }
    };
    
    loadCoachingFeedback();
  }, [safeDisplayData.transcript, safeDisplayData.enhancedScoring]);
  
  console.log('Review page data:', {
    callId,
    call: call ? {
      id: call.id,
      score: call.score,
      talk_ratio: call.talk_ratio,
      objections_handled: call.objections_handled,
      cta_used: call.cta_used,
      audio_url: call.audio_url,
      hasAudioUrl: !!call.audio_url,
      enhanced_scoring: call.enhanced_scoring
    } : null,
    hasAudio,
    displayData: safeDisplayData ? {
      id: safeDisplayData.id,
      score: safeDisplayData.score,
      talk_ratio: safeDisplayData.talk_ratio,
      objections_handled: safeDisplayData.objections_handled,
      audio_url: safeDisplayData.audio_url,
      enhancedScoring: safeDisplayData.enhancedScoring
    } : null,
    tempCallData: tempCallData ? {
      enhanced_scoring: tempCallData.enhanced_scoring,
      enhancedScoring: tempCallData.enhancedScoring
    } : null,
    coachingFeedback: coachingFeedback ? {
      overallScore: coachingFeedback.overallScore,
      talkRatio: coachingFeedback.metrics?.talkRatio,
      objectionHandling: coachingFeedback.categoryScores?.objectionHandling,
      objectionsRaised: coachingFeedback.metrics?.objectionsRaised
    } : null
  });

  // Type guard to check if we have real call data vs temp data
  const isRealCall = (data: any): data is typeof call => {
    return data && typeof data === 'object' && 'id' in data && !data.isSaved === undefined
  }
  
  const isTempCall = (data: any) => {
    return data && typeof data === 'object' && data.isSaved === false
  }

  if (loading && !tempCallData) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error && !tempCallData) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error loading call data: {error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // If we have neither call data nor temp data, show error
  // Show loading while fetching data or when we don't have userId yet
  if (loading || loadingRecentCall || (!callId && !actualUserId)) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Loading call data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error only if we have a specific callId but no data found
  if (callId && !call && !tempCallData) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">Call data not found</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show message if no callId and no recent calls exist (but only after we've tried to fetch)
  if (!callId && !mostRecentCall && !tempCallData && actualUserId && !loadingRecentCall) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No saved simulations found</p>
            <Button onClick={() => router.push('/scenario-builder')}>
              Create Your First Simulation
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Compressed Hero Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] px-6 py-4 h-20"
      >
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center space-x-2">
              <Input
                value={simulationName}
                onChange={(e) => setSimulationName(e.target.value)}
                className="border-slate-200 focus:ring-primary"
                placeholder="Enter simulation name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveSimulationName()
                  } else if (e.key === 'Escape') {
                    handleCancelEdit()
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleSaveSimulationName}
                disabled={isSavingName || !simulationName.trim()}
                className="rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 font-medium"
              >
                {isSavingName ? 'Saving...' : <Save className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSavingName}
                className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div>
                <h1 className="text-xl font-semibold text-slate-900 truncate">{simulationName}</h1>
                <p className="text-sm text-slate-500">
                  {callSaved ? 'Completed' : 'Not Saved'} • {isRealCall(safeDisplayData) && safeDisplayData?.created_at ? new Date(safeDisplayData.created_at).toLocaleDateString() : tempCallData?.created_at ? new Date(tempCallData.created_at).toLocaleDateString() : callData.date}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingName(true)}
                className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {!callSaved && tempCallData && (
            <Button
              size="sm"
              onClick={handleSaveCall}
              disabled={isSavingCall || !simulationName.trim()}
              className="rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 font-medium"
            >
              {isSavingCall ? 'Saving...' : <><Save className="h-4 w-4 mr-1" />Save Call</>}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleRequestRetry} 
            className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Request Re-try
          </Button>
          <Button 
            onClick={handleApprove} 
            className="rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 font-medium"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </div>
      </motion.div>

      {/* Modern Metric Tiles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Overall Score Tile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6 hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">OVERALL SCORE</span>
            <Award className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-3xl font-semibold text-slate-900 mb-2">
            {safeDisplayData.enhancedScoring?.overallScore || coachingFeedback?.overallScore || safeDisplayData.score}/100
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${safeDisplayData.enhancedScoring?.overallScore || coachingFeedback?.overallScore || safeDisplayData.score}%`,
                backgroundColor: (safeDisplayData.enhancedScoring?.overallScore || coachingFeedback?.overallScore || safeDisplayData.score) >= 90 
                  ? '#10b981' 
                  : (safeDisplayData.enhancedScoring?.overallScore || coachingFeedback?.overallScore || safeDisplayData.score) >= 70 
                  ? '#048998' 
                  : '#f59e0b'
              }}
            />
          </div>
        </div>

        {/* Talk Ratio Tile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6 hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">TALK RATIO</span>
            <MessageSquare className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-3xl font-semibold text-slate-900 mb-1">
            {coachingFeedback?.metrics?.talkRatio ? `${coachingFeedback.metrics.talkRatio}%` :
             safeDisplayData.talk_ratio ? `${safeDisplayData.talk_ratio}%` : 
             `${callData.talkRatio.rep}%`}
          </div>
          <p className="text-xs text-slate-500">Rep / {coachingFeedback?.metrics?.talkRatio ? `${100 - coachingFeedback.metrics.talkRatio}%` :
           safeDisplayData.talk_ratio ? `${100 - safeDisplayData.talk_ratio}%` : 
           `${callData.talkRatio.ai}%`} Prospect</p>
        </div>

        {/* CTA Used Tile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6 hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">CTA USED</span>
            {(() => {
              const ctaUsed = coachingFeedback?.categoryScores?.closing > 0 || safeDisplayData.cta_used;
              return ctaUsed ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              );
            })()}
          </div>
          <div className="text-3xl font-semibold text-slate-900 mb-1">
            {(() => {
              const ctaUsed = coachingFeedback?.categoryScores?.closing > 0 || 
                             displayData.cta_used !== undefined ? displayData.cta_used : callData.ctaUsed;
              return ctaUsed ? 'Yes' : 'No';
            })()}
          </div>
          <p className="text-xs text-slate-500">Clear next steps provided</p>
        </div>

        {/* Confidence Tile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6 hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">CONFIDENCE</span>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-3xl font-semibold text-slate-900 mb-1">{callData.confidence}</div>
          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-1 text-xs">
            {safeDisplayData.sentiment || callData.sentiment}
          </span>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content - Takes up more space */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-3 space-y-6"
        >


          {/* AI Coaching Feedback */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Coaching Feedback</h3>
                <p className="text-sm text-slate-500">Detailed performance analysis tailored to your scenario</p>
              </div>
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lightbulb className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div>


              {isLoadingCoaching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : safeDisplayData?.enhancedScoring ? (
                <div className="space-y-4">
                  {/* Convert enhanced scoring to bullet point format */}
                  {[
                    ...(safeDisplayData?.enhancedScoring?.strengths || []),
                    ...(safeDisplayData?.enhancedScoring?.areasForImprovement || []),
                    ...(safeDisplayData?.enhancedScoring?.coachingTips || [])
                  ].map((item: string, index: number) => {
                    // Determine if it's a strength (thumbs up) or improvement/tip (thumbs down)
                    const isStrength = index < (safeDisplayData?.enhancedScoring?.strengths?.length || 0);
                    return (
                      <div key={index} className="flex items-start space-x-3">
                        {isStrength ? (
                          <ThumbsUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <ThumbsDown className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        )}
                        <p className="text-sm">{item}</p>
                      </div>
                    );
                  })}
                  {((!safeDisplayData?.enhancedScoring?.strengths || safeDisplayData?.enhancedScoring?.strengths?.length === 0) && 
                    (!safeDisplayData?.enhancedScoring?.areasForImprovement || safeDisplayData?.enhancedScoring?.areasForImprovement?.length === 0) && 
                    (!safeDisplayData?.enhancedScoring?.coachingTips || safeDisplayData?.enhancedScoring?.coachingTips?.length === 0)) && (
                    <p className="text-sm text-muted-foreground">No feedback available</p>
                  )}
                </div>
              ) : coachingFeedback ? (
                <div className="space-y-6">
                  {/* Category Scores */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Performance Breakdown</h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Opening</span>
                          <span className="font-medium">{coachingFeedback.categoryScores?.opening || 0}/20</span>
                        </div>
                        <Progress value={(coachingFeedback.categoryScores?.opening || 0) / 20 * 100} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Discovery</span>
                          <span className="font-medium">{coachingFeedback.categoryScores?.discovery || 0}/25</span>
                        </div>
                        <Progress value={(coachingFeedback.categoryScores?.discovery || 0) / 25 * 100} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Objection Handling</span>
                          <span className="font-medium">{coachingFeedback.categoryScores?.objectionHandling || 0}/20</span>
                        </div>
                        <Progress value={(coachingFeedback.categoryScores?.objectionHandling || 0) / 20 * 100} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Value Demo</span>
                          <span className="font-medium">{coachingFeedback.categoryScores?.valueDemonstration || 0}/20</span>
                        </div>
                        <Progress value={(coachingFeedback.categoryScores?.valueDemonstration || 0) / 20 * 100} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Closing</span>
                          <span className="font-medium">{coachingFeedback.categoryScores?.closing || 0}/15</span>
                        </div>
                        <Progress value={(coachingFeedback.categoryScores?.closing || 0) / 15 * 100} />
                      </div>
                    </div>
                  </div>

                  {/* Structured Feedback Sections */}
                  <Tabs defaultValue="strengths" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="strengths">Strengths</TabsTrigger>
                      <TabsTrigger value="improvements">Improvements</TabsTrigger>
                      <TabsTrigger value="next-steps">Next Steps</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="strengths" className="space-y-3 mt-4">
                      {coachingFeedback.strengths?.map((strength: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <ThumbsUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">{strength}</p>
                        </div>
                      )) || <p className="text-sm text-muted-foreground">No strengths identified</p>}
                    </TabsContent>
                    
                    <TabsContent value="improvements" className="space-y-3 mt-4">
                      {coachingFeedback.improvements?.map((improvement: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <TrendingUp className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">{improvement}</p>
                        </div>
                      )) || <p className="text-sm text-muted-foreground">No improvements identified</p>}
                    </TabsContent>
                    
                    <TabsContent value="next-steps" className="space-y-3 mt-4">
                      {coachingFeedback.nextSteps?.map((step: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-sm">{step}</p>
                        </div>
                      )) || <p className="text-sm text-muted-foreground">No next steps identified</p>}
                    </TabsContent>
                  </Tabs>

                  {/* Model Info */}
                  <div className="text-xs text-muted-foreground pt-4 border-t">
                    Analysis by {coachingFeedback.model || 'AI Coach'} • {new Date(coachingFeedback.timestamp || Date.now()).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {safeDisplayData.feedback.length > 0 ? safeDisplayData.feedback.map((item: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3">
                      {index < 2 ? (
                        <ThumbsUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <ThumbsDown className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm">{item}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No feedback available</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Call Recording and Transcript in a grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Call Recording */}
            <AudioPlayer 
              audioUrl={hasAudio}
              title="Call Recording"
              duration={safeDisplayData.duration}
              showWaveform={true}
              className="w-full"
            />

            {/* Call Details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Call Details</h3>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>
                    {safeDisplayData.duration ? 
                      `${Math.floor(safeDisplayData.duration / 60)}:${(safeDisplayData.duration % 60).toString().padStart(2, '0')}` : 
                      callData.duration}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>
                    {safeDisplayData.created_at ? 
                      new Date(safeDisplayData.created_at).toLocaleDateString() : 
                      callData.date}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span>{callSaved ? 'Saved' : 'Not Saved'}</span>
                </div>
              </div>
            </div>
          </div>


        </motion.div>

        {/* Sidebar - Takes up less space */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          {/* Manager Comments */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Manager Comments</h3>
                <p className="text-sm text-slate-500">Add your feedback and notes</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="space-y-4">
              <Textarea
                placeholder="Add your comments about this call..."
                value={managerComments}
                onChange={(e) => setManagerComments(e.target.value)}
                className="min-h-[100px] rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
              />
              <Button className="w-full rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 font-medium">
                Save Comments
              </Button>
            </div>
          </div>

          {/* Certification */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Certification Level</h3>
                <p className="text-sm text-slate-500">Set the certification level for this performance</p>
              </div>
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="space-y-4">
              <Select value={certificationLevel} onValueChange={setCertificationLevel}>
                <SelectTrigger className="rounded-lg border-slate-200 px-4 py-3 focus:ring-primary">
                  <SelectValue placeholder="Select certification level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze - Needs Improvement</SelectItem>
                  <SelectItem value="silver">Silver - Meets Standards</SelectItem>
                  <SelectItem value="gold">Gold - Exceeds Standards</SelectItem>
                  <SelectItem value="platinum">Platinum - Expert Level</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 font-medium" disabled={!certificationLevel}>
                <Award className="mr-2 h-4 w-4" />
                Certify Performance
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
