'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Building } from 'lucide-react'
import { ScenarioForm } from './scenario-form'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useToast } from '@/hooks/use-toast'
import { authenticatedPatch } from '@/lib/api-client'

interface Scenario {
  id: string
  title: string
  prompt: string
  prospect_name?: string
  voice?: string
  is_company_generated?: boolean
}

interface ScenarioData {
  title: string
  prospectName: string
  voice: string
  prompt: string
}

interface EditScenarioModalProps {
  isOpen: boolean
  onClose: () => void
  scenario: Scenario | null
  onScenarioUpdated?: () => void
}

export function EditScenarioModal({ isOpen, onClose, scenario, onScenarioUpdated }: EditScenarioModalProps) {
  const { user } = useSupabaseAuth()
  const { toast } = useToast()
  const [formData, setFormData] = useState<ScenarioData>({
    title: '',
    prospectName: '',
    voice: '',
    prompt: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)

  // Reset form when modal opens/closes or scenario changes
  useEffect(() => {
    if (isOpen && scenario) {
      setFormData({
        title: scenario.title,
        prospectName: scenario.prospect_name || '',
        voice: scenario.voice || '',
        prompt: scenario.prompt
      })
    } else if (!isOpen) {
      setFormData({
        title: '',
        prospectName: '',
        voice: '',
        prompt: ''
      })
    }
  }, [isOpen, scenario])

  const handleUpdateScenario = async () => {
    if (!scenario || !user) {
      toast({
        title: "Error",
        description: "Missing scenario or user information.",
        variant: "destructive",
      })
      return
    }

    if (!formData.title.trim() || !formData.prompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in the scenario title and description.",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    
    try {
      console.log('🔍 Updating scenario...', { 
        scenarioId: scenario.id, 
        formData
      })
      
      const response = await authenticatedPatch(`/api/scenarios/${scenario.id}`, {
        title: formData.title.trim(),
        prompt: formData.prompt.trim(),
        prospectName: formData.prospectName.trim() || null,
        voice: formData.voice || null
      })

      console.log('🔍 Update response status:', response.status)
      
      if (response.ok) {
        const updateData = await response.json()
        console.log('✅ Scenario updated successfully:', updateData)
        
        toast({
          title: "Scenario Updated",
          description: `Successfully updated "${formData.title}"`,
        })
        
        // Call the callback to refresh scenarios list
        onScenarioUpdated?.()
        
        // Close modal
        onClose()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Scenario update failed:', errorData)
        
        toast({
          title: "Update Failed",
          description: errorData.error || 'Failed to update scenario',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Scenario update error:', error)
      
      toast({
        title: "Update Failed",
        description: "An unexpected error occurred while updating the scenario",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (!scenario) return null

  return (
    <div className="relative" style={{ zIndex: 99999 }}>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-3xl max-h-[90vh] flex flex-col"
          style={{ zIndex: 99999, position: 'fixed' }}
        >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Edit Scenario
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 p-6 scrollbar-hide">
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

          {/* Edit Form */}
          <ScenarioForm
            data={formData}
            onChange={setFormData}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateScenario} 
              disabled={!formData.title.trim() || !formData.prompt.trim() || isUpdating}
              className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium"
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  )
}