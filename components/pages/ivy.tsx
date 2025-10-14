'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { useConversation } from '@elevenlabs/react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useElevenLabsRecorder } from '@/hooks/use-elevenlabs-recorder'
import { AudioWaveform } from '@/components/ui/audio-waveform'
import { ReviewModal } from '@/components/ui/review-modal'
import { ContactModal } from '@/components/ui/contact-modal'
import { useToast } from '@/hooks/use-toast'
import { getPhoneRingGenerator } from '@/lib/phone-ring-generator'
import { useRouter } from 'next/navigation'
import { Bot, Mic, Pause, Play, Square, Volume2, VolumeX, AlertCircle, Zap, RotateCcw, WifiOff, Wifi } from 'lucide-react'

interface ScenarioData {
  title: string
  prompt: string
  coachName: string
  timestamp: number
}

export function IvyPage() {
  const { user } = useSupabaseAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // Subscription and access control
  const [userSubscription, setUserSubscription] = useState<'free' | 'paid' | 'enterprise' | null>(null)
  const [actualUserId, setActualUserId] = useState<string | null>(null)
  
  // Scenario building
  const [scenarioData, setScenarioData] = useState<ScenarioData>({
    title: '',
    prompt: '',
    coachName: 'Ivy Scenario Builder',
    timestamp: 0
  })
  const [saveReuse, setSaveReuse] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Simulation state
  const [isSimulationActive, setIsSimulationActive] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [callId, setCallId] = useState<string>('')
  const [scenarioId, setScenarioId] = useState<string>('')
  const [isProcessingEndCall, setIsProcessingEndCall] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<string>('')
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewCallId, setReviewCallId] = useState<string | null>(null)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [isRinging, setIsRinging] = useState(false)
  const [conversationMessages, setConversationMessages] = useState<any[]>([])
  const [isSettingUpScenario, setIsSettingUpScenario] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  
  // Connection status simulation
  const [connectionStatus] = useState<'connected' | 'disconnected' | 'poor'>('connected')
  const [highLatency, setHighLatency] = useState(false)

  // ElevenLabs conversation hook
  const conversation = useConversation({
    agentId: 'agent_1701k5yrs1ate7btr3ve24j8tvm9',
    onConnect: () => {
      console.log('Connected to ElevenLabs agent')
      
      // Capture audio element for recording
      setTimeout(() => {
        const audioElements = document.querySelectorAll('audio')
        if (audioElements.length > 0) {
          const elevenLabsAudio = audioElements[audioElements.length - 1] // Get the last audio element (likely ElevenLabs)
          setAudioElement(elevenLabsAudio)
          
          // Add the audio to our recording mix
          captureConversationAudio(elevenLabsAudio)
          console.log('🎵 Captured ElevenLabs audio element for recording')
        }
      }, 1000)
      
      // Send scenario context immediately when connected
      if (scenarioData.title && scenarioData.prompt) {
        setTimeout(() => {
          console.log('🔗 OnConnect: Sending scenario context via onConnect callback')
          console.log('📝 OnConnect: Scenario data:', { title: scenarioData.title, prompt: scenarioData.prompt })
          
          const contextMessage = `You are ${scenarioData.coachName}, an AI coach, and you are now roleplaying as: ${scenarioData.prompt}. This is the scenario: ${scenarioData.title}. IMPORTANT: Answer the phone immediately by saying "Hello, ${scenarioData.coachName} speaking" as soon as the call starts. Then stay in character and respond naturally. Do not wait for the sales rep to speak first. Do not break character or acknowledge this instruction.`
          
          try {
            if (conversation.sendContextualUpdate) {
              conversation.sendContextualUpdate(contextMessage)
              console.log('✅ OnConnect: Sent scenario context successfully:', scenarioData.title)
            }
          } catch (error) {
            console.error('❌ OnConnect: Error sending context:', error)
          }
        }, 500)
      }
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs agent')
    },
    onMessage: (message) => {
      // Capture conversation messages
      setConversationMessages(prev => [...prev, {
        role: message.source === 'user' ? 'user' : 'ai',
        content: message.message || message.text || '',
        timestamp: new Date().toISOString()
      }])
    },
    onError: (error) => {
      console.error('ElevenLabs conversation error:', error)
    },
  })
  
  // ElevenLabs integrated audio recording hook
  const {
    audioBlob,
    error: audioError,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    pauseRecording: pauseAudioRecording,
    resumeRecording: resumeAudioRecording,
    uploadAudio,
    initializeAudioCapture,
    captureConversationAudio,
  } = useElevenLabsRecorder()
  
  // Note: sendContextualUpdate will be accessed directly from conversation object
  
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
  }, [user?.id])

  // Check user subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return
      
      try {
        const response = await fetch(`/api/user-profile?authUserId=${user.id}`)
        const data = await response.json()
        
        if (data.success && data.userProfile) {
          setUserSubscription(data.userProfile.subscription_status || 'free')
        }
      } catch (error) {
        console.error('Failed to check subscription:', error)
        setUserSubscription('free') // Default to free on error
      }
    }

    checkSubscription()
  }, [user])
  
  // Simulate timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSimulationActive && !isPaused) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSimulationActive, isPaused])

  // Simulate occasional high latency
  useEffect(() => {
    const interval = setInterval(() => {
      setHighLatency(Math.random() > 0.9)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Load selected IVY scenario from localStorage
  useEffect(() => {
    const selectedIvyScenario = localStorage.getItem('selectedIvyScenario')
    if (selectedIvyScenario) {
      try {
        const parsed = JSON.parse(selectedIvyScenario)
        setScenarioData({
          title: parsed.title,
          prompt: parsed.prompt,
          coachName: parsed.coachName || 'Ivy',
          timestamp: parsed.timestamp || Date.now()
        })
        setSaveReuse(false) // Don't auto-save when loading existing scenario
        
        // If this is an assignment, store the assignment ID
        if (parsed.assignmentId) {
          localStorage.setItem('currentAssignmentId', parsed.assignmentId)
        }
        
        localStorage.removeItem('selectedIvyScenario')
      } catch (error) {
        console.error('Failed to load selected IVY scenario:', error)
      }
    }
  }, [user])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const saveScenarioToDatabase = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save scenarios.",
        variant: "destructive",
      })
      return false
    }

    if (!scenarioData.title || !scenarioData.prompt || !scenarioData.coachName) {
      toast({
        title: "Missing Information",
        description: "Please fill in the scenario title, description, and coach name.",
        variant: "destructive",
      })
      return false
    }

    setIsSaving(true)
    
    try {
      // Get auth token for API request
      const { getAuthToken } = await import('@/lib/api-client');
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated - please sign in again');
      }

      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: scenarioData.title,
          prompt: scenarioData.prompt,
          coachName: scenarioData.coachName,
          prospectName: 'Ivy Scenario Builder', // Default prospect name for IVY scenarios
          voice: 'ivy-voice', // Identifier for IVY voice scenarios
          scenarioType: 'ivy', // Add identifier for IVY scenarios
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Scenario Saved",
          description: "Your IVY scenario has been saved successfully.",
        })
        console.log('IVY Scenario saved:', result)
        return true
      } else {
        const error = await response.text()
        throw new Error(error)
      }
    } catch (error) {
      console.error('Failed to save IVY scenario:', error)
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save scenario. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleStartSimulation = async () => {
    console.log('🚀 Starting simulation with scenario data:', scenarioData)
    
    // Check if user is enterprise - if not, show contact modal
    if (userSubscription !== 'enterprise') {
      setContactModalOpen(true)
      return
    }
    
    // Validate required fields
    if (!scenarioData.title || !scenarioData.prompt || !scenarioData.coachName) {
      toast({
        title: "Missing Information",
        description: "Please fill in the scenario title, prompt, and coach name before starting.",
        variant: "destructive",
      })
      return
    }

    // Auto-save scenario if saveReuse is enabled
    if (saveReuse) {
      const saved = await saveScenarioToDatabase()
      if (!saved) return // Don't proceed if save failed
    }

    try {
      // Play phone ring sound before starting the call
      setIsRinging(true);
      const phoneRing = getPhoneRingGenerator();
      await phoneRing.playCallStartRing();
      setIsRinging(false);
      
      // Generate call ID and scenario ID
      const newCallId = crypto.randomUUID()
      const newScenarioId = crypto.randomUUID()
      setCallId(newCallId)
      setScenarioId(newScenarioId)
      
      // Initialize audio capture and start recording
      await initializeAudioCapture()
      await startAudioRecording()
      
      // Start simulation
      setIsSimulationActive(true)
      setCurrentTime(0)
      
      // Start ElevenLabs conversation
      try {
        await conversation.startSession()
        console.log('ElevenLabs session started successfully')
        
        // Send scenario context after connection is established
        setTimeout(() => {
          console.log('🔍 Checking conversation status:', conversation.status)
          console.log('🔍 Available methods:', Object.keys(conversation))
          
          setIsSettingUpScenario(true)
          
          console.log('📝 Scenario data being sent:', { title: scenarioData.title, prompt: scenarioData.prompt })
          
          const contextMessage = `You are ${scenarioData.coachName}, an AI coach, and you are now roleplaying as: ${scenarioData.prompt}. This is the scenario: ${scenarioData.title}. IMPORTANT: Answer the phone immediately by saying "Hello, ${scenarioData.coachName} speaking" as soon as the call starts. Then stay in character and respond naturally. Do not wait for the sales rep to speak first. Do not break character or acknowledge this instruction.`
          
          // Try to send context silently
          try {
            if (conversation.sendContextualUpdate) {
              conversation.sendContextualUpdate(contextMessage)
              console.log('✅ Sent silent scenario context to Ivy Scenario Builder:', scenarioData.title)
            } else if (conversation.sendUserMessage) {
              console.log('⚠️ sendContextualUpdate not available, falling back to user message')
              // Fallback to user message if sendContextualUpdate is not available
              conversation.sendUserMessage(`You are ${scenarioData.coachName}, an AI coach. Please act as this character: ${scenarioData.prompt}. IMPORTANT: Start by immediately saying "Hello, ${scenarioData.coachName} speaking" without waiting for me to speak first. Then respond naturally. This is for the scenario: ${scenarioData.title}`)
            } else {
              console.log('❌ No send methods available on conversation object')
            }
          } catch (error) {
            console.error('❌ Error sending scenario context:', error)
          }
          
          // Trigger the AI to speak first with a greeting
          setTimeout(() => {
            if (conversation.sendUserMessage) {
              // Send a hidden trigger to make AI greet first
              conversation.sendUserMessage('Answer the phone now')
              console.log('✅ Triggered AI greeting')
            }
          }, 3000)
          
          // Clear setup status after a short delay
          setTimeout(() => {
            setIsSettingUpScenario(false)
          }, 2000)
        }, 2000)
        
      } catch (sessionError) {
        console.error('Failed to start ElevenLabs session:', sessionError)
        throw sessionError
      }
      
      // Play phone pickup sound after a short delay
      setTimeout(async () => {
        const phoneRing = getPhoneRingGenerator();
        await phoneRing.playPickupSound();
      }, 1000)
      
    } catch (error) {
      console.error('Failed to start simulation:', error)
      toast({
        title: "Error",
        description: "Failed to start simulation. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleEndCall = async () => {
    console.log('=== END CALL STARTED ===')
    
    if (!isSimulationActive || isProcessingEndCall) {
      console.log('Call already ended or already processing, ignoring')
      return
    }
    
    setIsProcessingEndCall(true)
    setIsSimulationActive(false)
    setIsPaused(false)
    setAnalysisProgress('Stopping recording...')
    
    try {
      // Stop ElevenLabs conversation
      await conversation.endSession()
      console.log('ElevenLabs conversation ended')
      
      // Stop audio recording
      console.log('Stopping audio recording...')
      stopAudioRecording()
      console.log('Audio recording stopped')
      
      // Get assignment ID before any potential cleanup
      const currentAssignmentId = localStorage.getItem('currentAssignmentId')
      
      let audioUrl = null
      
      // Upload audio if we have data
      if (callId && user) {
        setAnalysisProgress('Processing audio recording...')
        
        try {
          setAnalysisProgress('Uploading audio file...')
          console.log('Attempting audio upload...')
          
          // The uploadAudio function handles blob creation from chunks internally
          const result = await uploadAudio({
            userId: actualUserId || '',
            scenarioId,
            callId,
            timestamp: new Date().toISOString(),
          })
          
          if (result.success) {
            console.log('Audio uploaded successfully:', result.audioUrl)
            audioUrl = result.audioUrl
          } else {
            console.error('Failed to upload audio:', result.error)
            console.log('Continuing without audio URL - call data will still be saved')
          }
        } catch (error) {
          console.error('Error uploading audio:', error)
          console.log('Continuing without audio URL - call data will still be saved')
        }
      }
      
      // Analyze and score call data
      if (user) {
        try {
          setAnalysisProgress('Analyzing conversation with AI...')
          
          // Get conversation history from ElevenLabs
          const conversationHistory = conversationMessages.map(msg => ({
            speaker: msg.role === 'user' ? 'rep' : 'prospect',
            message: msg.content,
            timestamp: msg.timestamp
          }))
          
          // Use the assignment ID we retrieved earlier
          if (currentAssignmentId) {
            console.log('🎯 IVY: Saving call for assignment:', currentAssignmentId)
          }
          
          // Save call data and get scoring
          const saveResponse = await fetch('/api/save-call', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              callId: callId,
              transcript: conversationHistory,
              repId: actualUserId,
              scenarioName: scenarioData.title,
              scenarioPrompt: scenarioData.prompt,
              duration: currentTime,
              audioUrl: audioUrl,
              conversationHistory: conversationHistory,
              assignmentId: currentAssignmentId || undefined, // Include assignment ID if exists
              scoreOnly: false
            }),
          })
          
          let scoringResult = {
            score: 0,
            feedback: [],
            talkRatio: 0,
            objectionsHandled: 0,
            ctaUsed: false,
            sentiment: 'neutral',
            enhancedScoring: null
          }
          
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json()
            scoringResult = {
              score: saveResult.score || 0,
              feedback: saveResult.feedback || [],
              talkRatio: saveResult.talk_ratio || 0,
              objectionsHandled: saveResult.objections_handled || 0,
              ctaUsed: saveResult.cta_used || false,
              sentiment: saveResult.sentiment || 'neutral',
              enhancedScoring: saveResult.enhancedScoring || null
            }
            
            // Clear assignment ID if this was an assignment (call was successfully saved)
            if (currentAssignmentId) {
              localStorage.removeItem('currentAssignmentId')
              console.log('✅ IVY Assignment completed and ID cleared:', currentAssignmentId)
            }
          }
          
          const tempCallData = {
            callId: callId,
            transcript: conversationHistory,
            repId: actualUserId,
            scenarioName: scenarioData.title,
            scenarioPrompt: scenarioData.prompt,
            duration: currentTime,
            audioUrl: audioUrl,
            conversationHistory: conversationHistory,
            created_at: new Date().toISOString(),
            isSaved: false,
            score: scoringResult.score,
            feedback: scoringResult.feedback,
            talk_ratio: scoringResult.talkRatio,
            objections_handled: scoringResult.objectionsHandled,
            cta_used: scoringResult.ctaUsed,
            sentiment: scoringResult.sentiment,
            enhanced_scoring: scoringResult.enhancedScoring,
            enhancedScoring: scoringResult.enhancedScoring
          }
          
          sessionStorage.setItem(`temp_call_${callId}`, JSON.stringify(tempCallData))
          setAnalysisProgress('Analysis complete! Preparing review...')
          
        } catch (error) {
          console.error('Error analyzing call data:', error)
          setAnalysisProgress('Analysis complete with errors')
        }
      }
      
      setAnalysisProgress('Complete! Redirecting...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Open review modal
      setReviewModalOpen(true)
      setReviewCallId(callId)
      
    } catch (error) {
      console.error('Error ending call:', error)
      setIsProcessingEndCall(false)
      setReviewModalOpen(true)
      setReviewCallId(callId)
    }
  }

  return (
    <div className="space-y-6 relative">
      {/* Loading Overlay for Call Analysis */}
      {isProcessingEndCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="w-full max-w-md mx-4 bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 relative">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">Analyzing Your Call</h3>
                <p className="text-sm text-slate-500">
                  {analysisProgress || 'Processing...'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{
                      width: analysisProgress.includes('Stopping') ? '20%' :
                             analysisProgress.includes('Processing') ? '40%' :
                             analysisProgress.includes('Uploading') ? '60%' :
                             analysisProgress.includes('Analyzing') ? '80%' :
                             analysisProgress.includes('Complete') ? '100%' : '10%'
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  AI is analyzing your conversation and generating personalized feedback
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 mb-1 flex items-center">
              <Bot className="h-6 w-6 text-blue-600 mr-2" />
              Ivy Scenario Builder - Voice Simulation
            </h1>
            <p className="text-sm text-slate-500">
              Enterprise hands-free voice training with advanced AI
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-0.5">
              Enterprise
            </Badge>
            <Badge 
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                connectionStatus === 'connected' 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <Wifi className="mr-1 h-3 w-3" />
              ) : (
                <WifiOff className="mr-1 h-3 w-3" />
              )}
              {connectionStatus}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Access Control Notice */}
      {userSubscription !== null && userSubscription !== 'enterprise' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Enterprise Feature:</strong> Ivy Scenario Builder's hands-free voice simulation is available for Enterprise customers only. 
              Upgrade your plan to access this premium feature.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Error Alerts */}
      {audioError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl border border-red-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-sm text-slate-900">
                {audioError}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleStartSimulation}
              className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              Retry Recording
            </Button>
          </div>
        </motion.div>
      )}

      {/* High Latency Alert */}
      {highLatency && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl border border-amber-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <WifiOff className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm text-slate-900">High latency detected. Voice quality may be affected.</span>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Simulation Area */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-2"
        >
          {!isSimulationActive ? (
            /* Scenario Builder */
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
              <div className="mb-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Setup Your Scenario</h3>
                    <p className="text-sm text-slate-500">Create your sales scenario for Ivy Scenario Builder to roleplay</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="save-reuse"
                      checked={saveReuse}
                      onCheckedChange={(checked) => setSaveReuse(checked)}
                      disabled={userSubscription !== 'enterprise'}
                    />
                    <Label htmlFor="save-reuse" className="text-sm text-slate-700">Save for reuse</Label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Scenario Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Enterprise Software Demo Call"
                    value={scenarioData.title}
                    onChange={(e) => {
                      console.log('📝 Title changed to:', e.target.value)
                      setScenarioData(prev => ({ ...prev, title: e.target.value }))
                    }}
                    className="rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
                    disabled={userSubscription !== 'enterprise'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coachName" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Name</Label>
                  <Input
                    id="coachName"
                    placeholder="e.g., Sarah, Marcus, Jennifer"
                    value={scenarioData.coachName}
                    onChange={(e) => {
                      console.log('📝 Coach name changed to:', e.target.value)
                      setScenarioData(prev => ({ ...prev, coachName: e.target.value }))
                    }}
                    className="rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
                    disabled={userSubscription !== 'enterprise'}
                  />
                  <p className="text-xs text-slate-500">The AI will introduce itself with this name (e.g., "Hello, Sarah speaking")</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Prospect & Scenario Instructions</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe your prospect and scenario for Ivy Scenario Builder to roleplay..."
                    className="min-h-[175px] rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
                    value={scenarioData.prompt}
                    onChange={(e) => {
                      console.log('📝 Prompt changed to:', e.target.value)
                      setScenarioData(prev => ({ ...prev, prompt: e.target.value }))
                    }}
                    disabled={userSubscription !== 'enterprise'}
                  />
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <Button
                    onClick={handleStartSimulation}
                    disabled={!scenarioData.title || !scenarioData.prompt || !scenarioData.coachName || userSubscription !== 'enterprise' || isSaving}
                    className="w-full rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 font-medium"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Start Voice Simulation'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Active Simulation */
            <div className="h-[500px] bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-8 flex flex-col">
              {/* Voice Waveform Visualization */}
              <div className="flex items-center justify-center space-x-2 mb-8">
                <AudioWaveform 
                  isRecording={conversation.isSpeaking || false}
                  isPaused={false}
                  className="h-20"
                />
              </div>

              {/* AI Status */}
              <div className="text-center mb-8 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {conversation.isSpeaking ? (
                    <Volume2 className="h-5 w-5 text-primary" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-lg font-medium text-slate-900">
                    {conversation.isSpeaking ? 'Ivy Scenario Builder Speaking...' : 'Ivy Scenario Builder Listening...'}
                  </span>
                  <Badge className="ml-2 rounded-full px-3 py-1 bg-blue-500/10 text-blue-600 text-sm font-medium">
                    <Mic className="mr-1 h-3 w-3" />
                    Hands-Free
                  </Badge>
                </div>
                
                {/* Conversation Status */}
                {showSubtitles && (
                  <div className="min-h-[60px] flex items-center justify-center">
                    <p className="text-slate-500 max-w-md text-center">
                      {isSettingUpScenario 
                        ? 'Ivy Scenario Builder is preparing for your scenario...' 
                        : conversation.status === 'connected' 
                          ? 'Ready! Ivy Scenario Builder is in character. Start your conversation.' 
                          : 'Connecting to Ivy Scenario Builder...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Controls Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Timer and Controls */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-primary mb-2">
                {formatTime(currentTime)}
              </div>
              <p className="text-sm text-slate-500">Call Duration</p>
            </div>

            <div className="space-y-3">
              {!isSimulationActive ? (
                isRinging ? (
                  <Button
                    disabled
                    className="w-full rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm px-6 py-2.5 font-medium relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
                    <div className="relative flex items-center justify-center">
                      <div className="mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Calling...</span>
                    </div>
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartSimulation}
                    disabled={!scenarioData.title || !scenarioData.prompt || !scenarioData.coachName || userSubscription !== 'enterprise' || isSaving}
                    className="w-full rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 font-medium"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Start Call'}
                  </Button>
                )
              ) : (
                <>
                  <Button
                    onClick={() => {
                      if (isPaused) {
                        setIsPaused(false)
                        resumeAudioRecording()
                      } else {
                        setIsPaused(true)
                        pauseAudioRecording()
                      }
                    }}
                    variant="outline"
                    className="w-full rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    {isPaused ? (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleEndCall}
                    disabled={isProcessingEndCall}
                    className="w-full rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-sm"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    {isProcessingEndCall ? 'Ending Call...' : 'End Call'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Voice Simulation Instructions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-1 text-center">Hands-Free Voice</h3>
              <div className="space-y-3 text-sm">
                <div className="text-xs text-slate-500 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p>• Just speak naturally to Ivy Scenario Builder</p>
                  <p>• No buttons needed during conversation</p>
                  <p>• Ivy Scenario Builder responds in real-time</p>
                  <p>• Full conversation is recorded</p>
                  <p>• AI coaching provided at the end</p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Save for Reuse</span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  saveReuse ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                }`}>
                  {saveReuse ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="subtitles" className="text-sm text-slate-700">Show Status</Label>
                <Switch
                  id="subtitles"
                  checked={showSubtitles}
                  onCheckedChange={setShowSubtitles}
                />
              </div>
              
              <Button 
                variant="outline" 
                className="w-full rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm" 
                onClick={() => {
                  console.log('Resetting conversation...')
                  if (conversation.status === 'connected') {
                    conversation.endSession()
                  }
                  setCurrentTime(0)
                  setIsSimulationActive(false)
                  setIsPaused(false)
                }}
                disabled={!isSimulationActive}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Conversation
              </Button>
            </div>
          </div>

          {/* Scenario Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Scenario Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Title:</span>
                  <span className="text-right max-w-[150px] truncate text-slate-900 font-medium">
                    {scenarioData.title || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Type:</span>
                  <Badge className="rounded-full px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium">
                    Voice Simulation
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mode:</span>
                  <Badge className="rounded-full px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium">
                    Hands-Free
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">AI Coach:</span>
                  <span className="text-slate-900">{scenarioData.coachName || 'Ivy Scenario Builder'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false)
          setReviewCallId(null)
          setIsProcessingEndCall(false)
          setAnalysisProgress('')
          if (reviewCallId) {
            sessionStorage.removeItem(`temp_call_${reviewCallId}`)
          }
          setCurrentTime(0)
          setIsSimulationActive(false)
          setIsPaused(false)
          
          setTimeout(() => {
            console.log('🏠 Redirecting to dashboard after call completion')
            try {
              router.push('/dashboard')
            } catch (error) {
              console.warn('Router failed, using window.location:', error)
              window.location.href = '/dashboard'
            }
          }, 100)
        }}
        callId={reviewCallId}
        title={scenarioData.title}
      />

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title="Try Ivy Scenario Builder - Enterprise Voice Simulation"
        subtitle="Experience hands-free voice training with our advanced AI. Contact our sales team to get started."
      />
    </div>
  )
}