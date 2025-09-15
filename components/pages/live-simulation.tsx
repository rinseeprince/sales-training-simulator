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
import { useEnhancedAudioRecorder } from '@/hooks/use-enhanced-audio-recorder'
import { useVoiceStreaming } from '@/hooks/use-voice-streaming'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { AudioWaveform } from '@/components/ui/audio-waveform'
import { ReviewModal } from '@/components/ui/review-modal'
import { useToast } from '@/hooks/use-toast'
import { getPhoneRingGenerator } from '@/lib/phone-ring-generator'

interface ScenarioData {
  title: string
  prompt: string
  prospectName?: string
  duration: string
  voice: string
  enableStreaming: boolean
  timestamp: number
}

export function LiveSimulation() {
  const router = useRouter()
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const [actualUserId, setActualUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'user' | 'manager' | 'admin'>('user')
  // Debug user role
  useEffect(() => {
    console.log('Live simulation user role:', { userRole, userId: user?.id });
  }, [userRole, user?.id]);
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
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [loadedFromURL, setLoadedFromURL] = useState(false)
  const [hasActiveCall, setHasActiveCall] = useState(false)
  
  // Debug the review modal state (DISABLED - causing re-renders)
  // useEffect(() => {
  //   console.log('🔍 Review modal state changed:', {
  //     reviewModalOpen,
  //     hasActiveCall,
  //     loadedFromURL,
  //     shouldShow: reviewModalOpen && (hasActiveCall || !loadedFromURL)
  //   });
  // }, [reviewModalOpen, hasActiveCall, loadedFromURL]);
  
  // Track component lifecycle (DISABLED - causing re-renders)
  // useEffect(() => {
  //   console.log('🔄 LiveSimulation component mounted');
  //   return () => {
  //     console.log('🔄 LiveSimulation component unmounting');
  //   };
  // }, []);
  
  // Track URL changes (disabled - causing too many logs)
  // useEffect(() => {
  //   console.log('🔍 Current URL:', window.location.href);
  // });
  const [reviewCallId, setReviewCallId] = useState<string | null>(null)
  const [isRinging, setIsRinging] = useState(false)
  
  // Push-to-talk state
  const [isUserRecording, setIsUserRecording] = useState(false)
  const [currentUserMessage, setCurrentUserMessage] = useState('')
  const [canSendMessage, setCanSendMessage] = useState(false)
  
  // Synchronized transcription state
  const [currentDisplaySentence, setCurrentDisplaySentence] = useState('')
  const [allSentences, setAllSentences] = useState<string[]>([])
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const sentenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const previousSentencesRef = useRef<string[]>([])
  
  // Get the correct user ID from simple_users table
  useEffect(() => {
    const getUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
        const profileData = await profileResponse.json();
        
        if (profileData.success) {
          setActualUserId(profileData.userProfile.id);
          setUserRole(profileData.userProfile.role || 'user');
        }
      } catch (error) {
        console.error('Error getting user profile:', error);
      }
    };
    
    getUserProfile();
  }, [user?.id]);

  // Load scenario data from localStorage OR URL parameters
  useEffect(() => {
    console.log('🔄 Live simulation loading, checking for scenario data...');
    
    try {
      // First, check URL parameters (from Play button)
      console.log('🔄 === LIVE SIMULATION URL CHECK ===')
      const urlParams = new URLSearchParams(window.location.search);
      const urlPrompt = urlParams.get('prompt');
      const urlProspectName = urlParams.get('prospectName');
      const urlVoice = urlParams.get('voice');
      const urlAssignmentId = urlParams.get('assignmentId');
      
      console.log('🔄 URL parameters detected:', {
        hasPrompt: !!urlPrompt,
        hasAssignmentId: !!urlAssignmentId,
        assignmentId: urlAssignmentId,
        assignmentIdType: typeof urlAssignmentId,
        fullUrl: window.location.href
      })
      
      if (urlPrompt) {
        console.log('🔄 === CREATING SCENARIO DATA ===')
        console.log('🔄 Found scenario data in URL parameters', urlAssignmentId ? 'WITH ASSIGNMENT ID' : 'WITHOUT ASSIGNMENT ID');
        
        const urlScenarioData = {
          title: 'Saved Scenario',
          prompt: urlPrompt,
          prospectName: urlProspectName || 'Prospect',
          duration: '10',
          voice: urlVoice || 'rachel',
          enableStreaming: true,
          assignmentId: urlAssignmentId, // Store assignment ID if present
          timestamp: Date.now()
        };
        
        console.log('🔄 Scenario data created:', {
          title: urlScenarioData.title,
          hasAssignmentId: !!urlScenarioData.assignmentId,
          assignmentId: urlScenarioData.assignmentId,
          assignmentIdType: typeof urlScenarioData.assignmentId
        });
        
        setScenarioData(urlScenarioData);
        setLoadedFromURL(true);
        
        // Clear any existing localStorage data to avoid conflicts
        localStorage.removeItem('currentScenario');
        console.log('🔄 URL scenario loaded successfully, staying on simulation page');
        return; // EXIT HERE - don't continue to localStorage logic
      }
      
      // Only check localStorage if no URL parameters found
      const savedScenario = localStorage.getItem('currentScenario')
      console.log('🔄 Found scenario in localStorage:', savedScenario ? 'Yes' : 'No');
      
      if (savedScenario) {
        const parsed = JSON.parse(savedScenario)
        console.log('🔄 Parsed scenario data:', parsed);
        
        // Check if scenario data is recent (within last hour)
        const isRecent = parsed.timestamp && (Date.now() - parsed.timestamp) < 3600000
        console.log('🔄 Scenario is recent:', isRecent, 'timestamp:', parsed.timestamp, 'age:', parsed.timestamp ? (Date.now() - parsed.timestamp) / 1000 / 60 : 'no timestamp', 'minutes');
        
        if (isRecent) {
          setScenarioData(parsed)
          console.log('🔄 Loaded scenario data successfully:', parsed)
          return; // EXIT HERE - scenario loaded successfully
        } else {
          // Scenario data is stale, clear it and redirect
          console.log('🔄 Scenario data is stale, redirecting to builder');
          localStorage.removeItem('currentScenario')
          router.push('/scenario-builder')
          return
        }
      } else {
        // No scenario data anywhere, redirect back to builder
        console.log('🔄 No scenario data found, redirecting to builder');
        console.log('🔄 This redirect was triggered because no URL params and no localStorage data');
        router.push('/scenario-builder')
        return
      }
    } catch (error) {
      console.error('🔄 Error in scenario loading useEffect:', error);
      // On error, redirect to builder
      router.push('/scenario-builder')
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
      voiceId: 'professional-male-us', // Default US professional male voice
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
      // No need for voice mapping - pass the voice ID directly
      // The new regional voice IDs (like 'casual-female-uk') will be handled by the backend
      
      scenarioConfig.current = {
        scenarioPrompt: scenarioData.prompt, // Use the prompt directly - no more complex generation
        persona: null as any, // No longer using complex persona parameters
        voiceSettings: {
          voiceId: scenarioData.voice || 'professional-male-us', // Use the voice ID directly, fallback to US professional male
          stability: 0.5,
          similarityBoost: 0.5,
          style: 0.0,
          useSpeakerBoost: true
        },
        enableStreaming: scenarioData.enableStreaming
      }
      console.log('Updated scenario config (simplified):', scenarioConfig.current)
    }
  }, [scenarioData])
  
  // Enhanced audio recording hook with mixed streams
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
    addAudioToMix,
  } = useEnhancedAudioRecorder()

  // Voice streaming hook with callback for enhanced recording
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
  } = useVoiceStreaming(addAudioToMix)

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
          
          // Automatically send to AI (original simple approach)
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
      
      // Send to AI streaming (original simple approach)
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

  // Synchronized transcription effect - shows sentences in sync with audio
  useEffect(() => {
    if (currentAIText && isAISpeaking) {
      // Split the AI text into sentences
      const sentences = currentAIText
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0)
        .map(s => s.trim())
      
      console.log('Synchronized transcription - sentences:', sentences)
      
      // Check if sentences have changed by comparing with ref
      if (sentences.length > 0 && JSON.stringify(sentences) !== JSON.stringify(previousSentencesRef.current)) {
        // Update the ref to track current sentences
        previousSentencesRef.current = sentences
        
        setAllSentences(sentences)
        setCurrentSentenceIndex(0)
        
        // Start displaying the first sentence
        setCurrentDisplaySentence(sentences[0])
        console.log('Starting synchronized display with sentence:', sentences[0])
        
        // Set up timing for subsequent sentences
        if (sentences.length > 1) {
          const displayNextSentence = (index: number) => {
            if (index < sentences.length) {
              console.log(`Displaying sentence ${index + 1}:`, sentences[index])
              setCurrentDisplaySentence(sentences[index])
              setCurrentSentenceIndex(index)
              
              // Calculate timing for next sentence (roughly 3-4 seconds per sentence)
              const sentenceLength = sentences[index].length
              const displayTime = Math.max(2500, Math.min(5000, sentenceLength * 80)) // 80ms per character, min 2.5s, max 5s
              
              if (index + 1 < sentences.length) {
                sentenceTimerRef.current = setTimeout(() => {
                  displayNextSentence(index + 1)
                }, displayTime)
              }
            }
          }
          
          // Start the sequence with the first sentence
          const firstSentenceLength = sentences[0].length
          const firstDisplayTime = Math.max(2500, Math.min(5000, firstSentenceLength * 80))
          
          if (sentences.length > 1) {
            sentenceTimerRef.current = setTimeout(() => {
              displayNextSentence(1)
            }, firstDisplayTime)
          }
        }
      }
    } else if (!isAISpeaking) {
      // Clear everything when AI stops speaking
      console.log('AI stopped speaking, clearing synchronized transcription')
      setCurrentDisplaySentence('')
      setAllSentences([])
      setCurrentSentenceIndex(0)
      previousSentencesRef.current = []
      if (sentenceTimerRef.current) {
        clearTimeout(sentenceTimerRef.current)
        sentenceTimerRef.current = null
      }
    }
    
    return () => {
      if (sentenceTimerRef.current) {
        clearTimeout(sentenceTimerRef.current)
        sentenceTimerRef.current = null
      }
    }
  }, [currentAIText, isAISpeaking])
  


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
      // Play phone ring sound before starting the call
      console.log('Playing call ring sound...');
      setIsRinging(true);
      const phoneRing = getPhoneRingGenerator();
      await phoneRing.playCallStartRing();
      setIsRinging(false);
      console.log('Call ring finished, starting call...');
      
      // Mark that we have an active call
      setHasActiveCall(true);
      
      // Increment simulation count immediately when starting
      console.log('Incrementing simulation count for user:', user.id)
      const incrementResponse = await fetch('/api/increment-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })
      
      const incrementData = await incrementResponse.json()
      
      if (!incrementData.success && incrementData.error === 'Simulation limit reached') {
        toast({
          title: "Simulation Limit Reached",
          description: "You've reached your free simulation limit. Please upgrade to continue.",
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
      
      // Show remaining simulations if getting low
      if (incrementData.remaining && incrementData.remaining > 0 && incrementData.remaining <= 5) {
        toast({
          title: "Simulations Remaining",
          description: `You have ${incrementData.remaining} free simulation${incrementData.remaining === 1 ? '' : 's'} left.`,
        })
      }
      
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
      
      // Auto-generate prospect greeting after a short delay (simulating pickup)
      setTimeout(async () => {
        // Play phone pickup sound first
        console.log('Playing phone pickup sound...');
        const phoneRing = getPhoneRingGenerator();
        await phoneRing.playPickupSound();
        console.log('Phone pickup sound finished');
        
        // Small delay after pickup sound before greeting
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('Generating prospect greeting...')
        
        // Use the prospect name from the scenario data, or fallback to a default
        console.log('🔍 Debug prospect name:', {
          scenarioData: scenarioData,
          prospectName: scenarioData?.prospectName,
          trimmed: scenarioData?.prospectName?.trim(),
          fallback: scenarioData?.prospectName?.trim() || 'Alex'
        });
        const prospectName = scenarioData?.prospectName?.trim() || 'Alex';
        const greetingMessage = `Hello, ${prospectName} speaking.`;
        
        console.log('Auto-generating prospect greeting:', greetingMessage);
        
        // Generate the greeting directly and play it (no need to go through streaming)
        try {
          // Add greeting to conversation history
          const greetingHistoryItem = {
            role: 'ai' as const,
            content: greetingMessage,
            timestamp: new Date().toISOString()
          };
          
          // We need to manually update the conversation history since this isn't going through startStreaming
          // But first we need access to the conversation history setter
          console.log('Playing prospect greeting:', greetingMessage);
          
          // Generate greeting audio using Google TTS via API
          try {
            console.log('Generating Google TTS for greeting:', greetingMessage);
            
            const ttsResponse = await fetch('/api/generate-greeting-tts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: greetingMessage,
                voiceSettings: scenarioConfig.current.voiceSettings
              })
            });
            
            if (ttsResponse.ok) {
              const ttsResult = await ttsResponse.json();
              
              if (ttsResult.success && ttsResult.audioBase64) {
                const audioUrl = `data:audio/mpeg;base64,${ttsResult.audioBase64}`;
                const audio = new Audio(audioUrl);
                
                // Register with enhanced recorder for mixed audio
                if (addAudioToMix) {
                  addAudioToMix(audio);
                }
                
                // Play the greeting
                await audio.play();
                console.log('Google TTS greeting played successfully');
              } else {
                throw new Error('TTS generation failed');
              }
            } else {
              throw new Error('TTS API request failed');
            }
            
          } catch (ttsError) {
            console.error('Google TTS failed for greeting, using speech synthesis fallback:', ttsError);
            // Fallback to speech synthesis only if Google TTS fails
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(greetingMessage);
              utterance.rate = 0.9;
              utterance.pitch = 1.0;
              utterance.volume = 0.8;
              speechSynthesis.speak(utterance);
            }
          }
          
        } catch (error) {
          console.error('Failed to generate prospect greeting:', error);
          // Fallback to speech synthesis
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(greetingMessage);
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
          }
        }
        
      }, 1000); // 1 second delay after ring ends to simulate pickup
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      toast({
        title: "Error",
        description: "Failed to start simulation. Please try again.",
        variant: "destructive"
      })
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
              userId: actualUserId,
              scenarioId,
              callId,
              timestamp: new Date().toISOString(),
            });
            
            const result = await uploadAudio({
              userId: actualUserId || '',
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
                userId: actualUserId || '',
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
            repId: actualUserId,
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
            repId: actualUserId,
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
              repId: actualUserId,
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
            sentiment: 'neutral',
            enhancedScoring: null
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
              sentiment: saveResult.sentiment || 'neutral',
              enhancedScoring: saveResult.enhancedScoring || null
            };
            
            setAnalysisProgress('Generating performance insights...');
          } else {
            const errorText = await saveResponse.text();
            console.error('Failed to save call data:', saveResponse.status, errorText);
            setAnalysisProgress('Analysis complete with errors');
          }
          
          console.log('💾 === CREATING TEMP CALL DATA ===')
          console.log('💾 Scenario data for temp call:', {
            hasScenarioData: !!scenarioData,
            scenarioAssignmentId: scenarioData?.assignmentId,
            scenarioAssignmentIdType: typeof scenarioData?.assignmentId
          })
          
          const tempCallData = {
            callId: callId,
            transcript: conversationHistory,
            repId: actualUserId,
            scenarioName: scenarioData?.title || 'Unnamed Simulation',
            scenarioPrompt: scenarioData?.prompt || '', // Include scenario prompt in temp data
            scenarioProspectName: scenarioData?.prospectName || '', // Include prospect name for restart
            scenarioVoice: scenarioData?.voice || 'professional-male-us', // Include voice for restart
            scenario_assignment_id: scenarioData?.assignmentId || null, // Include assignment ID if from assignment
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
            sentiment: scoringResult.sentiment,
            // Include enhanced scoring for coaching feedback
            enhanced_scoring: scoringResult.enhancedScoring,
            enhancedScoring: scoringResult.enhancedScoring // Store both field names for compatibility
          };
          
          console.log('💾 Temp call data created:', {
            callId: tempCallData.callId,
            hasAssignmentId: !!tempCallData.scenario_assignment_id,
            assignmentId: tempCallData.scenario_assignment_id,
            assignmentIdType: typeof tempCallData.scenario_assignment_id,
            scenarioName: tempCallData.scenarioName
          })
          
          // Store in session storage for the review page
          sessionStorage.setItem(`temp_call_${callId}`, JSON.stringify(tempCallData));
          console.log('💾 Temp call data stored in sessionStorage with key:', `temp_call_${callId}`)
          
          console.log('Call data analyzed and prepared for review (not saved yet):', {
            callId,
            repId: actualUserId,
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
      
      // Open review modal with the call ID (but only if we had an active call)
      if (callId && hasActiveCall) {
        console.log('🔄 Opening review modal for call:', callId);
        console.log('🔍 Setting reviewModalOpen to true (success path)');
        setReviewModalOpen(true)
        setReviewCallId(callId)
      } else {
        console.log('🔄 Not opening review modal - callId:', !!callId, 'hasActiveCall:', hasActiveCall);
        // If no active call, just redirect back to saved scenarios
        // DISABLED: Causing infinite redirect loop
        // if (!hasActiveCall && loadedFromURL) {
        //   console.log('🔄 Loaded from URL with no active call, redirecting to saved scenarios');
        //   setTimeout(() => {
        //     router.push('/saved-scenarios');
        //   }, 100);
        // }
      }
    } catch (error) {
      console.error('Error ending call:', error)
      console.error('End call error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      // Still open review modal even if upload fails (but only if there was an active call)
      setIsProcessingEndCall(false);
      if (callId && hasActiveCall) {
        console.log('🔄 Opening review modal after error for call:', callId);
        console.log('🔍 Setting reviewModalOpen to true (error path)');
        setReviewModalOpen(true)
        setReviewCallId(callId)
      } else {
        console.log('🔄 Not opening review modal after error - callId:', !!callId, 'hasActiveCall:', hasActiveCall);
        // If no active call, just redirect back to saved scenarios
        // DISABLED: Causing infinite redirect loop
        // if (!hasActiveCall && loadedFromURL) {
        //   console.log('🔄 Loaded from URL with no active call, redirecting to saved scenarios after error');
        //   setTimeout(() => {
        //     router.push('/saved-scenarios');
        //   }, 100);
        // }
      }
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
                             analysisProgress.includes('Generating') ? '90%' :
                             analysisProgress.includes('Finalizing') ? '95%' :
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
            <h1 className="text-lg font-semibold text-slate-900 mb-1">Live Call Simulation</h1>
            <p className="text-sm text-slate-500">
              {scenarioData?.title || 'Loading scenario...'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
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

      {/* Error Alerts */}
      {(audioError || streamingError || transcriptionError) && (
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
                {audioError || streamingError || transcriptionError}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleStartRecording}
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSwitchToText}
              className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              Switch to Text Mode
            </Button>
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
          <div className="h-[500px] bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-8 flex flex-col">
              {/* Voice Waveform Visualization */}
              <div className="flex items-center justify-center space-x-2 mb-8">
                <AudioWaveform 
                  isRecording={isAISpeaking || isUserRecording}
                  isPaused={false}
                  className="h-20"
                />
              </div>

              {/* AI Status and Animated Transcription */}
              <div className="text-center mb-8 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {isAISpeaking ? (
                    <Volume2 className="h-5 w-5 text-primary" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-lg font-medium text-slate-900">
                    {isAISpeaking ? 'Prospect Speaking...' : 'Waiting for your message...'}
                  </span>
                  <Badge className="ml-2 rounded-full px-3 py-1 bg-primary/10 text-primary text-sm font-medium">
                    <Zap className="mr-1 h-3 w-3" />
                    Push-to-Talk
                  </Badge>
                </div>
                
                {/* Synchronized Transcription Display */}
                {showSubtitles && (
                  <div className="min-h-[60px] flex items-center justify-center">
                    {isAISpeaking && currentDisplaySentence ? (
                      <motion.p 
                        key={`${currentSentenceIndex}-${currentDisplaySentence}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="text-muted-foreground max-w-md text-center"
                      >
                        {currentDisplaySentence}
                      </motion.p>
                    ) : isTranscribingMessage ? (
                      <p className="text-slate-500 max-w-md">
                        Transcribing and sending your message...
                      </p>
                    ) : isUserRecording ? (
                      <p className="text-slate-500 max-w-md">
                        Recording your message...
                      </p>
                    ) : currentUserMessage && currentUserMessage !== 'Recording your message...' ? (
                      <p className="text-slate-500 max-w-md">
                        {currentUserMessage}
                      </p>
                    ) : (
                      <p className="text-slate-500 max-w-md">
                        Press Space or click Record to speak
                      </p>
                    )}
                  </div>
                )}
                

                
                {streamingState === 'thinking' && (
                  <p className="text-sm text-primary mt-2">
                    <span className="animate-pulse">●</span> AI is thinking...
                  </p>
                )}
                {isUserRecording && (
                  <p className="text-sm text-green-600 mt-2">
                    <span className="animate-pulse">●</span> Recording your message...
                  </p>
                )}
                {isTranscribingMessage && (
                  <p className="text-sm text-primary mt-2">
                    <span className="animate-pulse">●</span> Transcribing and sending...
                  </p>
                )}
              </div>

              {/* Fixed Record Button at Bottom */}
              <div className="mt-auto">
                {isRecording && (
                  <div className="flex justify-center">
                    {!isUserRecording && !isTranscribingMessage ? (
                      <Button
                        onClick={handleStartUserRecording}
                        disabled={isAISpeaking}
                        className="flex items-center space-x-2 rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-3 font-medium"
                        size="lg"
                      >
                        <Mic className="h-4 w-4" />
                        <span>Record Message</span>
                      </Button>
                    ) : isUserRecording ? (
                      <Button
                        onClick={handleStopUserRecording}
                        className="flex items-center space-x-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-sm"
                        size="lg"
                      >
                        <Square className="h-4 w-4" />
                        <span>Stop & Send</span>
                      </Button>
                    ) : (
                      <Button
                        disabled
                        variant="outline"
                        className="flex items-center space-x-2 rounded-2xl border-slate-200 text-slate-700 shadow-sm"
                        size="lg"
                      >
                        <Send className="h-4 w-4" />
                        <span>Sending...</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
          </div>
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
              {!isRecording ? (
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
                    onClick={handleStartRecording}
                    className="w-full rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 font-medium"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Call
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
                    onClick={() => {
                      console.log('=== END CALL BUTTON CLICKED ===');
                      handleEndCall();
                    }}
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

          {/* Push-to-Talk Instructions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-1 text-center">Push-to-Talk Controls</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3">
                  <Badge className="rounded-full px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium">Space</Badge>
                  <span className="text-slate-700">Start/Stop & auto-send</span>
                </div>
                <div className="text-xs text-slate-500 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p>• Press Space to start recording</p>
                  <p>• Speak your complete message</p>
                  <p>• Press Space to stop</p>
                  <p>• Message automatically sends to AI!</p>
                  <p>• No extra buttons needed!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="subtitles" className="text-sm text-slate-700">Show Subtitles</Label>
                <Switch
                  id="subtitles"
                  checked={showSubtitles}
                  onCheckedChange={setShowSubtitles}
                />
              </div>
              
              <Button 
                variant="outline" 
                className="w-full rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm" 
                onClick={handleSwitchToText}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Switch to Text Chat
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm" 
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
            </div>
          </div>

          {/* Scenario Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Scenario Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Title:</span>
                  <span className="text-right max-w-[150px] truncate text-slate-900 font-medium">{scenarioData?.title || 'Loading...'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Type:</span>
                  <Badge className="rounded-full px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium">Custom Scenario</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Duration:</span>
                  <span className="text-slate-900">{scenarioData?.duration ? `${scenarioData.duration} minutes` : 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Voice:</span>
                  <span className="text-slate-900">{scenarioData?.voice ? scenarioData.voice.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mode:</span>
                  <Badge className="rounded-full px-3 py-1 bg-primary/10 text-primary text-xs font-medium">
                    Push-to-Talk
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={loadedFromURL ? (reviewModalOpen && hasActiveCall) : reviewModalOpen}
        onClose={() => {
          console.log('🔍 ReviewModal onClose called - hasActiveCall:', hasActiveCall, 'loadedFromURL:', loadedFromURL);
          
          setReviewModalOpen(false)
          setReviewCallId(null)
          
          // Only do cleanup and navigation if there was actually a call
          if (hasActiveCall) {
            console.log('🔍 Had active call, doing full cleanup and redirect');
            // Reset simulation state and redirect to dashboard
            setIsProcessingEndCall(false)
            setAnalysisProgress('')
            // Clean up any temporary call data
            if (reviewCallId) {
              sessionStorage.removeItem(`temp_call_${reviewCallId}`)
            }
            
            // Clear scenario data to prevent simulation page from redirecting
            localStorage.removeItem('currentScenario')
            
            // Use setTimeout to ensure modal closes first, then navigate
            setTimeout(() => {
              console.log('🏠 Redirecting to dashboard after call completion')
              // Try router first, fallback to window.location if needed
              try {
                router.push('/dashboard')
              } catch (error) {
                console.warn('Router failed, using window.location:', error)
                window.location.href = '/dashboard'
              }
            }, 100)
          } else {
            console.log('🔍 No active call, skipping navigation');
          }
        }}
        callId={reviewCallId}
        title={scenarioData?.title}
        showUserInfo={userRole === 'manager' || userRole === 'admin'}
      />
    </div>
  )
}