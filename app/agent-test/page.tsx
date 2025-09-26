'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  RealtimeAgent,
  RealtimeSession,
  RealtimeItem
} from '@openai/agents/realtime'
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export default function AgentTestPage() {
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [transcript, setTranscript] = useState<RealtimeItem[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionRef = useRef<RealtimeSession | null>(null)
  const agentRef = useRef<RealtimeAgent | null>(null)

  const handleStartCall = useCallback(async () => {
    try {
      setStatus('connecting')
      setError(null)
      setTranscript([])

      // Fetch ephemeral key from backend
      const response = await fetch('/api/get-client-secret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get client secret: ${response.statusText}`)
      }

      const { client_secret } = await response.json()

      // Create agent with CFO persona
      const agent = new RealtimeAgent({
        name: 'Skeptical CFO',
        instructions: 'You are a skeptical CFO in a sales call. Challenge the sales rep on ROI, budget constraints, and business value. Be professional but demanding of concrete numbers and proof points.',
      })

      agentRef.current = agent

      // Create session with proper configuration
      const session = new RealtimeSession(agent, {
        model: 'gpt-realtime',
        config: {
          inputAudioFormat: 'pcm16',
          outputAudioFormat: 'pcm16',
          inputAudioTranscription: {
            model: 'gpt-4o-mini-transcribe',
          },
        },
      })

      sessionRef.current = session

      // Set up event listeners
      session.on('history_updated', (history: RealtimeItem[]) => {
        setTranscript([...history])
        console.log('Updated transcript:', history)
      })

      session.on('audio_interrupted', () => {
        console.log('Audio interrupted')
      })

      session.on('error', (error: any) => {
        console.error('Session error:', error)
        setError(error.message || 'Unknown error occurred')
        setStatus('error')
      })

      // Connect to the session (WebRTC transport is automatic in browser)
      await session.connect({
        apiKey: client_secret
      })

      setStatus('connected')
      setIsRecording(true)

      console.log('Successfully connected to Realtime API')

    } catch (err: any) {
      console.error('Error starting call:', err)
      setError(err.message || 'Failed to start call')
      setStatus('error')
    }
  }, [])

  const handleEndCall = useCallback(async () => {
    try {
      if (sessionRef.current) {
        await sessionRef.current.close()
        sessionRef.current = null
      }

      agentRef.current = null
      setStatus('disconnected')
      setIsRecording(false)

      // Log final transcript and audio for future processing
      console.log('Final transcript:', transcript)
      console.log('Call ended - transcript and audio logged for coaching pipeline')

    } catch (err: any) {
      console.error('Error ending call:', err)
      setError(err.message || 'Failed to end call properly')
    }
  }, [transcript])

  const handleInterrupt = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.interrupt()
      console.log('Interrupted agent')
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close().catch(console.error)
      }
    }
  }, [])

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      case 'disconnected': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const formatTranscriptItem = (item: RealtimeItem) => {
    if (item.type === 'message') {
      const role = item.role === 'user' ? 'You' : 'CFO'
      const content = item.content?.[0]?.text || item.content || 'No content'
      return { role, content: String(content) }
    }
    return { role: 'System', content: String(item.type || 'Unknown') }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">OpenAI Realtime Agent Test</h1>
          <p className="text-muted-foreground">
            Test the new Realtime API with a skeptical CFO agent
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Status
                <Badge
                  variant="outline"
                  className={`${getStatusColor(status)} text-white border-none`}
                >
                  {status}
                </Badge>
              </CardTitle>
              {isRecording && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Recording
                </div>
              )}
            </div>
            <CardDescription>
              Connect to OpenAI&apos;s Realtime API for voice conversation with a skeptical CFO
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Control Buttons */}
            <div className="flex gap-3 justify-center">
              {status === 'idle' || status === 'disconnected' || status === 'error' ? (
                <Button
                  onClick={handleStartCall}
                  disabled={status === 'connecting'}
                  size="lg"
                  className="gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Start Call
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleEndCall}
                    variant="destructive"
                    size="lg"
                    className="gap-2"
                  >
                    <PhoneOff className="w-4 h-4" />
                    End Call
                  </Button>
                  <Button
                    onClick={handleInterrupt}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <MicOff className="w-4 h-4" />
                    Interrupt
                  </Button>
                </>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Instructions */}
            {status === 'idle' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-blue-700 text-sm">
                  <strong>Instructions:</strong> Click &quot;Start Call&quot; to connect to the Realtime API.
                  The agent will act as a skeptical CFO - try pitching a product or service to them!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcript Card */}
        <Card>
          <CardHeader>
            <CardTitle>Live Transcript</CardTitle>
            <CardDescription>
              Real-time conversation transcript (will be saved for coaching analysis)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transcript.length === 0 ? (
                <p className="text-muted-foreground italic text-center py-8">
                  No conversation yet. Start a call to see the transcript here.
                </p>
              ) : (
                transcript.map((item, index) => {
                  const { role, content } = formatTranscriptItem(item)
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={role === 'You' ? 'default' : 'secondary'}>
                          {role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm pl-4 py-2 bg-gray-50 rounded">
                        {content}
                      </p>
                      {index < transcript.length - 1 && <Separator className="my-2" />}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Technical Info */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Model:</strong> gpt-realtime
              </div>
              <div>
                <strong>Audio Format:</strong> pcm16
              </div>
              <div>
                <strong>Transcription:</strong> gpt-4o-mini-transcribe
              </div>
              <div>
                <strong>Transport:</strong> WebRTC
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}