'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX,
  RotateCcw,
  SkipBack,
  SkipForward
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AudioPlayerProps {
  audioUrl: string | null
  title?: string
  duration?: number
  className?: string
  showWaveform?: boolean
  autoPlay?: boolean
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
}

interface WaveformPoint {
  time: number
  amplitude: number
}

export function AudioPlayer({ 
  audioUrl, 
  title = "Audio Recording",
  duration = 0,
  className,
  showWaveform = true,
  autoPlay = false,
  onTimeUpdate,
  onEnded
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [waveformData, setWaveformData] = useState<WaveformPoint[]>([])

  const audioRef = useRef<HTMLAudioElement>(null)
  const animationFrameRef = useRef<number>()

  // Generate mock waveform data for visualization
  useEffect(() => {
    if (showWaveform && duration > 0) {
      const points: WaveformPoint[] = []
      const numPoints = 100
      
      for (let i = 0; i < numPoints; i++) {
        const time = (i / numPoints) * duration
        // Generate realistic-looking waveform data
        const amplitude = 0.3 + 0.7 * Math.random() * Math.sin(i * 0.5) * Math.cos(i * 0.3)
        points.push({ time, amplitude })
      }
      
      setWaveformData(points)
    }
  }, [showWaveform, duration])

  // Handle audio loading
  useEffect(() => {
    if (!audioUrl) {
      setError('No audio file available')
      return
    }

    setError(null)
    setIsLoading(true)

    const audio = audioRef.current
    if (!audio) return

    audio.src = audioUrl
    audio.load()

    const handleCanPlay = () => {
      setIsLoading(false)
      if (autoPlay) {
        audio.play().catch(console.error)
      }
    }

    const handleError = () => {
      setIsLoading(false)
      setError('Failed to load audio file')
    }

    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
    }
  }, [audioUrl, autoPlay])

  // Update current time
  const updateTime = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    setCurrentTime(audio.currentTime)
    onTimeUpdate?.(audio.currentTime)

    if (audio.ended) {
      setIsPlaying(false)
      onEnded?.()
    } else {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    }
  }, [onTimeUpdate, onEnded])

  // Start time tracking
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, updateTime])

  // Play/pause toggle
  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        await audio.play()
        setIsPlaying(true)
      }
    } catch (err) {
      console.error('Audio playback error:', err)
      setError('Failed to play audio')
    }
  }

  // Stop playback
  const stopPlayback = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
    setCurrentTime(0)
  }

  // Seek to specific time
  const seekTo = (time: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = Math.max(0, Math.min(time, duration))
    setCurrentTime(audio.currentTime)
  }

  // Skip forward/backward
  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = Math.max(0, Math.min(audio.currentTime + seconds, duration))
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Format time display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    
    const audio = audioRef.current
    if (audio) {
      audio.volume = newVolume
    }
  }

  // Toggle mute
  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted) {
      audio.volume = volume
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  if (!audioUrl) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <VolumeX className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No audio recording available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <VolumeX className="mx-auto h-12 w-12 mb-4" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Waveform Visualization */}
        {showWaveform && waveformData.length > 0 && (
          <div className="relative h-20 bg-muted rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              {waveformData.map((point, index) => {
                const progress = currentTime / duration
                const pointProgress = point.time / duration
                const isPlayed = pointProgress <= progress
                
                return (
                  <div
                    key={index}
                    className="flex-1 mx-px bg-primary/30 rounded-sm transition-all duration-100"
                    style={{
                      height: `${point.amplitude * 100}%`,
                      backgroundColor: isPlayed ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)',
                      cursor: 'pointer'
                    }}
                    onClick={() => seekTo(point.time)}
                    title={`Seek to ${formatTime(point.time)}`}
                  />
                )
              })}
            </div>
            
            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 transition-all duration-100"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        )}

        {/* Time Display */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Progress Slider */}
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          onValueChange={(value) => seekTo(value[0])}
          className="w-full"
        />

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => skip(-10)}
            disabled={isLoading}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={stopPlayback}
            disabled={isLoading}
          >
            <Square className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-12 h-12 rounded-full"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => skip(10)}
            disabled={isLoading}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            disabled={isLoading}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
        </div>
      </CardContent>
      
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />
    </Card>
  )
} 