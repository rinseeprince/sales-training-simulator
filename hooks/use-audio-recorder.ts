import { useState, useRef, useCallback, useEffect } from 'react'

export interface AudioRecorderState {
  isRecording: boolean
  isPaused: boolean
  audioBlob: Blob | null
  audioUrl: string | null
  duration: number
  error: string | null
}

export interface AudioRecorderActions {
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  resetRecording: () => void
  uploadAudio: (metadata: {
    userId: string
    scenarioId: string
    callId: string
    timestamp: string
  }) => Promise<{ success: boolean; audioUrl?: string; error?: string }>
}

export function useAudioRecorder(): AudioRecorderState & AudioRecorderActions {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        } 
      })
      
      streamRef.current = stream
      
      // Create MediaRecorder with fallback MIME types
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
      
      console.log('Using MIME type:', mimeType || 'default')
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? {
        mimeType: mimeType
      } : undefined)
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        console.log('MediaRecorder data available, size:', event.data.size)
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          console.log('Added chunk, total chunks:', chunksRef.current.length)
        }
      }
      
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, chunks count:', chunksRef.current.length)
        const finalMimeType = mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: finalMimeType })
        console.log('Created audio blob, size:', blob.size, 'type:', blob.type)
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        console.log('Audio recording completed successfully')
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }
      
      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      console.log('MediaRecorder started successfully')
      setIsRecording(true)
      setIsPaused(false)
      startTimeRef.current = Date.now()
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
      
    } catch (err) {
      console.error('Error starting recording:', err)
      setError(err instanceof Error ? err.message : 'Failed to start recording')
      
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access and try again.')
      } else if (err instanceof Error && err.name === 'NotSupportedError') {
        setError('Audio recording is not supported in this browser.')
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    console.log('stopRecording called, isRecording:', isRecording, 'mediaRecorder:', !!mediaRecorderRef.current)
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping MediaRecorder...')
      
      // Add a small delay to ensure any pending data is collected
      setTimeout(() => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop()
        }
      }, 100)
      
      setIsRecording(false)
      setIsPaused(false)
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    } else {
      console.warn('Cannot stop recording: mediaRecorder not available or not recording')
    }
  }, [isRecording])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      
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
      
      // Resume duration timer
      startTimeRef.current = Date.now() - (duration * 1000)
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    }
  }, [isRecording, isPaused, duration])

  const uploadAudio = useCallback(async (metadata: {
    userId: string
    scenarioId: string
    callId: string
    timestamp: string
  }) => {
    console.log('uploadAudio called with metadata:', metadata);
    console.log('audioBlob state available:', !!audioBlob, 'size:', audioBlob?.size);
    
    // Use the blob directly from the ref if state is not available
    let blobToUpload = audioBlob;
    if (!blobToUpload && chunksRef.current.length > 0) {
      console.log('Creating blob from chunks, count:', chunksRef.current.length);
      blobToUpload = new Blob(chunksRef.current, { type: 'audio/webm' });
      console.log('Created blob from chunks, size:', blobToUpload.size);
    }
    
    if (!blobToUpload) {
      console.error('No audioBlob available for upload');
      return { success: false, error: 'No audio to upload' }
    }

    try {
      const formData = new FormData()
      formData.append('audioFile', blobToUpload, `call-${metadata.callId}.webm`)
      formData.append('metadata', JSON.stringify(metadata))

      const audioFile = formData.get('audioFile') as File;
      console.log('Uploading to /api/upload-call with formData size:', audioFile?.size);
      
      const response = await fetch('/api/upload-call', {
        method: 'POST',
        body: formData,
      })

      console.log('Upload response status:', response.status);
      const result = await response.json()
      console.log('Upload response result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload audio')
      }

      return { success: true, audioUrl: result.audioUrl }
    } catch (err) {
      console.error('Error uploading audio:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to upload audio' 
      }
    }
  }, [audioBlob])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  return {
    // State
    isRecording,
    isPaused,
    audioBlob,
    audioUrl,
    duration,
    error,
    
    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    uploadAudio,
  }
} 