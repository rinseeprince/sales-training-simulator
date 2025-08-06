'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, TrendingUp, Clock, MessageSquare, ThumbsUp, ThumbsDown, Play, Award, RotateCcw, Headphones } from 'lucide-react'
import { AudioPlayer } from '@/components/ui/audio-player'
import { useCallData } from '@/hooks/use-call-data'
import { useAuth } from '@/components/auth-provider'
import { useSearchParams } from 'next/navigation'

const callData = {
  score: 87,
  talkRatio: { rep: 65, ai: 35 },
  objections: ['Price too high', 'Need to think about it', 'Not the right time'],
  ctaUsed: true,
  confidence: 'High',
  sentiment: 'Friendly',
  duration: '18:32',
  date: '2024-01-15',
  audioUrl: null // Will be populated from actual call data
}

const feedback = [
  'Excellent opening - you clearly stated the value proposition within the first 30 seconds',
  'Good job handling the price objection by focusing on ROI rather than defending the cost',
  'Consider asking more discovery questions before presenting features',
  'Strong close with a clear next step and timeline',
  'Room for improvement: Listen more actively to prospect concerns'
]

const transcript = [
  { timestamp: '00:15', speaker: 'Rep', text: 'Hi John, this is Sarah from TechSolutions. I know you\'re busy, so I\'ll be brief. I\'m calling because...' },
  { timestamp: '00:45', speaker: 'AI', text: 'I appreciate you calling, but we\'re pretty happy with our current solution.' },
  { timestamp: '01:02', speaker: 'Rep', text: 'I understand that completely. Many of our best clients said the same thing initially. Can I ask what you like most about your current setup?' },
  { timestamp: '01:25', speaker: 'AI', text: 'Well, it works for what we need, but honestly, we\'ve been having some integration issues lately...' },
  // More transcript entries...
]

export function PostCallReview() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const callId = searchParams.get('callId')
  
  const { call, loading, error } = useCallData({ 
    callId: callId || undefined, 
    userId: user?.id 
  })
  
  const [managerComments, setManagerComments] = useState('')
  const [certificationLevel, setCertificationLevel] = useState('')

  const handleApprove = () => {
    console.log('Call approved')
  }

  const handleRequestRetry = () => {
    console.log('Retry requested')
  }

  // Use real call data or fallback to demo data
  const displayData = call || callData
  const hasAudio = call?.audio_url || callData.audioUrl
  
  console.log('Review page data:', {
    callId,
    call: call ? {
      id: call.id,
      audio_url: call.audio_url,
      hasAudioUrl: !!call.audio_url
    } : null,
    hasAudio,
    displayData: displayData ? {
      id: displayData.id,
      audio_url: displayData.audio_url
    } : null
  });

  // Type guard to check if we have real call data
  const isRealCall = (data: any): data is typeof call => {
    return data && typeof data === 'object' && 'id' in data
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error loading call data: {error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Post-Call Review</h1>
            <p className="text-muted-foreground mt-2">
              Enterprise Software Demo - Completed {isRealCall(displayData) && displayData.created_at ? new Date(displayData.created_at).toLocaleDateString() : callData.date}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleRequestRetry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Request Re-try
            </Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{displayData.score}/100</div>
            <Progress value={displayData.score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Talk Ratio</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isRealCall(displayData) && displayData.talk_ratio ? displayData.talk_ratio : callData.talkRatio.rep}% / {100 - (isRealCall(displayData) && displayData.talk_ratio ? displayData.talk_ratio : callData.talkRatio.rep)}%</div>
            <p className="text-xs text-muted-foreground">Rep / Prospect</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CTA Used</CardTitle>
            {callData.ctaUsed ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isRealCall(displayData) && displayData.cta_used !== undefined ? (displayData.cta_used ? 'Yes' : 'No') : (callData.ctaUsed ? 'Yes' : 'No')}
            </div>
            <p className="text-xs text-muted-foreground">
              Clear next steps provided
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callData.confidence}</div>
            <Badge variant="secondary" className="mt-1">
              {displayData.sentiment || callData.sentiment}
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Objections Handled */}
          <Card>
            <CardHeader>
              <CardTitle>Objections Handled</CardTitle>
              <CardDescription>
                Key objections raised during the call and how they were addressed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(isRealCall(displayData) && displayData.objections_handled ? Array(displayData.objections_handled).fill('Objection handled') : callData.objections).map((objection: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{objection}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Feedback</CardTitle>
              <CardDescription>
                Detailed analysis of your performance with actionable insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(isRealCall(displayData) && displayData.feedback ? displayData.feedback : feedback).map((item: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    {index < 2 ? (
                      <ThumbsUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ThumbsDown className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Call Recording */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Headphones className="h-5 w-5" />
                Call Recording
              </CardTitle>
              <CardDescription>
                Listen to the full call recording with waveform visualization and seeking controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioPlayer 
                audioUrl={call?.audio_url || callData.audioUrl}
                title="Call Recording"
                duration={isRealCall(displayData) && displayData.duration ? displayData.duration : 0}
                showWaveform={true}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle>Call Transcript</CardTitle>
              <CardDescription>
                Timestamped conversation with playback controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {transcript.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                      <Play className="h-3 w-3" />
                    </Button>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                        <Badge variant={entry.speaker === 'Rep' ? 'default' : 'secondary'}>
                          {entry.speaker}
                        </Badge>
                      </div>
                      <p className="text-sm">{entry.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          {/* Manager Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Manager Comments</CardTitle>
              <CardDescription>
                Add your feedback and notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add your comments about this call..."
                value={managerComments}
                onChange={(e) => setManagerComments(e.target.value)}
                className="min-h-[100px]"
              />
              <Button className="w-full">
                Save Comments
              </Button>
            </CardContent>
          </Card>

          {/* Certification */}
          <Card>
            <CardHeader>
              <CardTitle>Certification Level</CardTitle>
              <CardDescription>
                Set the certification level for this performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={certificationLevel} onValueChange={setCertificationLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select certification level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze - Needs Improvement</SelectItem>
                  <SelectItem value="silver">Silver - Meets Standards</SelectItem>
                  <SelectItem value="gold">Gold - Exceeds Standards</SelectItem>
                  <SelectItem value="platinum">Platinum - Expert Level</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" disabled={!certificationLevel}>
                <Award className="mr-2 h-4 w-4" />
                Certify Performance
              </Button>
            </CardContent>
          </Card>

          {/* Call Details */}
          <Card>
            <CardHeader>
              <CardTitle>Call Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span>{isRealCall(displayData) && displayData.duration ? `${Math.floor(displayData.duration / 60)}:${(displayData.duration % 60).toString().padStart(2, '0')}` : callData.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{isRealCall(displayData) && displayData.created_at ? new Date(displayData.created_at).toLocaleDateString() : callData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>Discovery Call (Outbound Generated)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prospect:</span>
                <span>C-Level</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Difficulty:</span>
                <span>Hard (4/5)</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
