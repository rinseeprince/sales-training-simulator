'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { getVoicesByRegion } from '@/lib/voice-constants'

interface VoiceSelectorProps {
  value: string
  onValueChange: (value: string) => void
}

export function VoiceSelector({ value, onValueChange }: VoiceSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
        Prospect Voice
      </Label>
      <Select value={value} onValueChange={onValueChange}>
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
  )
}