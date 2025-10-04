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
import { Play, Settings, TrendingUp, Mic, User, MessageSquare, Lightbulb } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'
import { REGIONAL_VOICES, getVoicesByRegion } from '@/lib/voice-constants'
import { useSimulationLimit } from '@/hooks/use-simulation-limit'
import { PaywallModal } from '@/components/ui/paywall-modal'


export function ScenarioBuilder() {
  const router = useRouter()
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const { checkSimulationLimit, isChecking } = useSimulationLimit()
  const [isSaving, setIsSaving] = useState(false)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [simulationLimit, setSimulationLimit] = useState<any>(null)
  const [scenarioData, setScenarioData] = useState({
    title: '',
    prompt: '',
    prospectName: '', // Add prospect name field
    voice: '',
    saveReuse: false
  })



  // Check for edit mode
  useEffect(() => {
    // Check if we're editing a scenario
    const editScenario = localStorage.getItem('editScenario')
    if (editScenario) {
      try {
        const parsed = JSON.parse(editScenario)
        setScenarioData({
          title: parsed.title,
          prompt: parsed.prompt,
          prospectName: parsed.prospect_name || '',
          voice: parsed.voice || '',
          saveReuse: true
        })
        localStorage.removeItem('editScenario')
      } catch (error) {
        console.error('Failed to load edit scenario:', error)
      }
    }
    
    // Check if we're running a selected scenario
    const selectedScenario = localStorage.getItem('selectedScenario')
    if (selectedScenario) {
      try {
        const parsed = JSON.parse(selectedScenario)
        setScenarioData({
          title: parsed.title,
          prompt: parsed.prompt,
          prospectName: parsed.prospectName || '',
          voice: parsed.voice || '',
          saveReuse: false
        })
        // Store assignment ID if present
        if (parsed.assignmentId) {
          localStorage.setItem('currentAssignmentId', parsed.assignmentId)
        }
        localStorage.removeItem('selectedScenario')
      } catch (error) {
        console.error('Failed to load selected scenario:', error)
      }
    }
  }, [user])





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

    // Check simulation limit before proceeding
    if (user) {
      const limitCheck = await checkSimulationLimit();
      if (limitCheck) {
        setSimulationLimit(limitCheck);
        
        // If user can't simulate, show paywall modal
        if (!limitCheck.canSimulate) {
          setIsPaywallOpen(true);
          return;
        }
        
        // Show warning if approaching limit
        if (limitCheck.remaining <= 3 && limitCheck.remaining > 0 && !limitCheck.isPaid) {
          setIsPaywallOpen(true);
          return;
        }
      }
    }

    // Proceed with simulation start
    startSimulation()
  }

  const startSimulation = () => {
    // Auto-save scenario if saveReuse is enabled
    if (scenarioData.saveReuse) {
      saveScenarioToDatabase().then(saved => {
        if (!saved) return // Don't proceed if save failed
        proceedToSimulation()
      })
    } else {
      proceedToSimulation()
    }
  }

  const proceedToSimulation = () => {
    // Save scenario data to localStorage for simulation page
    const assignmentId = localStorage.getItem('currentAssignmentId')
    const simulationData = {
      title: scenarioData.title,
      prompt: scenarioData.prompt,
      prospectName: scenarioData.prospectName,
      voice: scenarioData.voice,
      assignmentId: assignmentId || undefined,
      timestamp: Date.now()
    }
    
    // Don't clear assignment ID here - it needs to persist for re-runs
    // Assignment ID will be cleared after successful save in post-call-review
    console.log('🔍 Saving to localStorage:', simulationData);
    console.log('🔍 scenarioData.prospectName:', scenarioData.prospectName);
    localStorage.setItem('currentScenario', JSON.stringify(simulationData))
    
    // Navigate to simulation
    router.push('/simulation')
  }

  const handlePaywallClose = () => {
    setIsPaywallOpen(false);
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
      // Get auth token for API request
      const { getAuthToken } = await import('@/lib/api-client');
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated - please sign in again');
      }

      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: scenarioData.title,
          prompt: scenarioData.prompt,
          prospectName: scenarioData.prospectName,
          voice: scenarioData.voice,
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

  // const handleSaveScenario = async () => {
  //   await saveScenarioToDatabase()
  // }

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prospectName" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Prospect Name</Label>
                    <Input
                      id="prospectName"
                      placeholder="e.g., Sarah Johnson"
                      value={scenarioData.prospectName}
                      onChange={(e) => setScenarioData(prev => ({ ...prev, prospectName: e.target.value }))}
                      className="rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Prospect Voice</Label>
                    <Select value={scenarioData.voice} onValueChange={(value) => setScenarioData(prev => ({ ...prev, voice: value }))}>
                      <SelectTrigger className="rounded-lg border-slate-200 px-4 py-3 focus:ring-primary">
                        <SelectValue placeholder="Select prospect voice" />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {Object.entries(getVoicesByRegion()).map(([region, voices]) => (
                          <div key={region}>
                            {/* Region Header */}
                            <div className="px-2 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border-b border-slate-100 flex items-center space-x-2">
                              <span>{voices[0]?.flagEmoji}</span>
                              <span>{region === 'US' ? 'United States' : 'United Kingdom'} Accent</span>
                            </div>
                            
                            {/* Voice Options for this Region */}
                            {voices.map((voice) => (
                              <SelectItem key={voice.id} value={voice.id}>
                                <div className="flex items-center space-x-3">
                                  <span className="text-lg">{voice.flagEmoji}</span>
                                  <div className="flex items-center space-x-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs capitalize ${
                                        voice.style === 'professional' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                        voice.style === 'executive' ? 'border-purple-200 text-purple-700 bg-purple-50' :
                                        'border-green-200 text-green-700 bg-green-50'
                                      }`}
                                    >
                                      {voice.style}
                                    </Badge>
                                    <span className="font-medium">{voice.gender === 'MALE' ? 'Male' : 'Female'}</span>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                            
                            {/* Add some spacing between regions */}
                            {region !== 'UK' && <div className="h-2" />}
                          </div>
                        ))}
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
                    disabled={!scenarioData.title || !scenarioData.prompt || isChecking}
                    className="w-full rounded-xl bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 font-medium"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isChecking ? 'Checking...' : 'Start Live Simulation'}
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
                  <span className="text-sm text-slate-700">Prospect Voice</span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-sm font-medium">
                    <Mic className="mr-1 h-3 w-3" />
                    {scenarioData.voice ? 
                      (() => {
                        const voice = REGIONAL_VOICES.find(v => v.id === scenarioData.voice);
                        return voice ? `${voice.flagEmoji} ${voice.name}` : 'Legacy Voice';
                      })()
                      : 'Not set'
                    }
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

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={handlePaywallClose}
        simulationLimit={simulationLimit}
        title={simulationLimit?.canSimulate ? "Upgrade to Continue" : "Simulation Limit Reached"}
        description={simulationLimit?.canSimulate 
          ? `You have ${simulationLimit?.remaining} simulation${simulationLimit?.remaining === 1 ? '' : 's'} remaining. Upgrade for unlimited access.`
          : "You've reached your free simulation limit for this month. Upgrade to continue training."
        }
      />
    </div>
  )
}
