'use client'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

interface AssignmentDeadlineProps {
  deadline: Date | undefined
  onDeadlineChange: (date: Date | undefined) => void
}

export function AssignmentDeadline({ deadline, onDeadlineChange }: AssignmentDeadlineProps) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
        Assignment Deadline
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal rounded-lg border-slate-200",
              !deadline && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {deadline ? format(deadline, "PPP") : "Select deadline (optional)"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={deadline}
            onSelect={onDeadlineChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}