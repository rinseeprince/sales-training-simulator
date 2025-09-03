'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Play, Save, Settings, TrendingUp, Mic, FileText, User, MessageSquare, Lightbulb, BookOpen, Folder } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'


export function ScenarioBuilder() {
  const router = useRouter()
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [scenarioData, setScenarioData] = useState({
    title: '',
    prompt: '',
    voice: '',
    saveReuse: false
  })
  const [savedScenarios, setSavedScenarios] = useState([])


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
    <div className="space-y-6">
      {/* Compressed Hero Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] px-6 py-4 h-20"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Scenario Builder</h1>
          <p className="text-sm text-slate-500">
            Create your sales scenario to start a live simulation
          </p>
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* Load Saved Scenario Section */}
        {savedScenarios.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
          >
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Load Saved Scenario</h3>
                  <p className="text-sm text-slate-500">Start with a previously saved scenario template</p>
                </div>
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Folder className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="saved-scenario-select" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Choose a saved scenario</Label>
              <Select onValueChange={(value) => {
                if (value && value !== 'none') {
                  const scenario = savedScenarios.find((s: any) => s.id === value)
                  if (scenario) {
                    handleLoadScenario(scenario)
                  }
                }
              }}>
                <SelectTrigger className="rounded-lg border-slate-200 px-4 py-3 focus:ring-primary">
                  <SelectValue placeholder="Select a saved scenario to load..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a scenario...</SelectItem>
                  {savedScenarios.map((scenario: any) => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1">
                          <div className="font-medium">{scenario.title}</div>
                          <div className="text-xs text-slate-500">
                            {scenario.voice && `${scenario.voice}`}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form - Takes 2 columns */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
              <div className="mb-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Scenario Details</h3>
                    <p className="text-sm text-slate-500">Define the basic parameters of your sales simulation</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="save-reuse"
                      checked={scenarioData.saveReuse}
                      onCheckedChange={(checked) => setScenarioData(prev => ({ ...prev, saveReuse: checked }))}
                    />
                    <Label htmlFor="save-reuse" className="text-sm text-slate-700">Save for reuse</Label>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Scenario Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Enterprise Software Demo Call"
                    value={scenarioData.title}
                    onChange={(e) => setScenarioData(prev => ({ ...prev, title: e.target.value }))}
                    className="rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
                  />
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">AI Voice</Label>
                    <Select value={scenarioData.voice} onValueChange={(value) => setScenarioData(prev => ({ ...prev, voice: value }))}>
                      <SelectTrigger className="rounded-lg border-slate-200 px-4 py-3 focus:ring-primary">
                        <SelectValue placeholder="Select AI voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional-male">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">Professional</Badge>
                            <span>Male</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="professional-female">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">Professional</Badge>
                            <span>Female</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="executive-male">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">Executive</Badge>
                            <span>Male</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="executive-female">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">Executive</Badge>
                            <span>Female</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="casual-male">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">Casual</Badge>
                            <span>Male</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="casual-female">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">Casual</Badge>
                            <span>Female</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="prompt" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Prospect & Scenario Description</Label>
                    <Textarea
                      id="prompt"
                      placeholder="Describe your prospect and scenario naturally..."
                      className="min-h-[175px] rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
                      value={scenarioData.prompt}
                      onChange={(e) => setScenarioData(prev => ({ ...prev, prompt: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <Button
                    onClick={handleStartSimulation}
                    disabled={!scenarioData.title || !scenarioData.prompt}
                    className="w-full rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 font-medium"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Live Simulation
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Sidebar - Takes 1 column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center">
                  <Settings className="mr-2 h-5 w-5 text-primary" />
                  Quick Settings
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Voice</span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-sm font-medium">
                    <Mic className="mr-1 h-3 w-3" />
                    {scenarioData.voice ? scenarioData.voice.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Save for Reuse</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    scenarioData.saveReuse ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {scenarioData.saveReuse ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6">
              <div className="mb-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Tips</h3>
                  </div>
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="flex items-center space-x-2 mb-1">
                    <User className="h-4 w-4 text-primary" />
                    <p className="font-medium text-primary">Write Human Scenarios</p>
                  </div>
                  <p className="text-primary/80">
                    Describe the prospect like a real person with specific motivations, challenges, and personality traits.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center space-x-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <p className="font-medium text-emerald-900">Include Context</p>
                  </div>
                  <p className="text-emerald-700">
                    Explain how this conversation came about - was it inbound, outbound, referral? This context shapes everything.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center space-x-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                    <p className="font-medium text-amber-900">Be Specific</p>
                  </div>
                  <p className="text-amber-700">
                    "Busy but interested" is better than difficulty levels. "Burned by vendors before" sets clear expectations.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>



      </div>
    </div>
  )
}
