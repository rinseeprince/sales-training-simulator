'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { VoiceSelector } from './voice-selector'

interface ScenarioData {
  title: string
  prospectName: string
  voice: string
  prompt: string
}

interface ScenarioFormProps {
  data: ScenarioData
  onChange: (data: ScenarioData) => void
}

export function ScenarioForm({ data, onChange }: ScenarioFormProps) {
  const updateField = (field: keyof ScenarioData, value: string) => {
    onChange({
      ...data,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      {/* Scenario Title */}
      <div className="space-y-2">
        <Label htmlFor="edit-title" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
          Scenario Title
        </Label>
        <Input
          id="edit-title"
          placeholder="e.g., Enterprise Software Demo Call"
          value={data.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
        />
      </div>

      {/* Prospect Name and Voice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-prospectName" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
            Prospect Name
          </Label>
          <Input
            id="edit-prospectName"
            placeholder="e.g., Sarah Johnson"
            value={data.prospectName}
            onChange={(e) => updateField('prospectName', e.target.value)}
            className="rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
          />
        </div>
        
        <VoiceSelector
          value={data.voice}
          onValueChange={(value) => updateField('voice', value)}
        />
      </div>

      {/* Prompt */}
      <div className="border-t border-slate-100 pt-6">
        <div className="space-y-2">
          <Label htmlFor="edit-prompt" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
            Prospect & Scenario Description
          </Label>
          <Textarea
            id="edit-prompt"
            placeholder="Describe your prospect and scenario naturally..."
            className="min-h-[175px] rounded-lg border-slate-200 px-4 py-3 focus:ring-primary"
            value={data.prompt}
            onChange={(e) => updateField('prompt', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}