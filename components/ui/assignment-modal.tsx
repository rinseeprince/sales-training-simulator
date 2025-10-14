'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { User } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  Mail, 
  Users,
  X,
  Check,
  Building
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { supabaseClient as supabase } from '@/lib/supabase-auth'
import { useToast } from '@/hooks/use-toast'

interface SavedScenario {
  id: string
  title: string
  prompt: string
  name?: string
  prospect_name?: string
  voice?: string
}

interface DomainUser {
  id: string
  email: string
  name: string
  role: string
  department: string
}

interface AssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  scenario: SavedScenario | null
}

export function AssignmentModal({ isOpen, onClose, scenario }: AssignmentModalProps) {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [domainUsers, setDomainUsers] = useState<DomainUser[]>([])
  const [selectedUsers, setSelectedUsers] = useState<DomainUser[]>([])
  const [deadline, setDeadline] = useState<Date | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [userRole, setUserRole] = useState<string>('user')
  
  const loadUserRole = useCallback(async () => {
    if (!user) return
    
    try {
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`)
      const profileData = await profileResponse.json()
      
      if (profileData.success) {
        setUserRole(profileData.userProfile.role || 'user')
      }
    } catch (error) {
      console.error('Error loading user role:', error)
    }
  }, [user])
  
  const loadDomainUsers = useCallback(async () => {
    if (!user?.email) {
      return
    }
    
    setIsLoading(true)
    try {
      // Get the user's email domain
      const emailDomain = user.email.split('@')[1]
      
      // Create a fresh Supabase query with timeout
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      })
      
      // Create the actual query promise
      const queryPromise = supabase
        .from('simple_users')
        .select('id, email, name, role, department')
        .like('email', `%@${emailDomain}`)
        .order('name')
      
      // Race between query and timeout
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]).catch(async (timeoutError) => {
        // Fallback to using the API endpoint directly
        const response = await fetch('/api/assignments?' + new URLSearchParams({
          domain: emailDomain
        }))
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error('Failed to load users via API')
        }
        
        const apiData = await response.json()
        return { data: apiData.users, error: null }
      }) as { data: User[] | null; error: Error | null }
      
      if (error) {
        throw error
      }
      
      setDomainUsers(data || [])
    } catch (error) {
      console.error('Error loading domain users:', error)
      toast({
        title: "Error",
        description: "Failed to load users. Please try closing and reopening the modal.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])
  
  // Load user role and domain users when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadUserRole()
      loadDomainUsers()
      
      // Reload data when tab becomes visible while modal is open
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isOpen && user) {
          loadDomainUsers()
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [isOpen, user, loadUserRole, loadDomainUsers])
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setSelectedUsers([])
      setDeadline(undefined)
      setDomainUsers([])
    }
  }, [isOpen])
  
  const filteredUsers = domainUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Don't show already selected users
    const notSelected = !selectedUsers.find(selected => selected.id === user.id)
    
    return matchesSearch && notSelected
  })
  
  const handleUserSelect = (user: DomainUser) => {
    setSelectedUsers(prev => [...prev, user])
    setSearchTerm('') // Clear search after selection
  }
  
  const handleUserRemove = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId))
  }
  
  const handleAssign = async () => {
    if (!scenario || selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user to assign the scenario to",
        variant: "destructive",
      })
      return
    }
    
    if (!user) return
    
    try {
      setIsAssigning(true)
      
      // Get current user's profile
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`)
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        throw new Error('Failed to get user profile')
      }
      
      const assignerId = profileData.userProfile.id
      
      // Create assignments for each selected user
      const assignments = selectedUsers.map(user => ({
        scenario_id: scenario.id,
        assigned_by: assignerId,
        assigned_to_user: user.id,
        deadline: deadline?.toISOString() || null,
        status: 'not_started',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      
      // Use API endpoint instead of direct Supabase to avoid stale connections
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignments })
      })
      
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error('Failed to create assignments')
      }
      
      const result = await response.json()
      
      toast({
        title: "Success",
        description: `Scenario assigned to ${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'}`,
      })
      
      // Close modal and reset
      onClose()
      
    } catch (error) {
      console.error('Error creating assignments:', error)
      toast({
        title: "Error",
        description: "Failed to assign scenario. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAssigning(false)
    }
  }
  
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive'
      case 'manager':
        return 'default'
      default:
        return 'secondary'
    }
  }
  
  const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin'
  
  if (!isManagerOrAdmin) {
    return null // Don't render for regular users
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden z-[70]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Scenario
          </DialogTitle>
          <DialogDescription>
            Assign "{scenario?.title}" to users in your organization
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Scenario Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">{scenario?.title}</h4>
            <p className="text-sm text-slate-600 line-clamp-2">{scenario?.prompt}</p>
            {scenario?.prospect_name && (
              <div className="flex items-center gap-1 mt-2">
                <UserIcon className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-500">Prospect: {scenario.prospect_name}</span>
              </div>
            )}
          </div>
          
          {/* User Search */}
          <div className="space-y-3">
            <Label>Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Search Results */}
            {searchTerm && (
              <div className="border rounded-lg max-h-48 overflow-hidden">
                <ScrollArea className="h-full">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No users found</p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleUserSelect(user)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{user.name}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  <span className="text-xs text-slate-500">{user.email}</span>
                                </div>
                                {user.department && (
                                  <div className="flex items-center gap-1">
                                    <Building className="h-3 w-3 text-slate-400" />
                                    <span className="text-xs text-slate-500">{user.department}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                              {user.role}
                            </Badge>
                            <Check className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
          
          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-3">
              <Label>Selected Users ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-1"
                  >
                    <UserIcon className="h-3 w-3" />
                    <span>{user.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => handleUserRemove(user.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Due Date */}
          <div className="space-y-3">
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : "Select due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={selectedUsers.length === 0 || isAssigning}
            className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium"
          >
            {isAssigning ? 'Assigning...' : `Assign to ${selectedUsers.length} User${selectedUsers.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 