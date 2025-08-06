'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Play, Save, Settings, Clock, Users, TrendingUp, Mic } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'

export function ScenarioBuilder() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [scenarioData, setScenarioData] = useState({
    title: '',
    prompt: '',
    callType: '',
    difficulty: [3],
    seniority: '',
    duration: '',
    voice: '',
    saveReuse: false,
    enableStreaming: false
  })

  const handleStartSimulation = async () => {
    // Validate required fields
    if (!scenarioData.title || !scenarioData.prompt) {
      toast({
        title: "Missing Information",
        description: "Please fill in the scenario title and description before starting.",
        variant: "destructive",
      })
      return
    }

    // Auto-save scenario if saveReuse is enabled
    if (scenarioData.saveReuse) {
      const saved = await saveScenarioToDatabase()
      if (!saved) {
        return // Don't proceed if save failed
      }
    }

    // Save scenario data to localStorage for simulation page
    const simulationData = {
      ...scenarioData,
      difficulty: scenarioData.difficulty[0],
      timestamp: Date.now()
    }
    localStorage.setItem('currentScenario', JSON.stringify(simulationData))
    
    // Navigate to simulation
    router.push('/simulation')
  }

  const saveScenarioToDatabase = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save scenarios.",
        variant: "destructive",
      })
      return false
    }

    if (!scenarioData.title || !scenarioData.prompt) {
      toast({
        title: "Missing Information",
        description: "Please fill in the scenario title and description.",
        variant: "destructive",
      })
      return false
    }

    setIsSaving(true)
    
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: scenarioData.title,
          prompt: scenarioData.prompt,
          userId: user.id,
          persona: scenarioData.seniority ? `${scenarioData.seniority} Level Prospect` : 'Potential Customer',
          difficulty: scenarioData.difficulty[0] <= 2 ? 'easy' : scenarioData.difficulty[0] <= 4 ? 'medium' : 'hard',
          industry: 'General',
          tags: [scenarioData.callType, scenarioData.seniority].filter(Boolean),
          settings: {
            callType: scenarioData.callType,
            seniority: scenarioData.seniority,
            duration: scenarioData.duration,
            voice: scenarioData.voice,
            enableStreaming: scenarioData.enableStreaming,
            difficulty: scenarioData.difficulty[0]
          }
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Scenario Saved",
          description: "Your scenario has been saved successfully.",
        })
        console.log('Scenario saved:', result)
        return true
      } else {
        const error = await response.text()
        throw new Error(error)
      }
    } catch (error) {
      console.error('Failed to save scenario:', error)
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save scenario. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveScenario = async () => {
    await saveScenarioToDatabase()
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
            <h1 className="text-3xl font-bold tracking-tight">Scenario Builder</h1>
            <p className="text-muted-foreground mt-2">
              Create custom sales training scenarios with AI-powered prospects
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleSaveScenario} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Scenario'}
            </Button>
            <Button onClick={handleStartSimulation}>
              <Play className="mr-2 h-4 w-4" />
              Start Live Simulation
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-2 space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Scenario Details</CardTitle>
              <CardDescription>
                Define the basic parameters of your sales simulation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Scenario Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Enterprise Software Demo Call"
                  value={scenarioData.title}
                  onChange={(e) => setScenarioData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Scenario Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the rep, product, target company, persona, and situation in detail..."
                  className="min-h-[120px]"
                  value={scenarioData.prompt}
                  onChange={(e) => setScenarioData(prev => ({ ...prev, prompt: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the context, objectives, and challenges for the best AI simulation
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Call Type</Label>
                  <Select value={scenarioData.callType} onValueChange={(value) => setScenarioData(prev => ({ ...prev, callType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select call type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discovery-outbound">Discovery Call (Outbound Generated)</SelectItem>
                      <SelectItem value="discovery-inbound">Discovery Call (Inbound Generated)</SelectItem>
                      <SelectItem value="elevator-pitch">Elevator Pitch</SelectItem>
                      <SelectItem value="objection-handling">Objection Handling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prospect Seniority</Label>
                  <Select value={scenarioData.seniority} onValueChange={(value) => setScenarioData(prev => ({ ...prev, seniority: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select seniority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="director">Director</SelectItem>
                      <SelectItem value="vp">VP</SelectItem>
                      <SelectItem value="c-level">C-Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Prospect Difficulty: {scenarioData.difficulty[0]}/5</Label>
                  <Slider
                    value={scenarioData.difficulty}
                    onValueChange={(value) => setScenarioData(prev => ({ ...prev, difficulty: value }))}
                    max={5}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Easy</span>
                    <span>Hard</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Call Duration</Label>
                  <Select value={scenarioData.duration} onValueChange={(value) => setScenarioData(prev => ({ ...prev, duration: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>AI Voice</Label>
                  <Select value={scenarioData.voice} onValueChange={(value) => setScenarioData(prev => ({ ...prev, voice: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional-male">Professional Male</SelectItem>
                      <SelectItem value="professional-female">Professional Female</SelectItem>
                      <SelectItem value="executive-male">Executive Male</SelectItem>
                      <SelectItem value="executive-female">Executive Female</SelectItem>
                      <SelectItem value="casual-male">Casual Male</SelectItem>
                      <SelectItem value="casual-female">Casual Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="save-reuse"
                    checked={scenarioData.saveReuse}
                    onCheckedChange={(checked) => setScenarioData(prev => ({ ...prev, saveReuse: checked }))}
                  />
                  <Label htmlFor="save-reuse">Save for reuse</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-streaming"
                    checked={scenarioData.enableStreaming}
                    onCheckedChange={(checked) => setScenarioData(prev => ({ ...prev, enableStreaming: checked }))}
                  />
                  <Label htmlFor="enable-streaming" className="flex items-center">
                    Enable Real-Time Voice Streaming (beta)
                    <Badge variant="secondary" className="ml-2 text-xs">NEW</Badge>
                  </Label>
                </div>
                
                <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">Voice System:</p>
                  <p>• <strong>Enabled:</strong> Uses ElevenLabs AI voices (requires credits) with speech synthesis fallback</p>
                  <p>• <strong>Disabled:</strong> Uses free browser speech synthesis only</p>
                  <p>• Auto-fallback to speech synthesis when ElevenLabs credits are exhausted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Quick Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Call Type</span>
                <Badge variant="outline">{scenarioData.callType || 'Not set'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Duration</span>
                <Badge variant="outline">
                  <Clock className="mr-1 h-3 w-3" />
                  {scenarioData.duration ? `${scenarioData.duration} min` : 'Not set'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Seniority</span>
                <Badge variant="outline">
                  <Users className="mr-1 h-3 w-3" />
                  {scenarioData.seniority || 'Not set'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Difficulty</span>
                <Badge variant="outline">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {scenarioData.difficulty[0]}/5
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Voice</span>
                <Badge variant="outline">
                  <Mic className="mr-1 h-3 w-3" />
                  {scenarioData.voice || 'Not set'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Streaming</span>
                <Badge variant={scenarioData.enableStreaming ? "default" : "outline"}>
                  {scenarioData.enableStreaming ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="font-medium text-blue-900 dark:text-blue-100">Pro Tip</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Include specific objections you want to practice handling in your scenario description.
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="font-medium text-green-900 dark:text-green-100">Best Practice</p>
                <p className="text-green-700 dark:text-green-300">
                  Start with easier scenarios and gradually increase difficulty as you improve.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
