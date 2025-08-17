'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mic, MicOff, Pause, Play, Square, MessageSquare, Wifi, WifiOff, Volume2, VolumeX, AlertCircle, Zap, RotateCcw, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useVoiceStreaming } from '@/hooks/use-voice-streaming'

import { useAuth } from '@/components/auth-provider'
import { AudioWaveform } from '@/components/ui/audio-waveform'
import { useToast } from '@/hooks/use-toast'

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
  const { toast } = useToast()
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [highLatency, setHighLatency] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'poor'>('connected')
  const [callId, setCallId] = useState<string>('')
  const [scenarioId, setScenarioId] = useState<string>('')
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null)
  const [isProcessingEndCall, setIsProcessingEndCall] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<string>('')
  
  // Push-to-talk state
  const [isUserRecording, setIsUserRecording] = useState(false)
  const [currentUserMessage, setCurrentUserMessage] = useState('')
  const [canSendMessage, setCanSendMessage] = useState(false)
  
  // Load scenario data from localStorage
  useEffect(() => {
    const savedScenario = localStorage.getItem('currentScenario')
    if (savedScenario) {
      try {
        const parsed = JSON.parse(savedScenario)
        
        // Check if scenario data is recent (within last hour)
        const isRecent = parsed.timestamp && (Date.now() - parsed.timestamp) < 3600000
        
        if (isRecent) {
          setScenarioData(parsed)
          console.log('Loaded scenario data:', parsed)
        } else {
          // Scenario data is stale, clear it and redirect
          localStorage.removeItem('currentScenario')
          router.push('/scenario-builder')
          return
        }
      } catch (error) {
        console.error('Failed to parse scenario data:', error)
        // Clear invalid scenario data and redirect to builder
        localStorage.removeItem('currentScenario')
        router.push('/scenario-builder')
        return
      }
    } else {
      // No scenario data, redirect back to builder
      router.push('/scenario-builder')
      return
    }
  }, [router])

  // Use the scenario prompt directly as written by the user (ChatGPT-like)
  const generateScenarioPrompt = (basePrompt: string, data: ScenarioData) => {
    // Return the user's prompt directly - this is the key to ChatGPT-like behavior
    return basePrompt;
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
        scenarioPrompt: generateScenarioPrompt(scenarioData.prompt, scenarioData),
        persona: {
          difficulty: scenarioData.difficulty || 3,
          seniority: scenarioData.seniority || 'manager',
          callType: scenarioData.callType || 'outbound'
        } as any,
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

  // Simple audio recording for push-to-talk (no chunking transcription)
  const [isTranscribingMessage, setIsTranscribingMessage] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const recordingRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  
  // Simple transcription function for one-shot recording
  const transcribeAudioBlob = useCallback(async (audioBlob: Blob): Promise<string> => {
    setIsTranscribingMessage(true)
    setTranscriptionError(null)
    
    try {
      console.log('Transcribing audio blob with Whisper, size:', audioBlob.size)
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', 'en')

      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('Whisper transcription result:', result)
      
      if (result.text) {
        return result.text.trim()
      } else {
        throw new Error('No transcription text received')
      }
    } catch (err) {
      console.error('Transcription error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Transcription failed'
      setTranscriptionError(errorMessage)
      throw err
    } finally {
      setIsTranscribingMessage(false)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Spacebar to start/stop recording
      if (event.code === 'Space' && isRecording && !isAISpeaking) {
        event.preventDefault()
        if (isUserRecording) {
          handleStopUserRecording()
        } else {
          handleStartUserRecording()
        }
      }
      
      // Enter key no longer needed - auto-send after recording
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording, isUserRecording, isAISpeaking])

  // Start user recording
  const handleStartUserRecording = useCallback(async () => {
    if (isAISpeaking || !isRecording) return
    
    try {
      console.log('Starting user recording...')
      setIsUserRecording(true)
      setCurrentUserMessage('')
      setCanSendMessage(false)
      setTranscriptionError(null)
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        } 
      })
      
      recordingStreamRef.current = stream
      recordingChunksRef.current = []
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      recordingRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }
      
      // Start recording
      mediaRecorder.start()
      console.log('User recording started')
    } catch (error) {
      console.error('Failed to start user recording:', error)
      setIsUserRecording(false)
      setTranscriptionError('Failed to access microphone')
    }
  }, [isAISpeaking, isRecording])

  // Stop user recording
  const handleStopUserRecording = useCallback(async () => {
    if (!isUserRecording || !recordingRecorderRef.current) return
    
    try {
      console.log('Stopping user recording...')
      setIsUserRecording(false)
      
      // Stop the MediaRecorder
      const mediaRecorder = recordingRecorderRef.current
      
      // Wait for the recording to stop and process audio
      const audioBlob = await new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' })
          resolve(blob)
        }
        mediaRecorder.stop()
      })
      
      // Stop the stream
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(track => track.stop())
        recordingStreamRef.current = null
      }
      
      console.log('Audio recorded, size:', audioBlob.size)
      
      // Transcribe the audio and automatically send
      if (audioBlob.size > 0) {
        const transcribedText = await transcribeAudioBlob(audioBlob)
        if (transcribedText && transcribedText.trim()) {
          console.log('Auto-sending transcribed message:', transcribedText)
          
          // Automatically send to AI
          await startStreaming(transcribedText.trim(), {
            scenarioPrompt: scenarioConfig.current.scenarioPrompt,
            persona: scenarioConfig.current.persona,
            voiceSettings: scenarioConfig.current.voiceSettings,
          })
          
          console.log('Message auto-sent successfully')
        } else {
          console.log('No transcription received')
          setCurrentUserMessage('No speech detected. Try recording again.')
          setCanSendMessage(false)
        }
      } else {
        console.log('No audio data recorded')
        setCurrentUserMessage('No audio recorded. Try again.')
        setCanSendMessage(false)
      }
    } catch (error) {
      console.error('Failed to stop recording or transcribe:', error)
      setCurrentUserMessage('')
      setCanSendMessage(false)
      setTranscriptionError('Failed to transcribe audio')
    }
  }, [isUserRecording, transcribeAudioBlob, startStreaming])

  // Send message to AI
  const handleSendMessage = useCallback(async () => {
    if (!canSendMessage || !currentUserMessage.trim() || isAISpeaking) return
    
    try {
      console.log('=== SENDING MESSAGE TO AI ===')
      console.log('Message:', currentUserMessage)
      
      setCanSendMessage(false)
      
      // Send to AI streaming
      await startStreaming(currentUserMessage, {
        scenarioPrompt: scenarioConfig.current.scenarioPrompt,
        persona: scenarioConfig.current.persona,
        voiceSettings: scenarioConfig.current.voiceSettings,
      })
      
      // Clear the message
      setCurrentUserMessage('')
      console.log('Message sent successfully')
      
    } catch (error) {
      console.error('Failed to send message:', error)
      setCanSendMessage(true) // Re-enable if failed
    }
  }, [canSendMessage, currentUserMessage, isAISpeaking, startStreaming])

  // Show transcription status during recording
  useEffect(() => {
    if (isUserRecording) {
      setCurrentUserMessage('Recording your message...')
    }
  }, [isUserRecording])

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

  const handleStartRecording = async () => {
    if (!user) return
    
    try {
      // Generate call ID with proper UUID format
      const newCallId = crypto.randomUUID()
      console.log('Generated call ID (UUID):', newCallId)
      setCallId(newCallId)
      
      // Generate scenario ID as UUID
      const newScenarioId = crypto.randomUUID()
      console.log('Generated scenario ID (UUID):', newScenarioId)
      setScenarioId(newScenarioId)
      
      // Start audio recording
      console.log('Starting audio recording...')
      await startAudioRecording()
      console.log('Audio recording started successfully')
      
      // Start simulation
      setIsRecording(true)
      setCurrentTime(0)
      setIsUserRecording(false)
      setCurrentUserMessage('')
      setCanSendMessage(false)
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
    
    // Prevent multiple calls - check if already processing or not recording
    if (!isRecording || isProcessingEndCall) {
      console.log('Call already ended, not recording, or already processing, ignoring');
      return;
    }
    
    // Immediately set states to prevent multiple calls
    setIsProcessingEndCall(true);
    setIsRecording(false);
    setIsPaused(false);
    setIsUserRecording(false);
    setCurrentUserMessage('');
    setCanSendMessage(false);
    setAnalysisProgress('Stopping recording...');
    
    try {
      // Clean up any ongoing recordings
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(track => track.stop())
        recordingStreamRef.current = null
      }
      if (recordingRecorderRef.current && recordingRecorderRef.current.state === 'recording') {
        recordingRecorderRef.current.stop()
      }
      
      // Stop audio recording
      console.log('Stopping audio recording...')
      stopAudioRecording()
      console.log('Audio recording stopped')
      
      // Stop streaming
      if (scenarioConfig.current.enableStreaming) {
        stopStreaming()
      }
      
      // Stop any ongoing speech synthesis
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
      
      let audioUrl = null;
      
      // Upload audio if we have a call ID and audio blob
      if (callId && user) {
        setAnalysisProgress('Processing audio recording...');
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
            setAnalysisProgress('Uploading audio file...');
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
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace'
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
      
      // Analyze and score call data with loading modal (don't save to database yet)
      if (user) {
        try {
          setAnalysisProgress('Analyzing conversation with AI...');
          console.log('Scoring call data:', {
            repId: user.id,
            scenarioName: scenarioData?.title || 'Unnamed Simulation',
            scenarioPrompt: scenarioData?.prompt || '',
            duration: currentTime,
            transcriptLength: conversationHistory.length,
            audioUrl: audioUrl,
            conversationHistory: conversationHistory
          });
          
          // Save call data and get scenario-aware scoring
          setAnalysisProgress('Analyzing conversation with AI...');
          console.log('Saving call data with scenario context:', {
            repId: user.id,
            scenarioName: scenarioData?.title || 'Unnamed Simulation',
            scenarioPrompt: scenarioData?.prompt || '',
            duration: currentTime,
            transcriptLength: conversationHistory.length,
            audioUrl: audioUrl,
            conversationHistory: conversationHistory
          });
          
          const saveResponse = await fetch('/api/save-call', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              callId: callId,
              transcript: conversationHistory,
              repId: user.id,
              scenarioName: scenarioData?.title || 'Unnamed Simulation',
              scenarioPrompt: scenarioData?.prompt || '', // Add scenario prompt for context-aware scoring
              duration: currentTime,
              audioUrl: audioUrl,
              conversationHistory: conversationHistory,
              scoreOnly: true // Flag to only score, not save
            }),
          });
          
          let scoringResult = {
            score: 0,
            feedback: [],
            talkRatio: 0,
            objectionsHandled: 0,
            ctaUsed: false,
            sentiment: 'neutral'
          };
          
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            console.log('Call saved and scored with scenario context:', saveResult);
            
            // Extract scoring results from the save response
            scoringResult = {
              score: saveResult.score || 0,
              feedback: saveResult.feedback || [],
              talkRatio: saveResult.talk_ratio || 0,
              objectionsHandled: saveResult.objections_handled || 0,
              ctaUsed: saveResult.cta_used || false,
              sentiment: saveResult.sentiment || 'neutral'
            };
            
            setAnalysisProgress('Generating performance insights...');
          } else {
            const errorText = await saveResponse.text();
            console.error('Failed to save call data:', saveResponse.status, errorText);
            setAnalysisProgress('Analysis complete with errors');
          }
          
          const tempCallData = {
            callId: callId,
            transcript: conversationHistory,
            repId: user.id,
            scenarioName: scenarioData?.title || 'Unnamed Simulation',
            scenarioPrompt: scenarioData?.prompt || '', // Include scenario prompt in temp data
            duration: currentTime,
            audioUrl: audioUrl,
            conversationHistory: conversationHistory,
            created_at: new Date().toISOString(),
            isSaved: false,
            // Include scoring results
            score: scoringResult.score,
            feedback: scoringResult.feedback,
            talk_ratio: scoringResult.talkRatio,
            objections_handled: scoringResult.objectionsHandled,
            cta_used: scoringResult.ctaUsed,
            sentiment: scoringResult.sentiment
          };
          
          // Store in session storage for the review page
          sessionStorage.setItem(`temp_call_${callId}`, JSON.stringify(tempCallData));
          
          console.log('Call data analyzed and prepared for review (not saved yet):', {
            callId,
            repId: user.id,
            scenarioName: scenarioData?.title || 'Unnamed Simulation',
            scenarioPrompt: scenarioData?.prompt || '',
            duration: currentTime,
            transcriptLength: conversationHistory.length,
            audioUrl: audioUrl,
            sessionStorageKey: `temp_call_${callId}`,
            score: scoringResult.score
          });
          
          setAnalysisProgress('Analysis complete! Preparing review...');
        } catch (error) {
          console.error('Error analyzing call data:', error);
          console.error('Analysis error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace'
          });
          setAnalysisProgress('Analysis complete with errors');
        }
      }
      
      // Wait a moment for database operations to complete
      setAnalysisProgress('Finalizing results...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('=== ABOUT TO REDIRECT ===');
      console.log('Final state before redirect:', {
        callId,
        audioUrl,
        conversationHistoryLength: conversationHistory.length
      });
      
      setAnalysisProgress('Complete! Redirecting...');
      // Small delay to show the complete message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to review page with the call ID
      router.push(`/review?callId=${callId}`)
    } catch (error) {
      console.error('Error ending call:', error)
      console.error('End call error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      // Still redirect to review even if upload fails
      setIsProcessingEndCall(false);
      router.push(`/review?callId=${callId}`)
    }
  }

  const handleSwitchToText = () => {
    // Switch to text mode logic
    console.log('Switching to text mode')
  }

  // Don't render if no scenario data (redirecting to scenario builder)
  if (!scenarioData) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to scenario builder...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      {/* Loading Overlay for Call Analysis */}
      {isProcessingEndCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Analyzing Your Call</h3>
                  <p className="text-sm text-muted-foreground">
                    {analysisProgress || 'Processing...'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{
                        width: analysisProgress.includes('Stopping') ? '20%' :
                               analysisProgress.includes('Processing') ? '40%' :
                               analysisProgress.includes('Uploading') ? '60%' :
                               analysisProgress.includes('Analyzing') ? '80%' :
                               analysisProgress.includes('Generating') ? '90%' :
                               analysisProgress.includes('Finalizing') ? '95%' :
                               analysisProgress.includes('Complete') ? '100%' : '10%'
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI is analyzing your conversation and generating personalized feedback
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
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
                  isRecording={isUserRecording}
                  isPaused={false}
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
                    {isAISpeaking ? `${scenarioData?.seniority ? scenarioData.seniority.charAt(0).toUpperCase() + scenarioData.seniority.slice(1) : 'Prospect'} Speaking...` : 'Waiting for your message...'}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    <Zap className="mr-1 h-3 w-3" />
                    Push-to-Talk
                  </Badge>
                </div>
                {showSubtitles && (
                  <p className="text-muted-foreground max-w-md">
                    {isAISpeaking 
                      ? (currentAIText || "Hello, this is Sarah Johnson. I appreciate you taking the time to call. We're always looking for ways to improve our operations.")
                      : isTranscribingMessage
                      ? "Transcribing and sending your message..."
                      : isUserRecording
                      ? "Recording your message..."
                      : currentUserMessage && currentUserMessage !== 'Recording your message...'
                      ? currentUserMessage
                      : "Press Space or click Record to speak"
                    }
                  </p>
                )}
                {streamingState === 'thinking' && (
                  <p className="text-sm text-blue-600 mt-2">
                    <span className="animate-pulse">●</span> AI is thinking...
                  </p>
                )}
                {isUserRecording && (
                  <p className="text-sm text-green-600 mt-2">
                    <span className="animate-pulse">●</span> Recording your message...
                  </p>
                )}
                {isTranscribingMessage && (
                  <p className="text-sm text-blue-600 mt-2">
                    <span className="animate-pulse">●</span> Transcribing and sending...
                  </p>
                )}
              </div>

              {/* Push-to-Talk Controls */}
              <div className="flex items-center space-x-4">
                <motion.div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    isUserRecording 
                      ? 'bg-red-100 dark:bg-red-900' 
                      : canSendMessage
                      ? 'bg-green-100 dark:bg-green-900'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                  animate={{
                    scale: isUserRecording ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 1,
                    repeat: isUserRecording ? Infinity : 0,
                  }}
                >
                  {isUserRecording ? (
                    <Mic className="h-8 w-8 text-red-600" />
                  ) : isTranscribingMessage ? (
                    <Send className="h-8 w-8 text-blue-600" />
                  ) : (
                    <MicOff className="h-8 w-8 text-gray-400" />
                  )}
                </motion.div>
                <div className="text-center">
                  <p className="font-medium">
                    {isUserRecording ? 'Recording' : isTranscribingMessage ? 'Sending...' : 'Ready to Record'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isUserRecording ? 'Press Space to stop and send' : isTranscribingMessage ? 'Processing...' : 'Press Space to record'}
                  </p>
                </div>
              </div>

              {/* Push-to-Talk Buttons */}
              {isRecording && (
                <div className="flex space-x-3 mt-6">
                  {!isUserRecording && !isTranscribingMessage ? (
                    <Button
                      onClick={handleStartUserRecording}
                      disabled={isAISpeaking}
                      className="flex items-center space-x-2"
                      size="lg"
                    >
                      <Mic className="h-4 w-4" />
                      <span>Record Message</span>
                    </Button>
                  ) : isUserRecording ? (
                    <Button
                      onClick={handleStopUserRecording}
                      variant="destructive"
                      className="flex items-center space-x-2"
                      size="lg"
                    >
                      <Square className="h-4 w-4" />
                      <span>Stop & Send</span>
                    </Button>
                  ) : (
                    <Button
                      disabled
                      variant="outline"
                      className="flex items-center space-x-2"
                      size="lg"
                    >
                      <Send className="h-4 w-4" />
                      <span>Sending...</span>
                    </Button>
                  )}
                </div>
              )}
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
                      disabled={isProcessingEndCall}
                      variant="destructive"
                      className="w-full"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      {isProcessingEndCall ? 'Ending Call...' : 'End Call'}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Push-to-Talk Instructions */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-center">Push-to-Talk Controls</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-xs">Space</Badge>
                  <span>Start/Stop & auto-send</span>
                </div>
                <div className="text-xs text-muted-foreground mt-3 p-2 bg-muted rounded">
                  <p>• Press Space to start recording</p>
                  <p>• Speak your complete message</p>
                  <p>• Press Space to stop</p>
                  <p>• Message automatically sends to AI!</p>
                  <p>• No extra buttons needed!</p>
                </div>
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
                  setCurrentUserMessage('');
                  setCanSendMessage(false);
                  setIsUserRecording(false);
                  setTranscriptionError(null);
                  // Clean up any ongoing recordings
                  if (recordingStreamRef.current) {
                    recordingStreamRef.current.getTracks().forEach(track => track.stop())
                    recordingStreamRef.current = null
                  }
                  if (recordingRecorderRef.current && recordingRecorderRef.current.state === 'recording') {
                    recordingRecorderRef.current.stop()
                  }
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Conversation
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
                  <span className="text-muted-foreground">Mode:</span>
                  <Badge variant="default" className="text-xs">
                    Push-to-Talk
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