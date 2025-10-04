'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  ArrowRight, 
  Star, 
  Clock, 
  Lightbulb,
  Download,
  X
} from 'lucide-react'

interface CoachingSummary {
  sessionOverview: string;
  keyTopicsDiscussed: string[];
  coachingInsights: string[];
  actionItems: string[];
  nextSteps: string[];
  skillsWorkedOn: string[];
  strengthsIdentified: string[];
  areasForImprovement: string[];
  recommendedResources: string[];
  followUpRecommendations: string[];
  sessionRating: number;
  sessionsUntilMastery: number;
}

interface CoachingReportModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string | null
  title: string
}

export function CoachingReportModal({
  isOpen,
  onClose,
  sessionId,
  title
}: CoachingReportModalProps) {
  const [coachingSummary, setCoachingSummary] = useState<CoachingSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && sessionId) {
      // Try to get data from sessionStorage first
      const tempSessionData = sessionStorage.getItem(`temp_session_${sessionId}`)
      if (tempSessionData) {
        try {
          const sessionData = JSON.parse(tempSessionData)
          setCoachingSummary(sessionData.coachingSummary)
        } catch (error) {
          console.error('Error parsing temp session data:', error)
          setError('Failed to load coaching report')
        }
      } else {
        setError('Coaching report not found')
      }
    }
  }, [isOpen, sessionId])

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 bg-green-50'
    if (rating >= 6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getRatingLabel = (rating: number) => {
    if (rating >= 9) return 'Excellent'
    if (rating >= 8) return 'Very Good'
    if (rating >= 7) return 'Good'
    if (rating >= 6) return 'Fair'
    if (rating >= 5) return 'Needs Work'
    return 'Poor'
  }

  const handleDownloadReport = () => {
    if (!coachingSummary) return

    const reportContent = `
COACHING SESSION REPORT
${title}
Generated: ${new Date().toLocaleDateString()}

SESSION OVERVIEW:
${coachingSummary.sessionOverview}

KEY TOPICS DISCUSSED:
${coachingSummary.keyTopicsDiscussed.map(topic => `• ${topic}`).join('\n')}

COACHING INSIGHTS:
${coachingSummary.coachingInsights.map(insight => `• ${insight}`).join('\n')}

ACTION ITEMS:
${coachingSummary.actionItems.map(item => `• ${item}`).join('\n')}

NEXT STEPS:
${coachingSummary.nextSteps.map(step => `• ${step}`).join('\n')}

SKILLS WORKED ON:
${coachingSummary.skillsWorkedOn.map(skill => `• ${skill}`).join('\n')}

STRENGTHS IDENTIFIED:
${coachingSummary.strengthsIdentified.map(strength => `• ${strength}`).join('\n')}

AREAS FOR IMPROVEMENT:
${coachingSummary.areasForImprovement.map(area => `• ${area}`).join('\n')}

RECOMMENDED RESOURCES:
${coachingSummary.recommendedResources.map(resource => `• ${resource}`).join('\n')}

FOLLOW-UP RECOMMENDATIONS:
${coachingSummary.followUpRecommendations.map(rec => `• ${rec}`).join('\n')}

SESSION RATING: ${coachingSummary.sessionRating}/10 (${getRatingLabel(coachingSummary.sessionRating)})
ESTIMATED SESSIONS TO MASTERY: ${coachingSummary.sessionsUntilMastery}
    `.trim()

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `coaching-report-${sessionId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900 flex items-center">
                <FileText className="h-5 w-5 text-emerald-600 mr-2" />
                Coaching Report
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">{title}</p>
            </div>
            <div className="flex items-center space-x-2">
              {coachingSummary && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReport}
                  className="rounded-lg"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        {coachingSummary && (
          <div className="space-y-6">
            {/* Session Rating */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Session Rating</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-2xl font-bold text-slate-900">
                          {coachingSummary.sessionRating}
                        </span>
                        <span className="text-slate-500">/10</span>
                        <Badge className={`${getRatingColor(coachingSummary.sessionRating)} text-xs`}>
                          {getRatingLabel(coachingSummary.sessionRating)}
                        </Badge>
                      </div>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Sessions to Mastery</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-2xl font-bold text-slate-900">
                          {coachingSummary.sessionsUntilMastery}
                        </span>
                        <span className="text-slate-500">sessions</span>
                      </div>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Session Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 text-slate-600 mr-2" />
                  Session Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">
                  {coachingSummary.sessionOverview}
                </p>
              </CardContent>
            </Card>

            {/* Tabs for detailed sections */}
            <Tabs defaultValue="insights" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              <TabsContent value="insights" className="space-y-4">
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mr-2" />
                        Key Topics Discussed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {coachingSummary.keyTopicsDiscussed.map((topic, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-slate-700">{topic}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">
                        <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
                        Coaching Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {coachingSummary.coachingInsights.map((insight, index) => (
                          <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-slate-700">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Action Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {coachingSummary.actionItems.map((item, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-green-50 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">
                        <ArrowRight className="h-4 w-4 text-purple-500 mr-2" />
                        Next Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {coachingSummary.nextSteps.map((step, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-purple-50 rounded-lg">
                            <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700">{step}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <Target className="h-4 w-4 text-orange-500 mr-2" />
                      Skills Worked On
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {coachingSummary.skillsWorkedOn.map((skill, index) => (
                        <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="feedback" className="space-y-4">
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base text-green-700">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Strengths Identified
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {coachingSummary.strengthsIdentified.map((strength, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-green-50 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700">{strength}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base text-amber-700">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Areas for Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {coachingSummary.areasForImprovement.map((area, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-amber-50 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700">{area}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="resources" className="space-y-4">
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">
                        <BookOpen className="h-4 w-4 text-indigo-500 mr-2" />
                        Recommended Resources
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {coachingSummary.recommendedResources.map((resource, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-indigo-50 rounded-lg">
                            <BookOpen className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700">{resource}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">
                        <ArrowRight className="h-4 w-4 text-teal-500 mr-2" />
                        Follow-up Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {coachingSummary.followUpRecommendations.map((rec, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-teal-50 rounded-lg">
                            <ArrowRight className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-600">Loading coaching report...</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}