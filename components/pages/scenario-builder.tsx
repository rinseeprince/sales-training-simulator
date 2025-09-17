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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Play, Save, Settings, TrendingUp, Mic, FileText, User, MessageSquare, Lightbulb, BookOpen, Folder, Building, Users, CalendarIcon, Check, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'
import { REGIONAL_VOICES, getVoicesByRegion } from '@/lib/voice-constants'
import { authenticatedGet, authenticatedPost } from '@/lib/api-client'
import { useLoadingManager } from '@/lib/loading-manager'

interface SearchUser {
  id: string
  name: string
  email: string
  role: string
}

export function ScenarioBuilder() {
  const router = useRouter()
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const loadingManager = useLoadingManager()
  const [isSaving, setIsSaving] = useState(false)
  const [scenarioData, setScenarioData] = useState({
    title: '',
    prompt: '',
    prospectName: '', // Add prospect name field
    voice: '',
    saveReuse: false
  })
  const [savedScenarios, setSavedScenarios] = useState([])

  // RBAC-related states
  const [userRole, setUserRole] = useState<'user' | 'manager' | 'admin'>('user')
  const [isCompanyScenario, setIsCompanyScenario] = useState(false)
  const [assignmentDeadline, setAssignmentDeadline] = useState<Date | undefined>()
  const [showAssignment, setShowAssignment] = useState(false)
  
  // User search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [userDomain, setUserDomain] = useState<string>('')

  // Load saved scenarios and check for edit mode
  useEffect(() => {
    if (!user?.id) return
    
    const initializeData = async () => {
      await loadingManager.withLoading('scenario-builder-init', async () => {
        await Promise.all([
          loadSavedScenarios(),
          fetchUserRole()
        ])
      })
    }
    
    initializeData()
    
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

  const fetchUserRole = async () => {
    if (!user) return

    try {
      // MIGRATION UPDATE: user.id is now the same as simple_users.id
      // TODO: Get role from auth context or separate endpoint
      setUserRole('user') // Default role, enhance later
      
      // Extract domain from user's email
      const email = user.email
      if (email) {
        const domain = email.split('@')[1]
        setUserDomain(domain)
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    // Use loading manager to prevent duplicate requests
    const searchKey = `user-search-${query}-${userDomain}`
    
    try {
      await loadingManager.withLoading(searchKey, async () => {
        setIsSearching(true)
        
        const url = `/api/users/search?q=${encodeURIComponent(query)}&domain=${userDomain}`
        
        const response = await authenticatedGet(url)
        
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.users || [])
        } else {
          const errorData = await response.json()
          console.error('User search failed:', { status: response.status, error: errorData })
          setSearchResults([])
        }
      })
    } catch (error) {
      console.error('User search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadSavedScenarios = async () => {
    if (!user) return
    
    try {
      // Get the correct user ID from simple_users table
      // MIGRATION UPDATE: user.id is now the same as simple_users.id
      const actualUserId = user.id;
      
      const response = await authenticatedGet(`/api/scenarios?userId=${actualUserId}`)
      if (response.ok) {
        const data = await response.json()
        setSavedScenarios(data.scenarios || [])
      }
    } catch (error) {
      console.error('Error loading saved scenarios:', error)
    }
  }

  const handleLoadScenario = (scenario: any) => {
    console.log('🔍 Loading saved scenario:', scenario);
    setScenarioData({
      title: scenario.title,
      prompt: scenario.prompt,
      prospectName: scenario.prospect_name || '', // Load saved prospect name
      voice: scenario.voice || '',
      saveReuse: true
    })
    console.log('🔍 Set scenario data with prospectName:', scenario.prospect_name);
    
    toast({
      title: "Scenario Loaded",
      description: `Loaded "${scenario.title}" successfully`,
    })
  }

  const handleStartSimulation = async () => {
    console.log('🔍 Start Live Simulation button clicked!')
    console.log('🔍 Scenario data:', scenarioData)
    
    // Validate required fields
    if (!scenarioData.title || !scenarioData.prompt) {
      console.log('❌ Missing required fields')
      toast({
        title: "Missing Information",
        description: "Please fill in the scenario title and description before starting.",
        variant: "destructive",
      })
      return
    }

    console.log('🔍 Checking simulation limit...')
    
    // Check simulation limit for free users (just for display, actual increment happens when recording starts)
    if (user) {
      try {
        console.log('🔍 Making simulation limit request for user:', user.id)
        const response = await authenticatedGet(`/api/check-simulation-limit?userId=${user.id}`)
        const data = await response.json()
        console.log('🔍 Simulation limit response:', data)
        
        if (!data.canSimulate) {
          console.log('❌ Simulation limit reached')
          toast({
            title: "Simulation Limit Reached",
            description: data.message || "You've reached your free simulation limit. Please upgrade to continue.",
            variant: "destructive",
            action: (
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/pricing')}
              >
                Upgrade
              </Button>
            )
          })
          return
        }
        
        // Show remaining simulations for free users (informational only)
        if (data.remaining && data.remaining > 0 && data.remaining <= 10) {
          console.log('🔍 Showing remaining simulations toast:', data.remaining)
          toast({
            title: "Simulations Remaining",
            description: `You have ${data.remaining} free simulation${data.remaining === 1 ? '' : 's'} left. Count will be used when you start recording.`,
          })
        }
        console.log('✅ Simulation limit check passed')
      } catch (error) {
        console.error('❌ Failed to check simulation limit:', error)
        // Continue anyway if check fails - will be enforced when recording starts
      }
    } else {
      console.log('🔍 No user found, skipping simulation limit check')
    }

    // Auto-save scenario if saveReuse is enabled or if it's a company scenario
    if (scenarioData.saveReuse || isCompanyScenario || showAssignment) {
      console.log('🔍 Auto-saving scenario before simulation...')
      const saved = await saveScenarioToDatabase()
      if (!saved) {
        console.log('❌ Auto-save failed, but continuing with simulation...')
        // Don't block simulation if save fails - user can still simulate
        toast({
          title: "Save Warning",
          description: "Scenario couldn't be saved, but simulation will continue.",
          variant: "destructive",
        })
      }
    }

    console.log('🔍 Preparing simulation data...')
    
    // Save scenario data to localStorage for simulation page
    const simulationData = {
      title: scenarioData.title,
      prompt: scenarioData.prompt,
      prospectName: scenarioData.prospectName,
      voice: scenarioData.voice,
      timestamp: Date.now()
    }
    console.log('🔍 Saving to localStorage:', simulationData);
    console.log('🔍 scenarioData.prospectName:', scenarioData.prospectName);
    localStorage.setItem('currentScenario', JSON.stringify(simulationData))
    
    console.log('🔍 Navigating to simulation page...')
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
      // MIGRATION UPDATE: user.id is now the same as simple_users.id
      const actualUserId = user.id;
      const userName = user.name || user.email?.split('@')[0] || 'Manager';
      
      const response = await authenticatedPost('/api/scenarios', {
        title: scenarioData.title,
        prompt: scenarioData.prompt,
        prospectName: scenarioData.prospectName,
        voice: scenarioData.voice,
        userId: actualUserId,
        is_company_generated: isCompanyScenario
      })

      if (response.ok) {
        const result = await response.json()
        
        // Create assignments if needed
        if (showAssignment && result.scenarioId && selectedUsers.length > 0) {
          console.log('🔍 Creating assignments...', { 
            showAssignment, 
            scenarioId: result.scenarioId, 
            selectedUsers: selectedUsers.length,
            assignmentDeadline: assignmentDeadline?.toISOString()
          });
          
          const assignmentResponse = await authenticatedPost('/api/scenario-assignments', {
            scenarioId: result.scenarioId,
            assignToUsers: selectedUsers.map(u => u.id),
            deadline: assignmentDeadline?.toISOString(),
            assignerName: userName // Pass the assigner's name
          })

          console.log('🔍 Assignment response status:', assignmentResponse.status);
          
          if (assignmentResponse.ok) {
            const assignmentData = await assignmentResponse.json()
            console.log('✅ Assignment created successfully:', assignmentData);
            toast({
              title: "Assignments Created",
              description: assignmentData.message || 'Assignments created successfully!',
            })
          } else {
            const errorData = await assignmentResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('❌ Assignment creation failed:', errorData);
            toast({
              title: "Assignment Failed",
              description: errorData.error || 'Failed to create assignment',
              variant: "destructive",
            })
          }
        } else {
          console.log('🔍 Skipping assignment creation:', { 
            showAssignment, 
            scenarioId: result.scenarioId, 
            selectedUsersCount: selectedUsers.length 
          });
        }
        
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

                {/* Manager/Admin Features - Subtle Integration */}
                {(userRole === 'manager' || userRole === 'admin') && (
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-primary" />
                        <Label htmlFor="company-scenario" className="text-sm text-slate-700">Company Scenario</Label>
                      </div>
                      <Switch
                        id="company-scenario"
                        checked={isCompanyScenario}
                        onCheckedChange={setIsCompanyScenario}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-primary" />
                        <Label htmlFor="assign-users" className="text-sm text-slate-700">Assign to Users</Label>
                      </div>
                      <Switch
                        id="assign-users"
                        checked={showAssignment}
                        onCheckedChange={setShowAssignment}
                      />
                    </div>

                    {showAssignment && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pl-6"
                      >
                        {/* User Search */}
                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                            Search Users ({userDomain})
                          </Label>
                          <Popover open={searchQuery.length > 0}>
                            <PopoverTrigger asChild>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  placeholder="Search by name or email..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="pl-10 pr-4 py-3 rounded-lg border-slate-200 focus:ring-primary"
                                />
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command>
                                <CommandGroup>
                                  {isSearching && (
                                    <CommandItem disabled>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                                      Searching...
                                    </CommandItem>
                                  )}
                                  {!isSearching && searchResults.length === 0 && searchQuery && (
                                    <CommandItem disabled>No users found</CommandItem>
                                  )}
                                  {searchResults.map((searchUser) => (
                                    <CommandItem
                                      key={searchUser.id}
                                      onSelect={() => {
                                        if (!selectedUsers.find(u => u.id === searchUser.id)) {
                                          setSelectedUsers([...selectedUsers, searchUser])
                                        }
                                        setSearchQuery('')
                                      }}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <div>
                                          <div className="font-medium">{searchUser.name}</div>
                                          <div className="text-sm text-slate-500">{searchUser.email}</div>
                                        </div>
                                        {selectedUsers.find(u => u.id === searchUser.id) && (
                                          <Check className="h-4 w-4 text-primary" />
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Selected Users */}
                        {selectedUsers.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                              Selected Users ({selectedUsers.length})
                            </Label>
                            <div className="space-y-2">
                              {selectedUsers.map((selectedUser) => (
                                <div key={selectedUser.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                                  <div>
                                    <div className="text-sm font-medium">{selectedUser.name}</div>
                                    <div className="text-xs text-slate-500">{selectedUser.email}</div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedUsers(selectedUsers.filter(u => u.id !== selectedUser.id))}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Deadline */}
                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Assignment Deadline</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal rounded-lg border-slate-200",
                                  !assignmentDeadline && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {assignmentDeadline ? format(assignmentDeadline, "PPP") : "Select deadline (optional)"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={assignmentDeadline}
                                onSelect={setAssignmentDeadline}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

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
                {(userRole === 'manager' || userRole === 'admin') && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">Company Scenario</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        isCompanyScenario ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isCompanyScenario ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">Assigned Users</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        selectedUsers.length > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {selectedUsers.length}
                      </span>
                    </div>
                  </>
                )}
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
