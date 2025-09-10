'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { 
  Play, 
  Save, 
  Mic, 
  Settings, 
  User, 
  MessageSquare, 
  Volume2, 
  Lightbulb, 
  CheckCircle, 
  Info,
  Users,
  Building,
  CalendarIcon,
  UserPlus,
  Send
} from 'lucide-react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'


interface User {
  id: string
  name: string
  email: string
  role: string
  team_id?: string
}

interface Team {
  id: string
  name: string
  description?: string
}

export function ScenarioBuilder() {
  const { user } = useSupabaseAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scenarioTitle, setScenarioTitle] = useState('')
  const [prospectName, setProspectName] = useState('')
  const [prospectVoice, setProspectVoice] = useState('rachel')
  const [scenarioDescription, setScenarioDescription] = useState('')
  const [saveForReuse, setSaveForReuse] = useState(false)
  
  // RBAC-related states
  const [userRole, setUserRole] = useState<'user' | 'manager' | 'admin'>('user')
  const [isCompanyScenario, setIsCompanyScenario] = useState(false)
  const [assignToUsers, setAssignToUsers] = useState<string[]>([])
  const [assignToTeam, setAssignToTeam] = useState<string>('')
  const [assignmentDeadline, setAssignmentDeadline] = useState<Date | undefined>()
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [showAssignment, setShowAssignment] = useState(false)

  // Fetch user role and available users/teams
  useEffect(() => {
    const fetchRoleAndTeams = async () => {
      if (!user) return

      try {
        // Get user profile with role
        const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`)
        const profileData = await profileResponse.json()
        
        if (profileData.success && profileData.userProfile) {
          const role = profileData.userProfile.role || 'user'
          setUserRole(role)
          
          // If manager or admin, fetch users and teams
          if (role === 'manager' || role === 'admin') {
            // Fetch users
            const usersResponse = await fetch('/api/users?role=user')
            if (usersResponse.ok) {
              const usersData = await usersResponse.json()
              setAvailableUsers(usersData.users || [])
            }
            
            // Fetch teams
            const teamsResponse = await fetch('/api/teams')
            if (teamsResponse.ok) {
              const teamsData = await teamsResponse.json()
              setAvailableTeams(teamsData.teams || [])
            }
          }
        }
      } catch (error) {
        console.error('Error fetching role and teams:', error)
      }
    }

    fetchRoleAndTeams()
  }, [user])

  const handleStartSimulation = async () => {
    if (!scenarioDescription.trim()) {
      toast.error('Please provide a scenario description')
      return
    }

    setLoading(true)
    
    try {
      // Save scenario if requested
      let scenarioId = null
      if (saveForReuse || isCompanyScenario || showAssignment) {
        const profileResponse = await fetch(`/api/user-profile?authUserId=${user?.id}`)
        const profileData = await profileResponse.json()
        
        if (!profileData.success) {
          throw new Error('Failed to get user profile')
        }

        const saveResponse = await fetch('/api/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: scenarioTitle || 'Untitled Scenario',
            prompt: scenarioDescription,
            prospectName: prospectName || 'Prospect',
            voice: prospectVoice,
            userId: profileData.userProfile.id,
            is_company_generated: isCompanyScenario
          })
        })

        if (!saveResponse.ok) {
          throw new Error('Failed to save scenario')
        }

        const saveData = await saveResponse.json()
        scenarioId = saveData.scenarioId
        
        if (saveForReuse || isCompanyScenario) {
          toast.success('Scenario saved successfully!')
        }
      }

      // Create assignments if needed
      if (showAssignment && scenarioId && (assignToUsers.length > 0 || assignToTeam)) {
        const assignmentResponse = await fetch('/api/scenario-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId,
            assignToUsers: assignToUsers.length > 0 ? assignToUsers : undefined,
            assignToTeam: assignToTeam || undefined,
            deadline: assignmentDeadline?.toISOString()
          })
        })

        if (assignmentResponse.ok) {
          const assignmentData = await assignmentResponse.json()
          toast.success(assignmentData.message || 'Assignments created successfully!')
        } else {
          toast.error('Failed to create assignments')
        }
      }

      // Navigate to simulation
      const params = new URLSearchParams({
        prompt: scenarioDescription,
        prospectName: prospectName || 'Prospect',
        voice: prospectVoice
      })

      router.push(`/simulation?${params.toString()}`)
    } catch (error) {
      console.error('Error starting simulation:', error)
      toast.error('Failed to start simulation')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveScenario = async () => {
    if (!scenarioTitle.trim() || !scenarioDescription.trim()) {
      toast.error('Please provide both title and description')
      return
    }

    setSaving(true)
    
    try {
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user?.id}`)
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile')
      }

      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: scenarioTitle,
          prompt: scenarioDescription,
          prospectName: prospectName || 'Prospect',
          voice: prospectVoice,
          userId: profileData.userProfile.id,
          is_company_generated: isCompanyScenario
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save scenario')
      }

      const data = await response.json()
      
      // Create assignments if needed
      if (showAssignment && data.scenarioId && (assignToUsers.length > 0 || assignToTeam)) {
        await fetch('/api/scenario-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: data.scenarioId,
            assignToUsers: assignToUsers.length > 0 ? assignToUsers : undefined,
            assignToTeam: assignToTeam || undefined,
            deadline: assignmentDeadline?.toISOString()
          })
        })
      }
      
      toast.success('Scenario saved successfully!')
      
      // Reset form
      setScenarioTitle('')
      setScenarioDescription('')
      setProspectName('')
      setSaveForReuse(false)
      setIsCompanyScenario(false)
      setAssignToUsers([])
      setAssignToTeam('')
      setAssignmentDeadline(undefined)
      setShowAssignment(false)
    } catch (error) {
      console.error('Error saving scenario:', error)
      toast.error('Failed to save scenario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Scenario Builder</h1>
          <p className="text-gray-600 mt-2">Create your sales scenario to start a live simulation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scenario Details</CardTitle>
                <CardDescription>Define the basic parameters of your sales simulation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="scenario-title">Scenario Title</Label>
                  <Input
                    id="scenario-title"
                    placeholder="e.g., Enterprise Software Demo Call"
                    value={scenarioTitle}
                    onChange={(e) => setScenarioTitle(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prospect-name">Prospect Name</Label>
                    <Input
                      id="prospect-name"
                      placeholder="e.g., Sarah Johnson"
                      value={prospectName}
                      onChange={(e) => setProspectName(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="prospect-voice">Prospect Voice</Label>
                    <Select value={prospectVoice} onValueChange={setProspectVoice}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select prospect voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rachel">Rachel (Female)</SelectItem>
                        <SelectItem value="drew">Drew (Male)</SelectItem>
                        <SelectItem value="clyde">Clyde (Male)</SelectItem>
                        <SelectItem value="paul">Paul (Male)</SelectItem>
                        <SelectItem value="domi">Domi (Female)</SelectItem>
                        <SelectItem value="dave">Dave (Male)</SelectItem>
                        <SelectItem value="fin">Fin (Male)</SelectItem>
                        <SelectItem value="bella">Bella (Female)</SelectItem>
                        <SelectItem value="antoni">Antoni (Male)</SelectItem>
                        <SelectItem value="thomas">Thomas (Male)</SelectItem>
                        <SelectItem value="charlie">Charlie (Male)</SelectItem>
                        <SelectItem value="emily">Emily (Female)</SelectItem>
                        <SelectItem value="elli">Elli (Female)</SelectItem>
                        <SelectItem value="callum">Callum (Male)</SelectItem>
                        <SelectItem value="patrick">Patrick (Male)</SelectItem>
                        <SelectItem value="harry">Harry (Male)</SelectItem>
                        <SelectItem value="liam">Liam (Male)</SelectItem>
                        <SelectItem value="dorothy">Dorothy (Female)</SelectItem>
                        <SelectItem value="josh">Josh (Male)</SelectItem>
                        <SelectItem value="arnold">Arnold (Male)</SelectItem>
                        <SelectItem value="charlotte">Charlotte (Female)</SelectItem>
                        <SelectItem value="matilda">Matilda (Female)</SelectItem>
                        <SelectItem value="matthew">Matthew (Male)</SelectItem>
                        <SelectItem value="james">James (Male)</SelectItem>
                        <SelectItem value="joseph">Joseph (Male)</SelectItem>
                        <SelectItem value="jeremy">Jeremy (Male)</SelectItem>
                        <SelectItem value="michael">Michael (Male)</SelectItem>
                        <SelectItem value="ethan">Ethan (Male)</SelectItem>
                        <SelectItem value="gigi">Gigi (Female)</SelectItem>
                        <SelectItem value="freya">Freya (Female)</SelectItem>
                        <SelectItem value="grace">Grace (Female)</SelectItem>
                        <SelectItem value="daniel">Daniel (Male)</SelectItem>
                        <SelectItem value="serena">Serena (Female)</SelectItem>
                        <SelectItem value="adam">Adam (Male)</SelectItem>
                        <SelectItem value="nicole">Nicole (Female)</SelectItem>
                        <SelectItem value="jessie">Jessie (Male)</SelectItem>
                        <SelectItem value="ryan">Ryan (Male)</SelectItem>
                        <SelectItem value="sam">Sam (Male)</SelectItem>
                        <SelectItem value="glinda">Glinda (Female)</SelectItem>
                        <SelectItem value="giovanni">Giovanni (Male)</SelectItem>
                        <SelectItem value="mimi">Mimi (Female)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="scenario-description">Prospect & Scenario Description</Label>
                  <Textarea
                    id="scenario-description"
                    placeholder="Describe your prospect and scenario naturally..."
                    value={scenarioDescription}
                    onChange={(e) => setScenarioDescription(e.target.value)}
                    className="mt-2 min-h-[200px]"
                  />
                </div>

                {/* Manager/Admin Features */}
                {(userRole === 'manager' || userRole === 'admin') && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Manager Options
                      </CardTitle>
                      <CardDescription>Additional options for managers and admins</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="company-scenario">Company Scenario</Label>
                          <p className="text-sm text-muted-foreground">
                            Mark as official company training material
                          </p>
                        </div>
                        <Switch
                          id="company-scenario"
                          checked={isCompanyScenario}
                          onCheckedChange={setIsCompanyScenario}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="assign-scenario">Assign to Users/Teams</Label>
                          <p className="text-sm text-muted-foreground">
                            Assign this scenario for training
                          </p>
                        </div>
                        <Switch
                          id="assign-scenario"
                          checked={showAssignment}
                          onCheckedChange={setShowAssignment}
                        />
                      </div>

                      {showAssignment && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-4 pt-4 border-t"
                        >
                          <div>
                            <Label>Assign to Users</Label>
                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                              {availableUsers.map((u) => (
                                <div key={u.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={u.id}
                                    checked={assignToUsers.includes(u.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setAssignToUsers([...assignToUsers, u.id])
                                      } else {
                                        setAssignToUsers(assignToUsers.filter(id => id !== u.id))
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={u.id}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {u.name} ({u.email})
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="assign-team">Or Assign to Team</Label>
                            <Select value={assignToTeam} onValueChange={setAssignToTeam}>
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select a team" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {availableTeams.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Assignment Deadline</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal mt-2",
                                    !assignmentDeadline && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {assignmentDeadline ? format(assignmentDeadline, "PPP") : "Select deadline"}
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
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="save-for-reuse"
                    checked={saveForReuse}
                    onCheckedChange={setSaveForReuse}
                  />
                  <Label htmlFor="save-for-reuse">Save for reuse</Label>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleStartSimulation}
                    disabled={loading || !scenarioDescription.trim()}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Simulation
                      </>
                    )}
                  </Button>

                  {(saveForReuse || isCompanyScenario) && (
                    <Button
                      onClick={handleSaveScenario}
                      disabled={saving || !scenarioTitle.trim() || !scenarioDescription.trim()}
                      variant="outline"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Only
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Prospect Voice</span>
                  </div>
                  <Badge variant="secondary">
                    {prospectVoice ? prospectVoice.charAt(0).toUpperCase() + prospectVoice.slice(1) : 'Not set'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Save for Reuse</span>
                  </div>
                  <Badge variant="secondary">{saveForReuse ? 'Yes' : 'No'}</Badge>
                </div>
                {(userRole === 'manager' || userRole === 'admin') && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Company Scenario</span>
                      </div>
                      <Badge variant="secondary">{isCompanyScenario ? 'Yes' : 'No'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Assignments</span>
                      </div>
                      <Badge variant="secondary">
                        {showAssignment ? `${assignToUsers.length + (assignToTeam ? 1 : 0)}` : 'None'}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Write Human Scenarios</p>
                      <p className="text-xs text-muted-foreground">
                        Describe the prospect like a real person with specific motivations, challenges, and personality traits.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Include Context</p>
                      <p className="text-xs text-muted-foreground">
                        Explain how this conversation came about - was it inbound, outbound, referral? This context shapes everything.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Be Specific</p>
                      <p className="text-xs text-muted-foreground">
                        The more detail you provide, the more realistic and valuable the practice will be.
                      </p>
                    </div>
                  </div>
                </div>

                {(userRole === 'manager' || userRole === 'admin') && (
                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Manager Features</p>
                        <p className="text-xs text-muted-foreground">
                          As a {userRole}, you can create company scenarios and assign them to team members with deadlines.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
