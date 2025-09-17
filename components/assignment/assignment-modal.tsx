'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Building } from 'lucide-react'
import { UserSearch } from './user-search'
import { AssignmentDeadline } from './assignment-deadline'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'
import { authenticatedGet, authenticatedPost } from '@/lib/api-client'

interface SearchUser {
  id: string
  name: string
  email: string
  role: string
}

interface Scenario {
  id: string
  title: string
  prompt: string
  prospect_name?: string
  voice?: string
  is_company_generated?: boolean
}

interface AssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  scenario: Scenario | null
  onAssignmentCreated?: () => void
}

export function AssignmentModal({ isOpen, onClose, scenario, onAssignmentCreated }: AssignmentModalProps) {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([])
  const [assignmentDeadline, setAssignmentDeadline] = useState<Date | undefined>()
  const [userDomain, setUserDomain] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([])
      setAssignmentDeadline(undefined)
    }
  }, [isOpen])

  // Fetch user profile data when modal opens or user changes
  useEffect(() => {
    if (user?.email) {
      const domain = user.email.split('@')[1]
      setUserDomain(domain)
      console.log('🔧 AssignmentModal: User domain set to:', domain)
      
      const name = user.name || user.email?.split('@')[0] || 'Manager'
      setUserName(name)
    }
  }, [user?.email, user?.name])

  // Additional check when modal opens
  useEffect(() => {
    if (isOpen && user?.id && !userDomain) {
      fetchUserProfile()
    }
  }, [isOpen, user?.id, userDomain])

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      // MIGRATION UPDATE: user.id is now the same as simple_users.id
      const name = user.name || user.email?.split('@')[0] || 'Manager'
      setUserName(name)
      
      // Extract domain from user's email
      const email = user.email
      if (email) {
        const domain = email.split('@')[1]
        setUserDomain(domain)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const handleCreateAssignment = async () => {
    if (!scenario || !user || selectedUsers.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one user to assign the scenario to.",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    
    try {
      console.log('🔍 Creating assignments...', { 
        scenarioId: scenario.id, 
        selectedUsers: selectedUsers.length,
        assignmentDeadline: assignmentDeadline?.toISOString()
      })
      
      const response = await authenticatedPost('/api/scenario-assignments', {
        scenarioId: scenario.id,
        assignToUsers: selectedUsers.map(u => u.id),
        deadline: assignmentDeadline?.toISOString(),
        assignerName: userName // Pass the assigner's name for notifications
      })

      console.log('🔍 Assignment response status:', response.status)
      
      if (response.ok) {
        const assignmentData = await response.json()
        console.log('✅ Assignment created successfully:', assignmentData)
        
        toast({
          title: "Assignments Created",
          description: assignmentData.message || `Successfully assigned "${scenario.title}" to ${selectedUsers.length} user(s)`,
        })
        
        // Call the callback to refresh assignments list
        onAssignmentCreated?.()
        
        // Close modal
        onClose()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Assignment creation failed:', errorData)
        
        toast({
          title: "Assignment Failed",
          description: errorData.error || 'Failed to create assignment',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Assignment creation error:', error)
      
      toast({
        title: "Assignment Failed",
        description: "An unexpected error occurred while creating the assignment",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  if (!scenario) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Assign Scenario to Users
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Scenario Preview */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                {scenario.title}
                {scenario.is_company_generated && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Company
                  </Badge>
                )}
              </h4>
            </div>
            <p className="text-sm text-slate-600 line-clamp-3">
              {scenario.prompt}
            </p>
            {scenario.prospect_name && (
              <p className="text-xs text-slate-500 mt-2">
                Prospect: {scenario.prospect_name}
              </p>
            )}
          </div>

          {/* User Search */}
          <UserSearch
            selectedUsers={selectedUsers}
            onUsersChange={setSelectedUsers}
            userDomain={userDomain}
          />

          {/* Deadline */}
          <AssignmentDeadline
            deadline={assignmentDeadline}
            onDeadlineChange={setAssignmentDeadline}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAssignment} 
              disabled={selectedUsers.length === 0 || isCreating}
              className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Create Assignment{selectedUsers.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}