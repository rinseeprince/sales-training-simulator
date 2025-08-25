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
import { CheckCircle, XCircle, TrendingUp, Clock, MessageSquare, ThumbsUp, ThumbsDown, Award, RotateCcw, Headphones, Edit2, Save, X } from 'lucide-react'
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



export function PostCallReview() {
  const { user } = useSupabaseAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const callId = searchParams.get('callId')
  
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
    userId: actualUserId 
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
  const [tempCallData, setTempCallData] = useState(null)
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
          conversationHistory: tempCallData.conversationHistory
        }),
      })
      
      if (saveResponse.ok) {
        const saveResult = await saveResponse.json()
        console.log('Call saved successfully:', saveResult)
        setCallSaved(true)
        // Remove temp data from session storage
        sessionStorage.removeItem(`temp_call_${callId}`)
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
    duration: typeof displayData?.duration === 'number' ? displayData.duration : 0
  }

  // Load coaching feedback when we have a transcript
  useEffect(() => {
    const loadCoachingFeedback = async () => {
      if (!safeDisplayData.transcript || safeDisplayData.transcript.length === 0 || isLoadingCoaching || coachingFeedback) return;
      
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
  }, [safeDisplayData.transcript]);
  
  console.log('Review page data:', {
    callId,
    call: call ? {
      id: call.id,
      score: call.score,
      talk_ratio: call.talk_ratio,
      objections_handled: call.objections_handled,
      cta_used: call.cta_used,
      audio_url: call.audio_url,
      hasAudioUrl: !!call.audio_url
    } : null,
    hasAudio,
    displayData: safeDisplayData ? {
      id: safeDisplayData.id,
      score: safeDisplayData.score,
      talk_ratio: safeDisplayData.talk_ratio,
      objections_handled: safeDisplayData.objections_handled,
      audio_url: safeDisplayData.audio_url
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Post-Call Review</h1>
            <div className="flex items-center mt-2 space-x-2">
              {isEditingName ? (
                <div className="flex items-center space-x-2">
                  <Input
                    value={simulationName}
                    onChange={(e) => setSimulationName(e.target.value)}
                    className="text-muted-foreground"
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
                  >
                    {isSavingName ? 'Saving...' : <Save className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSavingName}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <p className="text-muted-foreground">
                    {simulationName} - {callSaved ? 'Completed' : 'Not Saved'} {isRealCall(safeDisplayData) && safeDisplayData.created_at ? new Date(safeDisplayData.created_at).toLocaleDateString() : tempCallData?.created_at ? new Date(tempCallData.created_at).toLocaleDateString() : callData.date}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingName(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {!callSaved && tempCallData && (
                    <Button
                      size="sm"
                      onClick={handleSaveCall}
                      disabled={isSavingCall || !simulationName.trim()}
                      className="ml-2"
                    >
                      {isSavingCall ? 'Saving...' : <><Save className="h-4 w-4 mr-1" />Save Call</>}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleRequestRetry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Request Re-try
            </Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{coachingFeedback?.overallScore || safeDisplayData.score}/100</div>
            <Progress value={coachingFeedback?.overallScore || safeDisplayData.score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Talk Ratio</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coachingFeedback?.metrics?.talkRatio ? `${coachingFeedback.metrics.talkRatio}% / ${100 - coachingFeedback.metrics.talkRatio}%` :
               safeDisplayData.talk_ratio ? `${safeDisplayData.talk_ratio}% / ${100 - safeDisplayData.talk_ratio}%` : 
               `${callData.talkRatio.rep}% / ${callData.talkRatio.ai}%`}
            </div>
            <p className="text-xs text-muted-foreground">Rep / Prospect</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CTA Used</CardTitle>
            {(() => {
              const ctaUsed = coachingFeedback?.categoryScores?.closing > 0 || safeDisplayData.cta_used;
              return ctaUsed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              );
            })()}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const ctaUsed = coachingFeedback?.categoryScores?.closing > 0 || 
                               displayData.cta_used !== undefined ? displayData.cta_used : callData.ctaUsed;
                return ctaUsed ? 'Yes' : 'No';
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              Clear next steps provided
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callData.confidence}</div>
            <Badge variant="secondary" className="mt-1">
              {safeDisplayData.sentiment || callData.sentiment}
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content - Takes up more space */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-3 space-y-6"
        >
          {/* Objections Handled */}
          <Card>
            <CardHeader>
              <CardTitle>Objections Handled</CardTitle>
              <CardDescription>
                Key objections raised during the call and how they were addressed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  // Check if there were actually objections raised based on coaching feedback
                  const objectionsRaised = coachingFeedback?.metrics?.objectionsRaised || 0;
                  const objectionHandlingScore = coachingFeedback?.categoryScores?.objectionHandling || 0;
                  
                  // If no objections were raised at all, show that
                  if (objectionsRaised === 0) {
                    return (
                      <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                        <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">No objections were raised during this call</span>
                      </div>
                    );
                  }
                  
                  // If objections were raised, show how many were handled based on the score
                  const handledCount = objectionHandlingScore > 0 ? 
                    Math.min(objectionsRaised, Math.ceil(objectionHandlingScore / 5)) : 0;
                  
                  if (handledCount === 0 && objectionsRaised > 0) {
                    return (
                      <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-600">
                          {objectionsRaised} objection(s) raised but not handled effectively
                        </span>
                      </div>
                    );
                  }
                  
                  // Show handled objections
                  return Array(handledCount).fill(0).map((_, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">Objection {index + 1} handled effectively</span>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>

          {/* AI Coaching Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Coaching Feedback</CardTitle>
              <CardDescription>
                Detailed performance analysis with category-based scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCoaching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                          <CheckCircle className="h-5 w-5 text-teal-500 flex-shrink-0 mt-0.5" />
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
                  )) : feedback.map((item: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3">
                      {index < 2 ? (
                        <ThumbsUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <ThumbsDown className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm">{item}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Recording and Transcript in a grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Call Recording */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Headphones className="h-5 w-5" />
                  Call Recording
                </CardTitle>
                <CardDescription>
                  Listen to the full call recording with waveform visualization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AudioPlayer 
                  audioUrl={hasAudio}
                  title="Call Recording"
                  duration={safeDisplayData.duration}
                  showWaveform={true}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Call Details */}
            <Card>
              <CardHeader>
                <CardTitle>Call Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>Discovery Call (Outbound Generated)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prospect:</span>
                  <span>C-Level</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty:</span>
                  <span>Hard (4/5)</span>
                </div>
              </CardContent>
            </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Manager Comments</CardTitle>
              <CardDescription>
                Add your feedback and notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add your comments about this call..."
                value={managerComments}
                onChange={(e) => setManagerComments(e.target.value)}
                className="min-h-[100px]"
              />
              <Button className="w-full">
                Save Comments
              </Button>
            </CardContent>
          </Card>

          {/* Certification */}
          <Card>
            <CardHeader>
              <CardTitle>Certification Level</CardTitle>
              <CardDescription>
                Set the certification level for this performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={certificationLevel} onValueChange={setCertificationLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select certification level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze - Needs Improvement</SelectItem>
                  <SelectItem value="silver">Silver - Meets Standards</SelectItem>
                  <SelectItem value="gold">Gold - Exceeds Standards</SelectItem>
                  <SelectItem value="platinum">Platinum - Expert Level</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" disabled={!certificationLevel}>
                <Award className="mr-2 h-4 w-4" />
                Certify Performance
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
