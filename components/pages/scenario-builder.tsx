'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'
import { compileProspectPrompt } from '@/lib/prompt-compiler'

export function ScenarioBuilder() {
  const router = useRouter()
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [scenarioData, setScenarioData] = useState({
    title: '',
    prompt: '',
    duration: '',
    voice: '',
    saveReuse: false
  })
  const [savedScenarios, setSavedScenarios] = useState([])
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Load saved scenarios and check for edit mode
  useEffect(() => {
    loadSavedScenarios()
    
    // Check if we're editing a scenario
    const editScenario = localStorage.getItem('editScenario')
    if (editScenario) {
      try {
        const parsed = JSON.parse(editScenario)
        setScenarioData(parsed)
        localStorage.removeItem('editScenario')
      } catch (error) {
        console.error('Failed to load edit scenario:', error)
      }
    }
  }, [user])

  const loadSavedScenarios = async () => {
    if (!user) return
    
    try {
      // Get the correct user ID from simple_users table
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        console.error('Failed to get user profile:', profileData.error);
        return;
      }

      const actualUserId = profileData.userProfile.id;
      
      const response = await fetch(`/api/scenarios?userId=${actualUserId}`)
      if (response.ok) {
        const data = await response.json()
        setSavedScenarios(data.scenarios || [])
      }
    } catch (error) {
      console.error('Error loading saved scenarios:', error)
    }
  }

  const handleLoadScenario = (scenario: any) => {
    setScenarioData({
      title: scenario.title,
      prompt: scenario.prompt,
      duration: scenario.duration || '',
      voice: scenario.voice || '',
      saveReuse: true
    })
    
    toast({
      title: "Scenario Loaded",
      description: `Loaded "${scenario.title}" successfully`,
    })
  }

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
      title: scenarioData.title,
      prompt: scenarioData.prompt,
      duration: scenarioData.duration,
      voice: scenarioData.voice,
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
      // Get the correct user ID from simple_users table
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile: ' + profileData.error);
      }

      const actualUserId = profileData.userProfile.id;
      
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: scenarioData.title,
          prompt: scenarioData.prompt,
          duration: scenarioData.duration,
          voice: scenarioData.voice,
          userId: actualUserId
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
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scenario Builder</h1>
            <p className="text-muted-foreground mt-2">
              Create your sales scenario to start a live simulation with AI-powered prospects
            </p>
          </div>
          <Button onClick={handleStartSimulation}>
            <Play className="mr-2 h-4 w-4" />
            Start Live Simulation
          </Button>
        </div>
      </motion.div>

      <div className="space-y-8">
        {/* Load Saved Scenario Section */}
        {savedScenarios.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Load Saved Scenario</CardTitle>
                <CardDescription>
                  Start with a previously saved scenario template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="saved-scenario-select">Choose a saved scenario</Label>
                  <Select onValueChange={(value) => {
                    if (value && value !== 'none') {
                      const scenario = savedScenarios.find((s: any) => s.id === value)
                      if (scenario) {
                        handleLoadScenario(scenario)
                      }
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved scenario to load..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a scenario...</SelectItem>
                      {savedScenarios.map((scenario: any) => (
                        <SelectItem key={scenario.id} value={scenario.id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex-1">
                              <div className="font-medium">{scenario.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {scenario.duration && `${scenario.duration} min`} {scenario.voice && `• ${scenario.voice}`}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form - Takes 2 columns */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
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
                  <Label htmlFor="prompt">Prospect & Scenario Description</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe your prospect and scenario naturally..."
                    className="min-h-[175px]"
                    value={scenarioData.prompt}
                    onChange={(e) => setScenarioData(prev => ({ ...prev, prompt: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Write this as if you're briefing a human actor on who to play. The more specific and human you are, the better the AI will perform.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="save-reuse"
                      checked={scenarioData.saveReuse}
                      onCheckedChange={(checked) => setScenarioData(prev => ({ ...prev, saveReuse: checked }))}
                    />
                    <Label htmlFor="save-reuse">Save for reuse</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Sidebar - Takes 1 column */}
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
                  <span className="text-sm">Duration</span>
                  <Badge variant="outline">
                    <Clock className="mr-1 h-3 w-3" />
                    {scenarioData.duration ? `${scenarioData.duration} min` : 'Not set'}
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
                  <span className="text-sm">Save for Reuse</span>
                  <Badge variant={scenarioData.saveReuse ? "default" : "outline"}>
                    {scenarioData.saveReuse ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                              <div className="p-3 bg-teal-50 dark:bg-teal-950 rounded-lg">
                <p className="font-medium text-teal-900 dark:text-teal-100">Write Human Scenarios</p>
                <p className="text-teal-700 dark:text-teal-300">
                    Describe the prospect like a real person with specific motivations, challenges, and personality traits.
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="font-medium text-green-900 dark:text-green-100">Include Context</p>
                  <p className="text-green-700 dark:text-green-300">
                    Explain how this conversation came about - was it inbound, outbound, referral? This context shapes everything.
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">Be Specific</p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    "Busy but interested" is better than difficulty levels. "Burned by vendors before" sets clear expectations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* AI Engine Settings - Full width below */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Engine Settings</CardTitle>
                  <CardDescription>
                    Configure advanced AI behavior and preview compiled prompts
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showPromptPreview}
                    onCheckedChange={setShowPromptPreview}
                  />
                  <Label>Show Prompt Preview</Label>
                </div>
              </div>
            </CardHeader>
            {showPromptPreview && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Compiled System Prompt</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      This is the exact prompt that will be sent to {process.env.NEXT_PUBLIC_AI_SIM_MODEL || 'gpt-4o'}
                    </p>
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">
                      {useMemo(() => {
                        if (!scenarioData.prompt) {
                          return "Enter a scenario description to see the AI prompt preview..."
                        }
                        
                        return `You are playing the role of a prospect in a sales simulation.

SCENARIO CONTEXT:
${scenarioData.prompt}

INSTRUCTIONS:
- Respond naturally as the person described in the scenario
- Stay true to the personality, motivations, and context provided
- React authentically based on the situation described
- Don't break character or reveal you are an AI
- Let the scenario description guide your level of interest, skepticism, or cooperation
- Respond with the depth and detail that this person would naturally provide

Remember: You are this specific person in this specific situation. Be human, be authentic, be consistent with the character described.`;
                      }, [scenarioData.prompt])}
                    </pre>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      Using model: <span className="font-mono">{process.env.NEXT_PUBLIC_AI_SIM_MODEL || 'gpt-4o'}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                    </Button>
                  </div>
                  {showAdvanced && (
                    <div className="space-y-4 p-4 border rounded">
                      <div>
                        <Label>Custom System Prompt Additions</Label>
                        <Textarea 
                          placeholder="Add custom instructions that will be appended to the compiled prompt..."
                          className="mt-2"
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Temperature</Label>
                          <Input type="number" defaultValue="0.7" step="0.1" min="0" max="2" />
                        </div>
                        <div>
                          <Label className="text-sm">Max Tokens</Label>
                          <Input type="number" defaultValue="180" min="50" max="500" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
