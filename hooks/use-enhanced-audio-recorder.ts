import { useState, useRef, useCallback, useEffect } from 'react'

export interface EnhancedAudioRecorderState {
  isRecording: boolean
  isPaused: boolean
  audioBlob: Blob | null
  audioUrl: string | null
  duration: number
  error: string | null
}

export interface EnhancedAudioRecorderActions {
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  resetRecording: () => void
  addAudioToMix: (audioElement: HTMLAudioElement) => void
  uploadAudio: (metadata: {
    userId: string
    scenarioId: string
    callId: string
    timestamp: string
  }) => Promise<{ success: boolean; audioUrl?: string; error?: string }>
}

export function useEnhancedAudioRecorder(): EnhancedAudioRecorderState & EnhancedAudioRecorderActions {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mixedStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Audio mixing nodes
  const mixerNodeRef = useRef<GainNode | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const aiAudioSourcesRef = useRef<MediaElementAudioSourceNode[]>([])
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)

  const resetRecording = useCallback(() => {
    setIsRecording(false)
    setIsPaused(false)
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setError(null)
    chunksRef.current = []
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
  }, [])

  const cleanup = useCallback(() => {
    console.log('Cleaning up enhanced audio recorder...')
    
    // Stop all tracks
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
      micStreamRef.current = null
    }
    
    if (mixedStreamRef.current) {
      mixedStreamRef.current.getTracks().forEach(track => track.stop())
      mixedStreamRef.current = null
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close()
      } catch (err) {
        console.warn('Error closing audio context:', err)
      }
      audioContextRef.current = null
    }
    
    // Clear references
    micSourceRef.current = null
    mixerNodeRef.current = null
    destinationRef.current = null
    aiAudioSourcesRef.current = []
    
    console.log('Enhanced audio recorder cleanup completed')
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      console.log('Starting enhanced audio recording with mixed streams...')
      
      // Create audio context for mixing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      
      console.log('AudioContext created, state:', audioContext.state)
      
      // Resume audio context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
        console.log('AudioContext resumed')
      }
      
      // Get microphone stream with ECHO CANCELLATION enabled
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,  // CRITICAL: Enable to prevent feedback loop
          noiseSuppression: true,  // Also helps with audio quality
          autoGainControl: true,   // Prevents volume issues
          sampleRate: 44100,
        } 
      })
      
      console.log('Microphone stream acquired with echo cancellation, tracks:', micStream.getTracks().length)
      micStreamRef.current = micStream
      
      // Create audio nodes for mixing
      const micSource = audioContext.createMediaStreamSource(micStream)
      const mixer = audioContext.createGain()
      const destination = audioContext.createMediaStreamDestination()
      
      micSourceRef.current = micSource
      mixerNodeRef.current = mixer
      destinationRef.current = destination
      
      // Set mixer gain to prevent clipping
      mixer.gain.setValueAtTime(0.8, audioContext.currentTime) // Slightly higher since we have echo cancellation
      
      // Connect microphone to mixer
      micSource.connect(mixer)
      mixer.connect(destination)
      
      const mixedStream = destination.stream
      mixedStreamRef.current = mixedStream
      
      console.log('Audio mixing nodes created and connected with echo cancellation')
      
      // Create MediaRecorder with mixed stream
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''
          }
        }
      }
      
      console.log('Using MIME type for mixed recording:', mimeType || 'default')
      
      const mediaRecorder = new MediaRecorder(mixedStream, mimeType ? {
        mimeType: mimeType
      } : undefined)
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        console.log('Mixed MediaRecorder data available, size:', event.data.size)
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          console.log('Added mixed chunk, total chunks:', chunksRef.current.length)
        }
      }
      
      mediaRecorder.onstop = () => {
        console.log('Mixed MediaRecorder stopped, chunks count:', chunksRef.current.length)
        const finalMimeType = mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: finalMimeType })
        console.log('Created mixed audio blob, size:', blob.size, 'type:', blob.type)
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        console.log('Mixed audio recording completed successfully')
        
        // Cleanup
        cleanup()
      }
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setError('Recording error occurred')
        cleanup()
      }
      
      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      console.log('Mixed MediaRecorder started successfully')
      setIsRecording(true)
      startTimeRef.current = Date.now()
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
      }, 1000)
      
    } catch (err) {
      console.error('Failed to start mixed recording:', err)
      setError(err instanceof Error ? err.message : 'Failed to start recording')
      cleanup()
    }
  }, [cleanup])

  const addAudioToMix = useCallback((audioElement: HTMLAudioElement) => {
    if (!audioContextRef.current || !mixerNodeRef.current) {
      console.warn('Audio context not ready for mixing')
      return
    }
    
    try {
      console.log('Adding AI audio element to mix...')
      
      // Create source from audio element
      const audioSource = audioContextRef.current.createMediaElementSource(audioElement)
      
      // Create gain node for AI audio to control volume
      const aiGain = audioContextRef.current.createGain()
      aiGain.gain.setValueAtTime(0.6, audioContextRef.current.currentTime) // Lower than mic to prevent dominance
      
      // Connect AI audio to gain node
      audioSource.connect(aiGain)
      
      // Split the signal: send to both mixer (recording) and speakers (playback)
      aiGain.connect(mixerNodeRef.current)  // For recording
      aiGain.connect(audioContextRef.current.destination)  // For user to hear
      
      console.log('AI audio connected to both recording mixer and speakers (with echo cancellation)')
      
      // Keep reference to prevent garbage collection
      aiAudioSourcesRef.current.push(audioSource)
      
      console.log('Added AI audio to mix, total sources:', aiAudioSourcesRef.current.length)
    } catch (err) {
      console.error('Failed to add audio to mix:', err)
      // Don't throw error, just log it - recording should continue
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping mixed recording...')
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    }
  }, [isRecording])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      console.log('Mixed recording paused')
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    }
  }, [isRecording, isPaused])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      console.log('Mixed recording resumed')
      
      // Restart duration timer
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
      }, 1000)
    }
  }, [isRecording, isPaused])

  const uploadAudio = useCallback(async (metadata: {
    userId: string
    scenarioId: string
    callId: string
    timestamp: string
  }) => {
    console.log('uploadMixedAudio called with metadata:', metadata);
    console.log('audioBlob state available:', !!audioBlob, 'size:', audioBlob?.size);
    
    let blobToUpload = audioBlob;
    if (!blobToUpload && chunksRef.current.length > 0) {
      console.log('Creating blob from mixed chunks, count:', chunksRef.current.length);
      blobToUpload = new Blob(chunksRef.current, { type: 'audio/webm' });
      console.log('Created blob from mixed chunks, size:', blobToUpload.size);
    }
    
    if (!blobToUpload) {
      console.error('No mixed audioBlob available for upload');
      return { success: false, error: 'No audio to upload' }
    }

    try {
      const formData = new FormData()
      formData.append('audioFile', blobToUpload, `mixed-call-${metadata.callId}.webm`)
      formData.append('metadata', JSON.stringify(metadata))

      const audioFile = formData.get('audioFile') as File;
      console.log('Uploading mixed audio to /api/upload-call with formData size:', audioFile?.size);
      
      const response = await fetch('/api/upload-call', {
        method: 'POST',
        body: formData,
      })

      console.log('Mixed upload response status:', response.status);
      const result = await response.json()
      console.log('Mixed upload response result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload mixed audio')
      }

      return { success: true, audioUrl: result.audioUrl }
    } catch (err) {
      console.error('Error uploading mixed audio:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to upload mixed audio' 
      }
    }
  }, [audioBlob])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [cleanup])

  return {
    isRecording,
    isPaused,
    audioBlob,
    audioUrl,
    duration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    addAudioToMix,
    uploadAudio
  }
}