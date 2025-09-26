import { useCallback, useEffect, useRef } from 'react'
import { useEnhancedAudioRecorder } from './use-enhanced-audio-recorder'

export function useElevenLabsRecorder() {
  const recorder = useEnhancedAudioRecorder()
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  // Initialize audio context for capturing ElevenLabs audio
  const initializeAudioCapture = useCallback(async () => {
    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      audioContextRef.current = audioContext
      
      // Get user media for microphone
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      
      streamRef.current = micStream
      return { audioContext, micStream }
    } catch (error) {
      console.error('Failed to initialize audio capture:', error)
      throw error
    }
  }, [])
  
  // Capture audio from ElevenLabs conversation
  const captureConversationAudio = useCallback((audioElement: HTMLAudioElement) => {
    if (!audioContextRef.current) return
    
    try {
      // Create source from ElevenLabs audio element
      const source = audioContextRef.current.createMediaElementSource(audioElement)
      
      // Connect to our enhanced recorder's audio mixer
      if (recorder.addAudioToMix) {
        recorder.addAudioToMix(audioElement)
      }
      
      console.log('ElevenLabs audio captured and mixed with recorder')
    } catch (error) {
      console.error('Failed to capture ElevenLabs audio:', error)
    }
  }, [recorder])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])
  
  return {
    ...recorder,
    initializeAudioCapture,
    captureConversationAudio,
  }
}