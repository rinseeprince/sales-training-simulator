'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, TrendingUp, MessageSquare, Award, RotateCcw, Edit2, Save, X, Phone, FileText, Lightbulb, PlayCircle, Share2, Calendar, ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { AudioPlayer } from '@/components/ui/audio-player'
import { useCallData } from '@/hooks/use-call-data'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useSearchParams, useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

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


// Presentational Components
const ScoreGauge = ({ score, size = 120 }: { score: number; size?: number }) => {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-slate-200"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          className={`${
            score >= 90 ? 'text-emerald-500' : 
            score >= 70 ? 'text-teal-500' : 
            score >= 50 ? 'text-amber-500' : 'text-red-500'
          }`}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-slate-900">{score}</div>
        <div className="text-xs text-slate-500 uppercase tracking-wide">SCORE</div>
      </div>
    </div>
  )
}

const MetricChip = ({ 
  label, 
  value, 
  icon, 
  variant = 'default' 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  variant?: 'default' | 'success' | 'warning' | 'error' 
}) => {
  const variants = {
    default: 'bg-slate-50 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200'
  }
  
  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${variants[variant]}`}>
      {icon}
      <div className="text-sm">
        <div className="font-medium">{value}</div>
        <div className="text-xs opacity-75">{label}</div>
      </div>
    </div>
  )
}

