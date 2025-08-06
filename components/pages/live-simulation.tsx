'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mic, MicOff, Pause, Play, Square, MessageSquare, Wifi, WifiOff, Volume2, VolumeX, AlertCircle, Zap, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useVoiceStreaming } from '@/hooks/use-voice-streaming'
import { useVoiceTranscription } from '@/hooks/use-voice-transcription'
import { useAuth } from '@/components/auth-provider'
import { AudioWaveform } from '@/components/ui/audio-waveform'

interface ScenarioData {
  title: string
  prompt: string
  callType: string
  difficulty: number
  seniority: string
  duration: string
  voice: string
  enableStreaming: boolean
  timestamp: number
}

export function LiveSimulation() {
  const router = useRouter()
  const { user } = useAuth()
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [highLatency, setHighLatency] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'poor'>('connected')
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [callId, setCallId] = useState<string>('')
  const [scenarioId, setScenarioId] = useState<string>('')
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null)
  
  // Load scenario data from localStorage
  useEffect(() => {
    const savedScenario = localStorage.getItem('currentScenario')
    if (savedScenario) {
      try {
        const parsed = JSON.parse(savedScenario)
        setScenarioData(parsed)
        console.log('Loaded scenario data:', parsed)
      } catch (error) {
        console.error('Failed to parse scenario data:', error)
        // Fallback to default scenario
        setScenarioData({
          title: 'Default Sales Scenario',
          prompt: "You are a potential customer in a sales roleplay scenario. Respond naturally and realistically to the sales representative. Keep responses conversational and appropriate.",
          callType: 'discovery-outbound',
          difficulty: 3,
          seniority: 'manager',
          duration: '20',
          voice: 'professional-male',
          enableStreaming: true,
          timestamp: Date.now()
        })
      }
    } else {
      // No scenario data, redirect back to builder
      router.push('/scenario-builder')
    }
  }, [router])

  // Generate enhanced scenario prompt based on parameters
  const generateEnhancedPrompt = (basePrompt: string, data: ScenarioData) => {
    const difficultyLevels = {
      1: 'very cooperative, shares information freely, minimal pushback',
      2: 'somewhat cooperative, shares basic information, some hesitation',
      3: 'moderately cooperative, shares relevant info, asks for clarification when needed',
      4: 'somewhat guarded, shares info selectively, asks many clarifying questions',
      5: 'very guarded, shares minimal info, requires significant trust-building'
    }

    const seniorityLevels = {
      'junior': 'junior employee, handles day-to-day tasks, focused on immediate needs and budget constraints',
      'manager': 'middle manager, manages team operations, focused on efficiency and departmental goals',
      'director': 'director-level, oversees strategic initiatives, focused on ROI and team performance',
      'vp': 'VP-level executive, manages company-wide initiatives, focused on business impact and long-term strategy',
      'c-level': 'C-level executive, drives business transformation, focused on competitive advantage and growth'
    }

    const callTypeContexts = {
      'discovery-outbound': 'This is an outbound discovery call. You were not expecting this call but are open to learning about solutions that might help your business.',
      'discovery-inbound': 'This is an inbound discovery call. You showed some initial interest and are exploring if this solution fits your needs.',
      'elevator-pitch': 'This is a brief pitch scenario. You have limited time and need to quickly understand if this is relevant.',
      'objection-handling': 'This is an objection handling practice. You have specific concerns that need to be addressed.'
    }

    return `You are a ${data.seniority} level prospect in a sales discovery call. 

YOUR ROLE: You are the CUSTOMER being called by a sales representative. You answer their discovery questions about your business, challenges, and needs.

YOUR BEHAVIOR:
- ${difficultyLevels[data.difficulty as keyof typeof difficultyLevels] || difficultyLevels[3]}
- ${seniorityLevels[data.seniority as keyof typeof seniorityLevels] || seniorityLevels.manager}
- ${callTypeContexts[data.callType as keyof typeof callTypeContexts] || callTypeContexts['discovery-outbound']}

RESPONSE STYLE:
- Answer questions naturally and conversationally
- Share relevant information about your business when asked
- Be honest about challenges, goals, and constraints
- Keep responses concise (1-2 sentences typically)
- Don't ask questions - just answer what you're asked

REMEMBER: You are the PROSPECT answering discovery questions, not asking them.`
  }
  
  // Scenario configuration with enhanced prompt
  const scenarioConfig = useRef({
    scenarioPrompt: "",
    persona: "",
    voiceSettings: {
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Default ElevenLabs voice
      stability: 0.5,
      similarityBoost: 0.5,
      style: 0.0,
      useSpeakerBoost: true
    },
    enableStreaming: true
  })

  // Update scenario config when data loads
  useEffect(() => {
    if (scenarioData) {
      // Map voice selection to ElevenLabs voice ID
      const voiceMap: { [key: string]: string } = {
        'professional-male': '21m00Tcm4TlvDq8ikWAM',
        'professional-female': 'EXAVITQu4vr4xnSDxMaL',
        'executive-male': 'pNInz6obpgDQGcFmaJgB',
        'executive-female': 'VR6AewLTigWG4xSOukaG',
        'casual-male': 'yoZ06aMxZJJ28mfd3POQ',
        'casual-female': 'ThT5KcBeYPX3keUQqHPh'
      };
      
      scenarioConfig.current = {
        scenarioPrompt: generateEnhancedPrompt(scenarioData.prompt, scenarioData),
        persona: scenarioData.seniority ? `${scenarioData.seniority} Level Prospect` : 'Potential Customer',
        voiceSettings: {
          voiceId: voiceMap[scenarioData.voice] || '21m00Tcm4TlvDq8ikWAM',
          stability: 0.5,
          similarityBoost: 0.5,
          style: 0.0,
          useSpeakerBoost: true
        },
        enableStreaming: scenarioData.enableStreaming
      }
      console.log('Updated scenario config:', scenarioConfig.current)
    }
  }, [scenarioData])
  
  // Audio recording hook
  const {
    isRecording: isAudioRecording,
    isPaused: isAudioPaused,
    audioBlob,
    audioUrl,
    duration: audioDuration,
    error: audioError,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    pauseRecording: pauseAudioRecording,
    resumeRecording: resumeAudioRecording,
    uploadAudio,
  } = useAudioRecorder()

  // Voice streaming hook
  const {
    streamingState,
    conversationHistory,
    currentAIText,
    isStreaming,
    error: streamingError,
    isAISpeaking,
    canRepSpeak,
    startStreaming,
    stopStreaming,
    resetConversation,
  } = useVoiceStreaming()

  // CRITICAL: Track if user has spoken first
  const [userHasSpoken, setUserHasSpoken] = useState(false)

  // Voice transcription hook
  const {
    isTranscribing,
    isListening,
    isPaused: isTranscriptionPaused,
    currentTranscript,
    transcriptionChunks,
    error: transcriptionError,
    startTranscription,
    stopTranscription,
    resetTranscription,
    pauseTranscription,
    resumeTranscription,
    getLatestChunk,
  } = useVoiceTranscription({
    useWhisper: true,
    chunkDuration: 3000, // Shorter chunks for more responsive transcription
    language: 'en',
    continuous: true,
    pauseDuringAISpeech: true
  })

  // Simulate timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  // Handle transcription chunks and trigger streaming
  useEffect(() => {
    const latestChunk = getLatestChunk();
    console.log('Transcription chunks changed:', {
      chunksLength: transcriptionChunks.length,
      isStreaming,
      enableStreaming: scenarioConfig.current.enableStreaming,
      latestChunk: latestChunk,
      latestText: latestChunk?.text,
      isFinal: latestChunk?.isFinal
    });

    // CRITICAL: Only process new chunks if we're still recording and not currently streaming
    // AND only if there's actually a meaningful transcript from the user
    if (isRecording && scenarioConfig.current.enableStreaming && transcriptionChunks.length > 0 && !isStreaming) {
      const latestChunk = getLatestChunk();
      if (latestChunk && latestChunk.isFinal && latestChunk.text.trim()) {
        // Mark that user has spoken
        setUserHasSpoken(true)
        const transcript = latestChunk.text.trim();
        
        // Only respond to complete, meaningful sentences
        const isCompleteSentence = transcript.length > 10 && 
          (transcript.endsWith('.') || transcript.endsWith('?') || transcript.endsWith('!')) &&
          !transcript.startsWith('is to') && 
          !transcript.startsWith('and') &&
          !transcript.startsWith('but') &&
          !transcript.startsWith('so') &&
          !transcript.startsWith('then') &&
          !transcript.startsWith('well') &&
          !transcript.startsWith('um') &&
          !transcript.startsWith('uh');
        
        if (!isCompleteSentence) {
          console.log('Skipping incomplete transcript:', transcript);
          return;
        }
        
        // Check if this is actually something that needs a response
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can you', 'could you', 'would you', 'do you', 'are you', 'tell me', 'explain', 'describe'];
        const isQuestion = questionWords.some(word => transcript.toLowerCase().includes(word)) || transcript.includes('?');
        const isStatement = transcript.length > 15 && !transcript.startsWith('um') && !transcript.startsWith('uh');
        
        if (!isQuestion && !isStatement) {
          console.log('Skipping non-question/non-statement:', transcript);
          return;
        }
        
        // CRITICAL: Only allow AI to respond if user has spoken first
        if (!userHasSpoken) {
          console.log('User has not spoken yet, ignoring transcript:', transcript);
          return;
        }
        
        console.log('Complete transcript received:', transcript);
        
        // Clear any existing silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Wait for a brief silence period to ensure user is done speaking
        silenceTimeoutRef.current = setTimeout(() => {
          if (isRecording && !isStreaming) {
            console.log('Silence period ended, starting AI response with transcript:', latestChunk.text);
            // Pause transcription before starting AI response
            pauseTranscription();
            // Start streaming with the transcribed text
            startStreaming(latestChunk.text, {
              scenarioPrompt: scenarioConfig.current.scenarioPrompt,
              persona: scenarioConfig.current.persona,
              voiceSettings: scenarioConfig.current.voiceSettings,
            });
          }
          silenceTimeoutRef.current = null;
        }, 1500); // Wait 1.5 seconds of silence before responding
      }
    }
  }, [transcriptionChunks, getLatestChunk, startStreaming, isStreaming, pauseTranscription, isRecording]);

  // Handle AI speaking state changes
  useEffect(() => {
    if (isAISpeaking) {
      console.log('AI started speaking, pausing transcription');
      pauseTranscription();
    } else if (!isStreaming && !isAISpeaking && isRecording) {
      console.log('AI stopped speaking, resuming transcription');
      resumeTranscription();
    }
  }, [isAISpeaking, isStreaming, pauseTranscription, resumeTranscription, isRecording]);

  // Prevent AI from responding to its own speech
  useEffect(() => {
    if (isAISpeaking || isStreaming) {
      // Clear any pending silence timeout when AI is speaking
      if (silenceTimeoutRef.current) {
        console.log('Clearing silence timeout because AI is speaking');
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }
  }, [isAISpeaking, isStreaming]);

  // Simulate occasional high latency
  useEffect(() => {
    const interval = setInterval(() => {
      setHighLatency(Math.random() > 0.9)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    if (!user) return
    
    try {
      // Generate call ID with proper UUID format
      const newCallId = crypto.randomUUID()
      console.log('Generated call ID (UUID):', newCallId)
      setCallId(newCallId)
      
      // Generate scenario ID (for demo purposes)
      const newScenarioId = `scenario_${Date.now()}`
      setScenarioId(newScenarioId)
      
      // Start audio recording
      console.log('Starting audio recording...')
      await startAudioRecording()
      console.log('Audio recording started successfully')
      
      // Start transcription if streaming is enabled
      if (scenarioConfig.current.enableStreaming) {
        await startTranscription()
      }
      
      // Start simulation
      setIsRecording(true)
      setCurrentTime(0)
      setUserHasSpoken(false) // Reset user speech flag
      resetConversation() // Clear any previous conversation history
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const handleEndCall = async () => {
    console.log('=== END CALL STARTED ===');
    console.log('Current state:', {
      callId,
      isRecording,
      audioDuration,
      conversationHistoryLength: conversationHistory.length
    });
    
    try {
      // Clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      // Stop audio recording
      console.log('Stopping audio recording...')
      stopAudioRecording()
      console.log('Audio recording stopped')
      
      // Stop transcription and streaming
      if (scenarioConfig.current.enableStreaming) {
        stopTranscription()
        stopStreaming()
      }
      
      // Stop any ongoing speech synthesis
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
      
      // Clear any pending transcription chunks to prevent further AI responses
      resetTranscription()
      
      let audioUrl = null;
      
      // Upload audio if we have a call ID and audio blob
      if (callId && user) {
        // Wait a moment for audio recording to fully stop
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Debug audio recording state
        console.log('Audio recording state:', {
          isRecording,
          audioBlob: !!audioBlob,
          audioBlobSize: audioBlob?.size,
          audioUrl: !!audioUrl,
          duration: audioDuration,
          error: audioError
        });
        
        // Wait a moment for audio recording to fully complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check audio blob again after delay
        console.log('After delay - audioBlob:', !!audioBlob, 'size:', audioBlob?.size);
        
        // Try multiple times to get audio data
        let hasAudioData = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!hasAudioData && retryCount < maxRetries) {
          hasAudioData = (audioBlob && audioBlob.size > 0) || audioDuration > 0;
          
          if (!hasAudioData) {
            console.log(`Retry ${retryCount + 1}/${maxRetries}: Waiting for audio data...`);
            await new Promise(resolve => setTimeout(resolve, 200));
            retryCount++;
          }
        }
        
        if (hasAudioData) {
          try {
            console.log('Starting audio upload with metadata:', {
              userId: user.id,
              scenarioId,
              callId,
              timestamp: new Date().toISOString(),
            });
            
            const result = await uploadAudio({
              userId: user.id,
              scenarioId,
              callId,
              timestamp: new Date().toISOString(),
            })
            
            console.log('Upload result:', result);
            
            if (result.success) {
              console.log('Audio uploaded successfully:', result.audioUrl)
              audioUrl = result.audioUrl;
            } else {
              console.error('Failed to upload audio:', result.error)
            }
                  } catch (error) {
          console.error('Error uploading audio:', error)
          console.error('Upload error details:', {
            message: error.message,
            stack: error.stack
          });
        }
        } else {
          console.warn('No audio data available for upload. Audio recording may have failed.')
          console.log('Audio state check:', {
            audioBlob: !!audioBlob,
            audioBlobSize: audioBlob?.size,
            audioDuration: audioDuration,
            hasAudioData: hasAudioData
          });
          
          // Force upload attempt even if state check fails, since we know audio was recorded
          if (audioDuration > 0) {
            console.log('Forcing upload attempt despite state check failure...');
            try {
              const result = await uploadAudio({
                userId: user.id,
                scenarioId,
                callId,
                timestamp: new Date().toISOString(),
              })
              
              if (result.success) {
                console.log('Forced upload successful:', result.audioUrl)
                audioUrl = result.audioUrl;
              } else {
                console.error('Forced upload failed:', result.error)
              }
            } catch (error) {
              console.error('Error in forced upload:', error)
            }
          }
        }
      }
      
      // Save call data and get scoring
      if (user) {
        try {
          console.log('Saving call data:', {
            repId: user.id,
            scenarioName: scenarioConfig.current.scenarioPrompt.substring(0, 100),
            duration: currentTime,
            transcriptLength: conversationHistory.length,
            audioUrl: audioUrl,
            conversationHistory: conversationHistory // Debug conversation history
          });
          
          const saveResponse = await fetch('/api/save-call', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              callId: callId, // Add the call ID
              transcript: conversationHistory,
              repId: user.id,
              scenarioName: scenarioConfig.current.scenarioPrompt.substring(0, 100),
              duration: currentTime,
              audioUrl: audioUrl,
              conversationHistory: conversationHistory
            }),
          });
          
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            console.log('Call saved and scored:', saveResult);
          } else {
            const errorText = await saveResponse.text();
            console.error('Failed to save call data:', saveResponse.status, errorText);
          }
        } catch (error) {
          console.error('Error saving call data:', error);
          console.error('Save error details:', {
            message: error.message,
            stack: error.stack
          });
        }
      }
      
      // End simulation
      setIsRecording(false)
      setIsPaused(false)
      setUserHasSpoken(false) // Reset user speech flag
      
      // Wait a moment for database operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('=== ABOUT TO REDIRECT ===');
      console.log('Final state before redirect:', {
        callId,
        audioUrl,
        conversationHistoryLength: conversationHistory.length
      });
      
      // Redirect to review page with the call ID
      router.push(`/review?callId=${callId}`)
    } catch (error) {
      console.error('Error ending call:', error)
      console.error('End call error details:', {
        message: error.message,
        stack: error.stack
      });
      // Still redirect to review even if upload fails
      setIsRecording(false)
      setIsPaused(false)
      router.push(`/review?callId=${callId}`)
    }
  }

  const handleSwitchToText = () => {
    // Switch to text mode logic
    console.log('Switching to text mode')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Call Simulation</h1>
            <p className="text-muted-foreground mt-2">
              {scenarioData?.title || 'Loading scenario...'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
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

      {/* Error Alerts */}
      {(audioError || streamingError || transcriptionError) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {audioError || streamingError || transcriptionError}
              </span>
              <Button variant="outline" size="sm" onClick={handleStartRecording}>
                Retry Recording
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* High Latency Alert */}
      {highLatency && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>High latency detected. Voice quality may be affected.</span>
              <Button variant="outline" size="sm" onClick={handleSwitchToText}>
                Switch to Text Mode
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      <div className="grid gap-8 md:grid-cols-3">
        {/* Main Simulation Area */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-2"
        >
          <Card className="h-[500px]">
            <CardContent className="p-8 h-full flex flex-col items-center justify-center">
              {/* Voice Waveform Visualization */}
              <div className="flex items-center justify-center space-x-2 mb-8">
                <AudioWaveform 
                  isRecording={isAudioRecording}
                  isPaused={isAudioPaused}
                  className="h-20"
                />
              </div>

              {/* AI Status */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {isAISpeaking ? (
                    <Volume2 className="h-5 w-5 text-primary" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-lg font-medium">
                    {isAISpeaking ? `${scenarioData?.seniority ? scenarioData.seniority.charAt(0).toUpperCase() + scenarioData.seniority.slice(1) : 'Prospect'} Speaking...` : 'Listening...'}
                  </span>
                  {scenarioConfig.current.enableStreaming && (
                    <Badge variant="secondary" className="ml-2">
                      <Zap className="mr-1 h-3 w-3" />
                      Streaming
                    </Badge>
                  )}
                </div>
                {showSubtitles && (
                  <p className="text-muted-foreground max-w-md">
                    {isAISpeaking 
                      ? (currentAIText || "Hello, this is Sarah Johnson. I appreciate you taking the time to call. We're always looking for ways to improve our operations.")
                      : isTranscriptionPaused
                      ? "Transcription paused during AI speech..."
                      : (currentTranscript || "Waiting for your response...")
                    }
                  </p>
                )}
                {streamingState === 'thinking' && (
                  <p className="text-sm text-blue-600 mt-2">
                    <span className="animate-pulse">●</span> AI is thinking...
                  </p>
                )}
                {streamingState === 'transcribing' && (
                  <p className="text-sm text-orange-600 mt-2">
                    <span className="animate-pulse">●</span> Transcribing your speech...
                  </p>
                )}
              </div>

              {/* Microphone Indicator */}
              <div className="flex items-center space-x-4">
                <motion.div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    isAudioRecording 
                      ? 'bg-red-100 dark:bg-red-900' 
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                  animate={{
                    scale: isAudioRecording && canRepSpeak ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 1,
                    repeat: isAudioRecording && canRepSpeak ? Infinity : 0,
                  }}
                >
                  {isAudioRecording ? (
                    <Mic className="h-8 w-8 text-red-600" />
                  ) : (
                    <MicOff className="h-8 w-8 text-gray-400" />
                  )}
                </motion.div>
                <div className="text-center">
                  <p className="font-medium">
                    {isAudioRecording ? 'Recording' : 'Not Recording'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your microphone
                  </p>
                  {isAudioRecording && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(audioDuration)}
                    </p>
                  )}
                  {scenarioConfig.current.enableStreaming && (
                    <div className="mt-2 space-y-1">
                      <Badge variant={isListening && !isTranscriptionPaused ? "default" : "outline"} className="text-xs">
                        {isTranscriptionPaused ? 'Paused' : isListening ? 'Listening' : 'Not Listening'}
                      </Badge>
                      <Badge variant={isStreaming ? "default" : "outline"} className="text-xs ml-1">
                        {isStreaming ? 'Processing' : 'Ready'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Controls Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Timer and Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-primary mb-2">
                  {formatTime(currentTime)}
                </div>
                <p className="text-sm text-muted-foreground">Call Duration</p>
              </div>

              <div className="space-y-3">
                {!isRecording ? (
                  <Button 
                    onClick={handleStartRecording}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Start Call
                  </Button>
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
                      className="w-full"
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
                      onClick={() => {
                        console.log('=== END CALL BUTTON CLICKED ===');
                        handleEndCall();
                      }}
                      variant="destructive"
                      className="w-full"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      End Call
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="subtitles">Show Subtitles</Label>
                <Switch
                  id="subtitles"
                  checked={showSubtitles}
                  onCheckedChange={setShowSubtitles}
                />
              </div>
              
              <Button variant="outline" className="w-full" onClick={handleSwitchToText}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Switch to Text Chat
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  console.log('Resetting conversation...');
                  resetConversation();
                  resetTranscription();
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Conversation
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  console.log('Manual test: Starting streaming with test message');
                  startStreaming("Hello, this is a test message", {
                    scenarioPrompt: scenarioConfig.current.scenarioPrompt,
                    persona: scenarioConfig.current.persona,
                    voiceSettings: scenarioConfig.current.voiceSettings,
                  });
                }}
              >
                Test AI Response
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  console.log('Testing speech synthesis');
                  if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance('Hello, this is a test of the speech synthesis system.');
                    utterance.rate = 0.9;
                    utterance.pitch = 1.0;
                    utterance.volume = 0.8;
                    speechSynthesis.speak(utterance);
                    console.log('Speech synthesis test started');
                  } else {
                    console.error('Speech synthesis not supported in this browser');
                  }
                }}
              >
                Test Speech Synthesis
              </Button>
              
              <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                <p><strong>Voice System:</strong></p>
                <p>• ElevenLabs: Premium AI voices (requires credits)</p>
                <p>• Speech Synthesis: Free browser voices (fallback)</p>
                <p>• Auto-fallback when credits exhausted</p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={async () => {
                  console.log('Testing ElevenLabs API...');
                  try {
                    const response = await fetch('/api/test-elevenlabs', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({}),
                    });
                    
                    const result = await response.json();
                    console.log('ElevenLabs test result:', result);
                    
                    if (result.success) {
                      toast({
                        title: "ElevenLabs Test Successful",
                        description: "Voice generation is working correctly.",
                        variant: "default",
                      });
                    } else {
                      toast({
                        title: "ElevenLabs Test Failed",
                        description: result.error || "Unknown error occurred.",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    console.error('ElevenLabs test error:', error);
                    toast({
                      title: "ElevenLabs Test Error",
                      description: error instanceof Error ? error.message : "Unknown error occurred.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Test ElevenLabs
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  console.log('=== AUDIO RECORDING DEBUG ===');
                  console.log('Audio recording state:', {
                    isRecording: isAudioRecording,
                    isPaused: isAudioPaused,
                    audioBlob: !!audioBlob,
                    audioBlobSize: audioBlob?.size,
                    audioUrl: !!audioUrl,
                    duration: audioDuration,
                    error: audioError
                  });
                  console.log('Call state:', {
                    isRecording,
                    callId,
                    currentTime
                  });
                  console.log('=== END AUDIO DEBUG ===');
                }}
              >
                Debug Audio Recording
              </Button>
            </CardContent>
          </Card>

          {/* Scenario Info */}
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold">Scenario Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="text-right max-w-[150px] truncate">{scenarioData?.title || 'Loading...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{scenarioData?.callType ? scenarioData.callType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prospect:</span>
                  <span>{scenarioData?.seniority ? `${scenarioData.seniority.charAt(0).toUpperCase() + scenarioData.seniority.slice(1)} Level` : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty:</span>
                  <span>{scenarioData?.difficulty ? `${scenarioData.difficulty}/5` : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{scenarioData?.duration ? `${scenarioData.duration} minutes` : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voice:</span>
                  <span>{scenarioData?.voice ? scenarioData.voice.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Streaming:</span>
                  <Badge variant={scenarioData?.enableStreaming ? "default" : "outline"} className="text-xs">
                    {scenarioData?.enableStreaming ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
