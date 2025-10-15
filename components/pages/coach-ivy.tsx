'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { useConversation } from '@elevenlabs/react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { AudioWaveform } from '@/components/ui/audio-waveform'
import { CoachingReportModal } from '@/components/ui/coaching-report-modal'
import { ContactModal } from '@/components/ui/contact-modal'
import { useToast } from '@/hooks/use-toast'
import { useSimulationLimit } from '@/hooks/use-simulation-limit'
import { getPhoneRingGenerator } from '@/lib/phone-ring-generator'
import { useRouter } from 'next/navigation'
import { Bot, Mic, Pause, Play, Square, Volume2, VolumeX, AlertCircle, Zap, RotateCcw, WifiOff, Wifi, MessageSquare, User } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface ConversationMessage {
  role: 'user' | 'ai'
  content: string
  timestamp: string
}

export function CoachIvyPage() {
  const { user } = useSupabaseAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { checkSimulationLimit } = useSimulationLimit()
  
  // Subscription and access control
  const [userSubscription, setUserSubscription] = useState<'free' | 'paid' | 'enterprise' | null>(null)
  const [actualUserId, setActualUserId] = useState<string | null>(null)
  
  // Session state
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showTranscript, setShowTranscript] = useState(true)
  const [sessionId, setSessionId] = useState<string>('')
  const [isProcessingEndSession, setIsProcessingEndSession] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<string>('')
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportSessionId, setReportSessionId] = useState<string | null>(null)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([])
  
  // Connection status simulation
  const [connectionStatus] = useState<'connected' | 'disconnected' | 'poor'>('connected')
  const [highLatency, setHighLatency] = useState(false)

  // ElevenLabs conversation hook with Coach Ivy agent
  const conversation = useConversation({
    agentId: 'agent_1801k6jtt0e1ezgbn6kqtx9dbayr', // Coach Ivy agent ID
    onConnect: () => {
      console.log('Connected to Coach Ivy agent')
      setIsConnecting(false)
      
    },
    onDisconnect: () => {
      console.log('Disconnected from Coach Ivy agent')
      setIsConnecting(false)
    },
    onMessage: (message) => {
      // Capture conversation messages for transcript
      const newMessage: ConversationMessage = {
        role: message.source === 'user' ? 'user' : 'ai',
        content: message.message || message.text || '',
        timestamp: new Date().toISOString()
      }
      setConversationMessages(prev => [...prev, newMessage])
    },
    onError: (error) => {
      console.error('ElevenLabs conversation error:', error)
      setIsConnecting(false)
    },
  })
  
  const [audioError] = useState<string | null>(null)
  
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
        setUserSubscription('free')
      }
    }

    checkSubscription()
  }, [user])
  
  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSessionActive && !isPaused) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSessionActive, isPaused])

  // Simulate occasional high latency
  useEffect(() => {
    const interval = setInterval(() => {
      setHighLatency(Math.random() > 0.9)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  const handleStartSession = async () => {
    console.log('🚀 Starting Coach Ivy session')
    
    // Check simulation limits first
    console.log('🔍 Checking simulation limits for Coach Ivy...')
    const limitData = await checkSimulationLimit()
    
    if (!limitData) {
      toast({
        title: "Error",
        description: "Unable to verify simulation limits. Please try again.",
        variant: "destructive"
      })
      return
    }
    
    if (!limitData.canSimulate) {
      toast({
        title: "Simulation Limit Reached",
        description: limitData.message || "You've reached your simulation limit. Upgrade to continue practicing!",
        variant: "destructive"
      })
      return
    }
    
    // Check if user is enterprise - if not, show contact modal
    if (userSubscription !== 'enterprise') {
      setContactModalOpen(true)
      return
    }

    try {
      setIsConnecting(true)
      
      // Generate session ID
      const newSessionId = crypto.randomUUID()
      setSessionId(newSessionId)
      
      // Start session
      setIsSessionActive(true)
      setCurrentTime(0)
      setConversationMessages([])
      
      // Start ElevenLabs conversation
      try {
        await conversation.startSession()
        console.log('Coach Ivy session started successfully')
        
      } catch (sessionError) {
        console.error('Failed to start Coach Ivy session:', sessionError)
        setIsConnecting(false)
        throw sessionError
      }
      
    } catch (error) {
      console.error('Failed to start session:', error)
      setIsConnecting(false)
      toast({
        title: "Error",
        description: "Failed to start coaching session. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleEndSession = async () => {
    console.log('=== END SESSION STARTED ===')
    
    if (!isSessionActive || isProcessingEndSession) {
      console.log('Session already ended or already processing, ignoring')
      return
    }
    
    setIsProcessingEndSession(true)
    setIsSessionActive(false)
    setIsPaused(false)
    setAnalysisProgress('Ending session...')
    
    try {
      // Stop ElevenLabs conversation
      await conversation.endSession()
      console.log('Coach Ivy conversation ended')
      
      setAnalysisProgress('Processing session...')
      
      // Save coaching session
      if (user && sessionId) {
        try {
          setAnalysisProgress('Generating coaching report...')
          
          // Save coaching session
          const saveResponse = await fetch('/api/save-coaching-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: sessionId,
              userId: actualUserId,
              title: 'Coach Ivy Session',
              sessionType: 'coaching',
              transcript: conversationMessages,
              duration: currentTime
            }),
          })
          
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json()
            
            // Store the coaching summary for the modal
            const tempSessionData = {
              sessionId: sessionId,
              coachingSummary: saveResult.coachingSummary,
              created_at: new Date().toISOString()
            }
            
            sessionStorage.setItem(`temp_session_${sessionId}`, JSON.stringify(tempSessionData))
            setAnalysisProgress('Coaching report ready!')
          } else {
            console.error('Failed to save coaching session')
            setAnalysisProgress('Session saved with errors')
          }
          
        } catch (error) {
          console.error('Error saving coaching session:', error)
          setAnalysisProgress('Session complete with errors')
        }
      }
      
      setAnalysisProgress('Complete! Redirecting...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Open coaching report modal
      setReportModalOpen(true)
      setReportSessionId(sessionId)
      
    } catch (error) {
      console.error('Error ending session:', error)
      setIsProcessingEndSession(false)
      setReportModalOpen(true)
      setReportSessionId(sessionId)
    }
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6 relative">
      {/* Loading Overlay for Session Analysis */}
      {isProcessingEndSession && (
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
                <h3 className="text-lg font-semibold text-slate-900">Processing Your Session</h3>
                <p className="text-sm text-slate-500">
                  {analysisProgress || 'Processing...'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{
                      width: analysisProgress.includes('Ending') ? '25%' :
                             analysisProgress.includes('Processing') ? '50%' :
                             analysisProgress.includes('Uploading') ? '75%' :
                             analysisProgress.includes('Saving') ? '90%' :
                             analysisProgress.includes('Complete') ? '100%' : '10%'
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Saving your coaching session and preparing insights
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
              <Bot className="h-6 w-6 text-teal-600 mr-2" />
              Coach Ivy - AI Sales Coach
            </h1>
            <p className="text-sm text-slate-500">
              Get personalized coaching, do deal reviews, and prep for important calls
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-xs px-2 py-0.5">
              Enterprise
            </Badge>
            <Badge 
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                connectionStatus === 'connected' 
                  ? 'bg-teal-50 text-teal-700' 
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
              <strong>Enterprise Feature:</strong> Coach Ivy is available for Enterprise customers only. 
              Upgrade your plan to access this premium coaching feature.
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
              onClick={handleStartSession}
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
        {/* Main Session Area */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-2"
        >
          {!isSessionActive ? (
            /* Start Session Screen */
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-8">
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center">
                  <Bot className="h-10 w-10 text-teal-600" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900">Ready to Coach</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Coach Ivy is ready to help you with sales coaching, deal reviews, call preparation, and more. 
                    Just start a session and tell Coach Ivy how you'd like to be helped.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-1">Sales Coaching</h4>
                    <p className="text-slate-500 text-xs">Get personalized feedback and improve your techniques</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-1">Deal Reviews</h4>
                    <p className="text-slate-500 text-xs">Analyze opportunities and plan next steps</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-1">Call Prep</h4>
                    <p className="text-slate-500 text-xs">Practice and prepare for important conversations</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-1">Strategy</h4>
                    <p className="text-slate-500 text-xs">Develop account plans and sales strategies</p>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Active Session */
            <div className="h-[500px] bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-8 flex flex-col">
              {/* Voice Waveform Visualization */}
              <div className="flex items-center justify-center space-x-2 mb-6">
                <AudioWaveform 
                  isRecording={conversation.isSpeaking || false}
                  isPaused={false}
                  className="h-16"
                />
              </div>

              {/* Coach Status */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {conversation.isSpeaking ? (
                    <Volume2 className="h-5 w-5 text-teal-600" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-lg font-medium text-slate-900">
                    {conversation.isSpeaking ? 'Coach Ivy Speaking...' : 'Coach Ivy Listening...'}
                  </span>
                  <Badge className="ml-2 rounded-full px-3 py-1 bg-teal-500/10 text-teal-600 text-sm font-medium">
                    <Mic className="mr-1 h-3 w-3" />
                    Live
                  </Badge>
                </div>
                
                {/* Session Status */}
                <div className="min-h-[40px] flex items-center justify-center">
                  <p className="text-slate-500 max-w-md text-center">
                    {conversation.status === 'connected' 
                      ? 'Coach Ivy is ready! Ask about coaching, deal reviews, call prep, or strategy.' 
                      : 'Connecting to Coach Ivy...'}
                  </p>
                </div>
              </div>

              {/* Live Transcript */}
              {showTranscript && conversationMessages.length > 0 && (
                <div className="flex-1 border-t border-slate-100 pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Live Transcript</span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {conversationMessages.slice(-6).map((message, index) => (
                      <div key={index} className="flex items-start space-x-2 text-sm">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'user' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-teal-100 text-teal-600'
                        }`}>
                          {message.role === 'user' ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-slate-700">
                              {message.role === 'user' ? 'You' : 'Coach Ivy'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatMessageTime(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-600 break-words">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              <div className="text-3xl font-bold text-teal-600 mb-2">
                {formatTime(currentTime)}
              </div>
              <p className="text-sm text-slate-500">Session Duration</p>
            </div>

            <div className="space-y-3">
              {!isSessionActive ? (
                isConnecting ? (
                  <Button
                    disabled
                    className="w-full rounded-xl bg-white hover:bg-slate-50 text-teal-600 border border-teal-600/20 shadow-sm px-6 py-2.5 font-medium relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-teal-600/10 animate-pulse"></div>
                    <div className="relative flex items-center justify-center">
                      <div className="mr-2 h-4 w-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </div>
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartSession}
                    disabled={userSubscription !== 'enterprise'}
                    className="w-full rounded-xl bg-white hover:bg-slate-50 text-teal-600 border border-teal-600/20 shadow-sm px-6 py-2.5 font-medium"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Session
                  </Button>
                )
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setIsPaused(!isPaused)
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
                    onClick={handleEndSession}
                    disabled={isProcessingEndSession}
                    className="w-full rounded-2xl bg-white hover:bg-slate-50 text-red-600 border border-red-600/20 shadow-sm"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    {isProcessingEndSession ? 'Ending Session...' : 'End Session'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Coach Ivy Instructions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-1 text-center">AI Sales Coach</h3>
              <div className="space-y-3 text-sm">
                <div className="text-xs text-slate-500 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p>• Tell Coach Ivy how you need help</p>
                  <p>• Ask for coaching on specific skills</p>
                  <p>• Review deals and opportunities</p>
                  <p>• Practice for important calls</p>
                  <p>• Get strategic sales advice</p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="transcript" className="text-sm text-slate-700">Show Transcript</Label>
                <Switch
                  id="transcript"
                  checked={showTranscript}
                  onCheckedChange={setShowTranscript}
                />
              </div>
              
              <Button 
                variant="outline" 
                className="w-full rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm" 
                onClick={() => {
                  console.log('Resetting session...')
                  if (conversation.status === 'connected') {
                    conversation.endSession()
                  }
                  setCurrentTime(0)
                  setIsSessionActive(false)
                  setIsPaused(false)
                  setConversationMessages([])
                }}
                disabled={!isSessionActive}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Session
              </Button>
            </div>
          </div>

          {/* Session Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Session Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Type:</span>
                  <Badge className="rounded-full px-3 py-1 bg-teal-100 text-teal-700 text-xs font-medium">
                    Coaching Session
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mode:</span>
                  <Badge className="rounded-full px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium">
                    Voice Chat
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">AI Coach:</span>
                  <span className="text-slate-900">Coach Ivy</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Messages:</span>
                  <span className="text-slate-900">{conversationMessages.length}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Coaching Report Modal */}
      <CoachingReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false)
          setReportSessionId(null)
          setIsProcessingEndSession(false)
          setAnalysisProgress('')
          if (reportSessionId) {
            sessionStorage.removeItem(`temp_session_${reportSessionId}`)
          }
          setCurrentTime(0)
          setIsSessionActive(false)
          setIsPaused(false)
          setConversationMessages([])
          
          setTimeout(() => {
            console.log('🏠 Redirecting to dashboard after session completion')
            try {
              router.push('/dashboard')
            } catch (error) {
              console.warn('Router failed, using window.location:', error)
              window.location.href = '/dashboard'
            }
          }, 100)
        }}
        sessionId={reportSessionId}
        title="Coach Ivy Session"
      />

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title="Try Coach Ivy - AI Sales Coach"
        subtitle="Get personalized coaching from our advanced AI sales coach. Contact our sales team to get started."
      />
    </div>
  )
}