const TalkRatioBar = ({ rep, prospect }: { rep: number; prospect: number }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-600">
        <span>Rep {rep}%</span>
        <span>Prospect {prospect}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div className="h-full flex">
          <motion.div 
            className="bg-teal-500 h-full" 
            initial={{ width: 0 }}
            animate={{ width: `${rep}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <motion.div 
            className="bg-slate-400 h-full" 
            initial={{ width: 0 }}
            animate={{ width: `${prospect}%` }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  )
}

const MiniSparkline = ({ points = [] }: { points?: number[] }) => {
  // Generate synthetic points if none provided
  const defaultPoints = points.length > 0 ? points : Array.from({ length: 8 }, (_, i) => 30 + Math.sin(i * 0.5) * 20 + Math.random() * 10)
  const maxPoint = Math.max(...defaultPoints)
  const minPoint = Math.min(...defaultPoints)
  const range = maxPoint - minPoint || 1
  
  const pathData = defaultPoints.map((point, index) => {
    const x = (index / (defaultPoints.length - 1)) * 40
    const y = 16 - ((point - minPoint) / range) * 12
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
  
  return (
    <svg width="40" height="16" className="text-teal-500">
      <motion.path
        d={pathData}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />
    </svg>
  )
}

const CoachingPanel = ({ 
  data
}: { 
  data: any; 
}) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    strengths: true,
    improvements: true
  })
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }
  
  const strengths = data?.strengths || []
  const improvements = data?.areasForImprovement || data?.improvements || []
  
  return (
    <div className="space-y-4">
      {/* Strengths */}
      <div className="border border-emerald-200 rounded-lg bg-emerald-50">
        <button
          onClick={() => toggleSection('strengths')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span className="font-medium text-emerald-900">Strengths ({strengths.length})</span>
          </div>
          {expandedSections.strengths ? 
            <ChevronDown className="h-4 w-4 text-emerald-700" /> : 
            <ChevronRight className="h-4 w-4 text-emerald-700" />
          }
        </button>
        {expandedSections.strengths && (
          <div className="px-4 pb-4 space-y-3">
            {strengths.length > 0 ? (
              strengths.map((item: string, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <p className="text-sm text-emerald-800">{item}</p>
                </div>
              ))
            ) : (
              <div className="px-4 pb-4">
                <p className="text-sm text-emerald-700 italic">No specific strengths identified yet</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Areas for Improvement */}
      <div className="border border-amber-200 rounded-lg bg-amber-50">
        <button
          onClick={() => toggleSection('improvements')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-900">Areas to Improve ({improvements.length})</span>
          </div>
          {expandedSections.improvements ? 
            <ChevronDown className="h-4 w-4 text-amber-700" /> : 
            <ChevronRight className="h-4 w-4 text-amber-700" />
          }
        </button>
        {expandedSections.improvements && (
          <div className="px-4 pb-4 space-y-3">
            {improvements.length > 0 ? (
              improvements.map((item: string, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  <p className="text-sm text-amber-800">{item}</p>
                </div>
              ))
            ) : (
              <div className="px-4 pb-4">
                <p className="text-sm text-amber-700 italic">Great job! No major areas for improvement identified</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const StickyFooter = () => {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 mt-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={() => document.getElementById('review-audio')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Replay Call
          </Button>
          <Button 
            variant="outline" 
            className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={() => document.getElementById('transcript')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <FileText className="mr-2 h-4 w-4" />
            View Transcript
          </Button>
        </div>
        <div className="flex items-center space-x-3">
          <Button className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Coaching
          </Button>
          <Button variant="outline" className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50">
            <Share2 className="mr-2 h-4 w-4" />
            Share with Rep
          </Button>
        </div>
      </div>
    </div>
  )
}

interface TempCallData {
  callId: string;
  scenarioName: string;
  scenarioPrompt?: string;
  scenarioProspectName?: string;
  scenarioVoice?: string;
  duration: string;
  audioUrl: string;
  conversationHistory: any[];
  transcript: any[];
  enhanced_scoring?: any;
  enhancedScoring?: any;
  created_at?: string;
  assignmentId?: string;
}

interface PostCallReviewProps {
  modalCallId?: string
  isInModal?: boolean
}

export function PostCallReview({ modalCallId, isInModal = false }: PostCallReviewProps = {}) {
  const { user } = useSupabaseAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
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
      if (tempData) {
        try {
          const parsedTempData = JSON.parse(tempData)
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
    // If we have call data from database, it means it's saved regardless of temp data
    if (call?.scenario_name) {
      setSimulationName(call.scenario_name)
      if (!callSaved) setCallSaved(true) // Only set if not already saved
    } else if (mostRecentCall?.scenario_name && !call && tempCallData === null) {
      setSimulationName(mostRecentCall.scenario_name)
      if (!callSaved) setCallSaved(true) // Only set if not already saved
    } else if (tempCallData === null && !call && !mostRecentCall) {
      setSimulationName('Enterprise Software Demo') // Default fallback
    }
  }, [call?.scenario_name, mostRecentCall?.scenario_name, tempCallData, callSaved]) // Include callSaved in dependencies

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
          assignmentId: tempCallData.assignmentId, // Pass assignment ID if present
          // Include all scenario data needed for "Start Over" (use database field names)
          scenario_prompt: tempCallData.scenarioPrompt,
          scenario_prospect_name: tempCallData.scenarioProspectName,
          scenario_voice: tempCallData.scenarioVoice,
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
        // Remove temp data since call is now saved in database
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

  const handleStartOver = async () => {
    // Check simulation limit before proceeding
    if (user) {
      try {
        // Get the correct user ID from simple_users table (use actualUserId if available)
        const userId = actualUserId || user.id;
        
        const response = await fetch(`/api/check-simulation-limit?userId=${userId}`)
        const data = await response.json()
        
        if (!data.canSimulate) {
          toast({
            title: "Simulation Limit Reached",
            description: data.message || "You've reached your free simulation limit. Please upgrade to continue.",
            variant: "destructive",
            action: (
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/pricing')}
              >
                Upgrade
              </Button>
            )
          })
          return
        }
        
        // Show remaining simulations for free users (informational only)
        if (data.remaining && data.remaining > 0 && data.remaining <= 10) {
          console.log(`You have ${data.remaining} free simulation${data.remaining === 1 ? '' : 's'} left.`)
        }
      } catch (error) {
        console.error('Failed to check simulation limit:', error)
        // Continue anyway if check fails - will be enforced when recording starts
      }
    }

    console.log('🔄 Start Over clicked - Available data:', {
      tempCallData: tempCallData ? {
        scenarioName: tempCallData.scenarioName,
        scenarioPrompt: tempCallData.scenarioPrompt,
        scenarioProspectName: tempCallData.scenarioProspectName,
        scenarioVoice: tempCallData.scenarioVoice
      } : null,
      call: call ? {
        scenario_name: call.scenario_name,
        scenario_prompt: call.scenario_prompt,
        scenario_prospect_name: call.scenario_prospect_name,
        scenario_voice: call.scenario_voice
      } : null,
      mostRecentCall: mostRecentCall ? {
        scenario_name: mostRecentCall.scenario_name
      } : null
    });

    // Check if we have scenario data from the current call
    if (tempCallData?.scenarioName) {
      // Create scenario data from temp call data with full scenario details
      const scenarioData = {
        title: tempCallData.scenarioName,
        prompt: tempCallData.scenarioPrompt || 'Restart this sales simulation scenario',
        prospectName: tempCallData.scenarioProspectName || 'Prospect',
        voice: tempCallData.scenarioVoice || 'alloy',
        timestamp: Date.now()
      }
      console.log('🔄 Using temp call data, setting scenario:', scenarioData);
      localStorage.setItem('currentScenario', JSON.stringify(scenarioData))
      console.log('🔄 Scenario saved to localStorage, navigating to /simulation');
      // Verify the scenario was saved
      const savedScenario = localStorage.getItem('currentScenario');
      console.log('🔄 Verified saved scenario:', savedScenario ? JSON.parse(savedScenario) : null);
      
      // Use window.location.href for modal navigation to ensure it works
      console.log('🔄 Using window.location.href for navigation from modal');
      window.location.href = '/simulation'
    } else if (call?.scenario_name) {
      // Create scenario data from saved call data
      const scenarioData = {
        title: call.scenario_name,
        prompt: call.scenario_prompt || 'Restart this sales simulation scenario',
        prospectName: call.scenario_prospect_name || 'Prospect',
        voice: call.scenario_voice || 'alloy',
        timestamp: Date.now()
      }
      console.log('🔄 Using saved call data, setting scenario:', scenarioData);
      localStorage.setItem('currentScenario', JSON.stringify(scenarioData))
      window.location.href = '/simulation'
    } else if (mostRecentCall?.scenario_name) {
      // Create scenario data from most recent call
      const scenarioData = {
        title: mostRecentCall.scenario_name,
        prompt: mostRecentCall.scenario_prompt || 'Restart this sales simulation scenario',
        prospectName: mostRecentCall.scenario_prospect_name || 'Prospect',
        voice: mostRecentCall.scenario_voice || 'alloy',
        timestamp: Date.now()
      }
      console.log('🔄 Using most recent call data, setting scenario:', scenarioData);
      localStorage.setItem('currentScenario', JSON.stringify(scenarioData))
      window.location.href = '/simulation'
    } else {
      // Fallback: redirect to scenario builder
      console.log('🔄 No scenario data available, redirecting to scenario builder');
      router.push('/scenario-builder')
    }
  }

  // Use temp call data, then real call data, then most recent call, or fallback to demo data
  const displayData = tempCallData || call || mostRecentCall || callData
  const hasAudio = tempCallData?.audioUrl || call?.audio_url || mostRecentCall?.audio_url || callData.audioUrl

  // Memoize display data to prevent unnecessary re-renders
  const safeDisplayData = useMemo(() => ({
    ...displayData,
    feedback: Array.isArray(displayData?.feedback) ? displayData.feedback : [],
    transcript: Array.isArray(displayData?.transcript) ? displayData.transcript : [],
    score: typeof displayData?.score === 'number' ? displayData.score : 0,
    talk_ratio: typeof displayData?.talk_ratio === 'number' ? displayData.talk_ratio : 50,
    objections_handled: typeof displayData?.objections_handled === 'number' ? displayData.objections_handled : 0,
    cta_used: typeof displayData?.cta_used === 'boolean' ? displayData.cta_used : false,
    duration: typeof displayData?.duration === 'number' ? displayData.duration : 0,
    enhancedScoring: displayData?.enhanced_scoring || displayData?.enhancedScoring || null // Handle both field names
  }), [displayData])

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
  
  // Debug logging (only when explicitly needed)
  // useEffect(() => {
  //   console.log('Review page data:', {
  //     callId,
  //     call: call ? { id: call.id, hasAudio: !!call.audio_url } : null,
  //     hasAudio: !!hasAudio,
  //     displayDataExists: !!safeDisplayData
  //   });
  // }, [callId]); // Only log once per callId change


  // Type guard to check if we have real call data vs temp data

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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Header Card with Title and Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`${isInModal ? 'sticky top-6 z-10' : ''} bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-6`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center space-x-3">
                  <Input
                    value={simulationName}
                    onChange={(e) => setSimulationName(e.target.value)}
                    className="text-lg font-semibold border-slate-200 focus:ring-teal-500 focus:border-teal-500 dark:border-slate-600 dark:bg-slate-700"
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
                    className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 rounded-xl font-medium"
                  >
                    {isSavingName ? 'Saving...' : <Save className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSavingName}
                    className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">{simulationName}</h1>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Badge variant={callSaved ? 'default' : 'secondary'} className="rounded-full px-2 py-1 text-xs">
                      {callSaved ? 'Saved' : 'Temporary'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingName(true)}
                      className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              {!callSaved && tempCallData && (
                <Button
                  size="sm"
                  onClick={handleSaveCall}
                  disabled={isSavingCall || !simulationName.trim()}
                  className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 rounded-xl font-medium"
                >
                  {isSavingCall ? 'Saving...' : <><Save className="h-4 w-4 mr-2" />Save Call</>}
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleStartOver} 
                className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
              <Button 
                onClick={handleApprove} 
                className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 rounded-xl font-medium"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Hero Section with Score Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-8"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-8">
              <ScoreGauge score={safeDisplayData.enhancedScoring?.overallScore || coachingFeedback?.overallScore || safeDisplayData.score} size={140} />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Performance Overview</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  {(() => {
                    const score = safeDisplayData.enhancedScoring?.overallScore || coachingFeedback?.overallScore || safeDisplayData.score
                    const insights = safeDisplayData.enhancedScoring?.insights || []
                    if (insights.length > 0) return insights[0]
                    if (score >= 90) return "Exceptional performance with strong execution"
                    if (score >= 80) return "Great call with room for minor improvements"
                    if (score >= 70) return "Good foundation with opportunities to excel"
                    if (score >= 60) return "Solid effort with clear areas for development"
                    return "Focus on fundamentals for significant improvement"
                  })()} 
                </p>
              </div>
            </div>
            
            {/* Metric Chips Row */}
            <div className="flex flex-wrap gap-3">
              <MetricChip 
                label="Talk Ratio"
                value={`${coachingFeedback?.metrics?.talkRatio || safeDisplayData.talk_ratio || callData.talkRatio.rep}%`}
                icon={<MessageSquare className="h-4 w-4" />}
                variant="default"
              />
              <MetricChip 
                label="CTA Used"
                value={(() => {
                  const cta = Boolean(coachingFeedback?.categoryScores?.closing) || Boolean(safeDisplayData.cta_used)
                  return cta ? "✓" : "✗"
                })()}
                icon={(() => {
                  const cta = Boolean(coachingFeedback?.categoryScores?.closing) || Boolean(safeDisplayData.cta_used)
                  return cta ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />
                })()}
                variant={(() => {
                  const cta = Boolean(coachingFeedback?.categoryScores?.closing) || Boolean(safeDisplayData.cta_used)
                  return cta ? 'success' : 'error'
                })()}
              />
              <MetricChip 
                label="Confidence"
                value={callData.confidence}
                icon={<MiniSparkline />}
                variant="default"
              />
            </div>
          </div>
          
          {/* Talk Ratio Detailed Bar */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <TalkRatioBar 
              rep={coachingFeedback?.metrics?.talkRatio || safeDisplayData.talk_ratio || callData.talkRatio.rep}
              prospect={100 - (coachingFeedback?.metrics?.talkRatio || safeDisplayData.talk_ratio || callData.talkRatio.rep)}
            />
          </div>
        </motion.div>

        {/* Main Grid Layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 space-y-8"
          >
            {/* AI Coaching Section - Chat Style */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center">
                      <Zap className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Coaching</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Personalized feedback and insights</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-700">
                    GPT-4 Analysis
                  </Badge>
                </div>
              </div>
              
              <div className="p-6">
                {isLoadingCoaching ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Analyzing your performance...</p>
                    </div>
                  </div>
                ) : safeDisplayData?.enhancedScoring || coachingFeedback ? (
                  <CoachingPanel data={safeDisplayData.enhancedScoring || coachingFeedback} />
                ) : (
                  <div className="space-y-4">
                    {safeDisplayData.feedback.length > 0 ? safeDisplayData.feedback.map((item: string, index: number) => (
                      <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
                        {index < 2 ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        )}
                        <p className="text-sm text-slate-700 dark:text-slate-300">{item}</p>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <Lightbulb className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                        <p>No coaching feedback available yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Manager Notes */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Manager Notes</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Add feedback and observations</p>
                </div>
              </div>
              <div className="space-y-4">
                <Textarea
                  placeholder="Add your comments about this call..."
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  className="min-h-[200px] rounded-lg border-slate-200 focus:ring-teal-500 focus:border-teal-500 dark:border-slate-600 dark:bg-slate-700"
                />
                <Button className="w-full bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm py-2.5 rounded-xl font-medium">
                  Save Comments
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-8"
          >
            {/* Call Details */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Call Details</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Duration</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {safeDisplayData.duration ? 
                      `${Math.floor(safeDisplayData.duration / 60)}:${(safeDisplayData.duration % 60).toString().padStart(2, '0')}` : 
                      callData.duration}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Date</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {safeDisplayData.created_at ? 
                      new Date(safeDisplayData.created_at).toLocaleDateString() : 
                      callData.date}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                  <Badge variant={callSaved ? 'default' : 'secondary'} className="text-xs">
                    {callSaved ? 'Saved' : 'Temporary'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Call Recording */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden" id="review-audio">
              <div className="bg-slate-50 dark:bg-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-600">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                    <PlayCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Call Recording</h3>
                </div>
              </div>
              <div className="p-6">
                <AudioPlayer 
                  audioUrl={hasAudio}
                  title=""
                  duration={safeDisplayData.duration}
                  showWaveform={true}
                  className="w-full"
                />
              </div>
            </div>

            {/* Certification */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                  <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Certification</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Rate this performance</p>
                </div>
              </div>
              <div className="space-y-4">
                <Select value={certificationLevel} onValueChange={setCertificationLevel}>
                  <SelectTrigger className="rounded-lg border-slate-200 focus:ring-teal-500 focus:border-teal-500 dark:border-slate-600 dark:bg-slate-700">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">🥉 Bronze - Needs Improvement</SelectItem>
                    <SelectItem value="silver">🥈 Silver - Meets Standards</SelectItem>
                    <SelectItem value="gold">🥇 Gold - Exceeds Standards</SelectItem>
                    <SelectItem value="platinum">💎 Platinum - Expert Level</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  className="w-full bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm py-2.5 rounded-xl font-medium" 
                  disabled={!certificationLevel}
                >
                  <Award className="mr-2 h-4 w-4" />
                  Certify Performance
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sticky Footer */}
        <StickyFooter />
      </div>
    </div>
  )
}