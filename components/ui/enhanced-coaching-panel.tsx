'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  Target,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  MessageSquare,
  Zap,
  Star,
  Award,
  BookOpen,
  Brain,
  Heart,
  DollarSign,
  Calendar,
  ArrowRight,
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import { EnhancedCoachingFeedback } from '@/lib/ai-engine/types/enhanced-coaching-types'

interface EnhancedCoachingPanelProps {
  feedback: EnhancedCoachingFeedback
  isLoading?: boolean
}

export function EnhancedCoachingPanel({ feedback, isLoading = false }: EnhancedCoachingPanelProps) {
  const [activePhase, setActivePhase] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    executive: true,
    phases: false,
    discovery: false,
    objections: false,
    communication: false,
    coaching: true
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getDealProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (probability >= 60) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (probability >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getPhaseScore = (score: number) => {
    if (score >= 85) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Excellent' }
    if (score >= 70) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Good' }
    if (score >= 50) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Fair' }
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'Needs Work' }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-slate-700">Generating Detailed Analysis</p>
              <p className="text-sm text-slate-500">Running comprehensive AI analysis across multiple dimensions...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-2xl border border-teal-200 dark:border-teal-700 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center">
              <Award className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Executive Summary</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">AI-powered performance overview</p>
            </div>
          </div>
          <Badge className={`px-3 py-1 ${getDealProbabilityColor(feedback.executiveSummary.dealProbability)}`}>
            {feedback.executiveSummary.dealProbability}% Deal Probability
          </Badge>
        </div>

        <div className="space-y-4">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {feedback.executiveSummary.overallPerformance}
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Top Strengths */}
            <div className="space-y-3">
              <h4 className="font-medium text-green-800 dark:text-green-400 flex items-center">
                <ThumbsUp className="h-4 w-4 mr-2" />
                Top Strengths
              </h4>
              <div className="space-y-2">
                {feedback.executiveSummary.topStrengths.map((strength, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Areas */}
            <div className="space-y-3">
              <h4 className="font-medium text-orange-800 dark:text-orange-400 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Critical Focus Areas
              </h4>
              <div className="space-y-2">
                {feedback.executiveSummary.criticalAreas.map((area, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{area}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
            <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Business Impact Assessment
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{feedback.executiveSummary.businessImpact}</p>
          </div>
        </div>
      </motion.div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="phases" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="phases">Call Flow</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="objections">Objections</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
          <TabsTrigger value="nextcall">Next Call</TabsTrigger>
        </TabsList>

        {/* Conversation Phases */}
        <TabsContent value="phases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Conversation Flow Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedback.conversationPhases.map((phase, index) => {
                const scoreInfo = getPhaseScore(phase.score)
                return (
                  <div key={index} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="capitalize">
                          {phase.name.replace('_', ' ')}
                        </Badge>
                        <Badge className={`${scoreInfo.bg} ${scoreInfo.color}`}>
                          {phase.score}/100 - {scoreInfo.label}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActivePhase(activePhase === phase.name ? null : phase.name)}
                      >
                        {activePhase === phase.name ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{phase.summary}</p>
                    
                    <AnimatePresence>
                      {activePhase === phase.name && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          {/* Key Moments */}
                          {phase.keyMoments && phase.keyMoments.length > 0 && (
                            <div>
                              <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Key Moments</h5>
                              <div className="space-y-2">
                                {phase.keyMoments.map((moment, momentIndex) => (
                                  <div key={momentIndex} className="bg-slate-50 dark:bg-slate-700 rounded p-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {moment.impact.replace('_', ' ')}
                                      </Badge>
                                      <span className="text-xs text-slate-500">{moment.timestamp}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                                      <strong>{moment.speaker.toUpperCase()}:</strong> "{moment.text}"
                                    </p>
                                    <p className="text-xs text-slate-500 mb-1">{moment.analysis}</p>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                                      <p className="text-xs text-blue-700 dark:text-blue-300">
                                        <Lightbulb className="h-3 w-3 inline mr-1" />
                                        {moment.coaching_note}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Strengths and Improvements */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-green-700 dark:text-green-400 mb-2">What Worked Well</h5>
                              <ul className="space-y-1">
                                {phase.strengths.map((strength, idx) => (
                                  <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                                    <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 mr-2 flex-shrink-0" />
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-orange-700 dark:text-orange-400 mb-2">Areas for Improvement</h5>
                              <ul className="space-y-1">
                                {phase.improvements.map((improvement, idx) => (
                                  <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                                    <Target className="h-3 w-3 text-orange-500 mt-1 mr-2 flex-shrink-0" />
                                    {improvement}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discovery Analysis */}
        <TabsContent value="discovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Discovery Quality Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {feedback.deepAnalysis.discovery && (
                <div className="space-y-6">
                  {/* SPIN Methodology Breakdown */}
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-4">SPIN Methodology Assessment</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {Object.entries(feedback.deepAnalysis.discovery.questioningTechnique.spinMethodology).map(([type, data]) => (
                        <div key={type} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                          <div className="text-center mb-2">
                            <h5 className="font-medium capitalize text-slate-700 dark:text-slate-300">
                              {type === 'needPayoff' ? 'Need-Payoff' : type}
                            </h5>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.count}</div>
                            <Badge variant={data.quality === 'excellent' ? 'default' : data.quality === 'good' ? 'secondary' : 'destructive'}>
                              {data.quality}
                            </Badge>
                          </div>
                          {data.examples && data.examples.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Examples:</p>
                              {data.examples.slice(0, 2).map((example, idx) => (
                                <p key={idx} className="text-xs text-slate-500 dark:text-slate-400 italic">"{example}"</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pain Point Discovery */}
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-4">Pain Point Discovery</h4>
                    <div className="space-y-3">
                      {feedback.deepAnalysis.discovery.painPointDiscovery.identifiedPains.map((pain, index) => (
                        <div key={index} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-slate-700 dark:text-slate-300">{pain.pain}</p>
                            <div className="flex space-x-1">
                              <Badge variant={pain.exploreDepth === 'deep' ? 'default' : pain.exploreDepth === 'moderate' ? 'secondary' : 'destructive'}>
                                {pain.exploreDepth}
                              </Badge>
                              <Badge variant={pain.businessImpact === 'quantified' ? 'default' : pain.businessImpact === 'implied' ? 'secondary' : 'destructive'}>
                                {pain.businessImpact}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-slate-500">Business Impact: {pain.businessImpact}</span>
                            <span className="text-slate-500">Emotional Resonance: {pain.emotionalResonance}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Business Impact Analysis */}
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-4">Business Impact Analysis</h4>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${feedback.deepAnalysis.discovery.businessImpactAnalysis.revenueImpactDiscussed ? 'text-green-600' : 'text-red-600'}`}>
                            {feedback.deepAnalysis.discovery.businessImpactAnalysis.revenueImpactDiscussed ? '✓' : '✗'}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Revenue Impact</p>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${feedback.deepAnalysis.discovery.businessImpactAnalysis.costImpactDiscussed ? 'text-green-600' : 'text-red-600'}`}>
                            {feedback.deepAnalysis.discovery.businessImpactAnalysis.costImpactDiscussed ? '✓' : '✗'}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Cost Impact</p>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${feedback.deepAnalysis.discovery.businessImpactAnalysis.timeImpactDiscussed ? 'text-green-600' : 'text-red-600'}`}>
                            {feedback.deepAnalysis.discovery.businessImpactAnalysis.timeImpactDiscussed ? '✓' : '✗'}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Time Impact</p>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${feedback.deepAnalysis.discovery.businessImpactAnalysis.strategicImpactDiscussed ? 'text-green-600' : 'text-red-600'}`}>
                            {feedback.deepAnalysis.discovery.businessImpactAnalysis.strategicImpactDiscussed ? '✓' : '✗'}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Strategic Impact</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Business Case Strength</span>
                          <span className="font-medium">{feedback.deepAnalysis.discovery.businessImpactAnalysis.businessCaseStrength}/100</span>
                        </div>
                        <Progress value={feedback.deepAnalysis.discovery.businessImpactAnalysis.businessCaseStrength} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Objection Handling */}
        <TabsContent value="objections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Objection Handling Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedback.deepAnalysis.objectionHandling && Object.keys(feedback.deepAnalysis.objectionHandling.objectionsByType).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(feedback.deepAnalysis.objectionHandling.objectionsByType).map(([type, objections]) => (
                    objections.length > 0 && (
                      <div key={type}>
                        <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-4 capitalize">
                          {type} Objections ({objections.length})
                        </h4>
                        <div className="space-y-3">
                          {objections.map((objection, index) => (
                            <div key={index} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                              <div className="space-y-3">
                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Prospect's Objection:</p>
                                  <p className="text-sm text-red-700 dark:text-red-400">"{objection.objection}"</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Rep's Response:</p>
                                  <p className="text-sm text-blue-700 dark:text-blue-400">"{objection.repResponse}"</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-sm font-medium">Effectiveness:</span>
                                      <Progress value={objection.effectiveness} className="flex-1 h-2" />
                                      <span className="text-sm font-bold">{objection.effectiveness}%</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {objection.technique.map((tech, techIndex) => (
                                        <Badge key={techIndex} variant="outline" className="text-xs">
                                          {tech}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                      <p className="text-xs font-medium text-green-800 dark:text-green-300">Suggested Improvement:</p>
                                      <p className="text-xs text-green-700 dark:text-green-400">{objection.improvementSuggestion}</p>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                                      <p className="text-xs font-medium text-purple-800 dark:text-purple-300">Better Response:</p>
                                      <p className="text-xs text-purple-700 dark:text-purple-400">"{objection.betterResponse}"</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No objections were raised during this call</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Analysis */}
        <TabsContent value="communication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Communication Skills Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedback.deepAnalysis.communication && (
                <div className="space-y-6">
                  {/* Tonal Analysis */}
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-4">Tonal Analysis</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      {Object.entries(feedback.deepAnalysis.communication.tonalAnalysis).map(([aspect, score]) => (
                        typeof score === 'number' && (
                          <div key={aspect} className="text-center">
                            <div className="relative w-16 h-16 mx-auto mb-2">
                              <svg className="w-16 h-16 transform -rotate-90">
                                <circle
                                  cx="32"
                                  cy="32"
                                  r="28"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="transparent"
                                  className="text-slate-200"
                                />
                                <circle
                                  cx="32"
                                  cy="32"
                                  r="28"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="transparent"
                                  strokeDasharray={`${(score / 100) * 175.9} 175.9`}
                                  className="text-teal-500"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold">{score}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{aspect}</p>
                          </div>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Language Patterns */}
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-4">Language Patterns</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {feedback.deepAnalysis.communication.languagePatterns.fillerWords && (
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                          <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Filler Words</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Total Count:</span>
                              <span className="font-medium">{feedback.deepAnalysis.communication.languagePatterns.fillerWords.count}</span>
                            </div>
                            <div className="space-y-1">
                              {feedback.deepAnalysis.communication.languagePatterns.fillerWords.types.map((type, index) => (
                                <div key={index} className="text-xs text-slate-500">{type}</div>
                              ))}
                            </div>
                            <Badge variant={
                              feedback.deepAnalysis.communication.languagePatterns.fillerWords.impactOnCredibility === 'high' ? 'destructive' :
                              feedback.deepAnalysis.communication.languagePatterns.fillerWords.impactOnCredibility === 'medium' ? 'secondary' : 'default'
                            }>
                              {feedback.deepAnalysis.communication.languagePatterns.fillerWords.impactOnCredibility} impact
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Listening Skills */}
                      {feedback.deepAnalysis.communication.listeningSkills && (
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                          <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Listening Skills</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Interruptions:</span>
                              <span className={`font-medium ${feedback.deepAnalysis.communication.listeningSkills.interruptionCount > 3 ? 'text-red-600' : 'text-green-600'}`}>
                                {feedback.deepAnalysis.communication.listeningSkills.interruptionCount}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Acknowledgments:</span>
                              <span className="font-medium">{feedback.deepAnalysis.communication.listeningSkills.acknowledgmentResponses}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Clarifying Questions:</span>
                              <span className="font-medium">{feedback.deepAnalysis.communication.listeningSkills.clarifyingQuestions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Summary Statements:</span>
                              <span className="font-medium">{feedback.deepAnalysis.communication.listeningSkills.summaryStatements}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coaching Recommendations */}
        <TabsContent value="coaching" className="space-y-4">
          <div className="grid gap-6">
            {/* Immediate Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <span>Immediate Action Items</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feedback.coaching.immediateActions.map((action, index) => (
                    <div key={index} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="font-medium text-slate-800 dark:text-slate-200">{action.action}</h5>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{action.rationale}</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge variant={action.difficulty === 'easy' ? 'default' : action.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                            {action.difficulty}
                          </Badge>
                          <Badge variant="outline">
                            {action.timeframe}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Skill Development */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  <span>Skill Development Plan</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedback.coaching.skillDevelopment.map((skill, index) => (
                    <div key={index} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-slate-800 dark:text-slate-200">{skill.skill}</h5>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{skill.currentLevel}</Badge>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <Badge variant="default">{skill.targetLevel}</Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h6 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Practice Exercises:</h6>
                          <ul className="space-y-1">
                            {skill.practiceExercises.map((exercise, exerciseIndex) => (
                              <li key={exerciseIndex} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                                <Target className="h-3 w-3 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                                {exercise}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Time to improve: {skill.timeToImprove}</span>
                          <Badge variant="secondary">{skill.successMetrics.length} success metrics</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Psychological Insights */}
            {feedback.coaching.psychologicalInsights && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-pink-500" />
                    <span>Prospect Psychology Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Personality Profile</h5>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{feedback.coaching.psychologicalInsights.prospectPersonality}</p>
                        <div className="mt-2">
                          <span className="text-sm font-medium">Communication Style: </span>
                          <Badge variant="outline">{feedback.coaching.psychologicalInsights.communicationStyle}</Badge>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Key Motivators</h5>
                        <div className="space-y-1">
                          {feedback.coaching.psychologicalInsights.motivators.map((motivator, index) => (
                            <div key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 mr-2" />
                              {motivator}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Adaptation Suggestions</h5>
                      <div className="space-y-2">
                        {feedback.coaching.psychologicalInsights.adaptationSuggestions.map((suggestion, index) => (
                          <div key={index} className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
                            <p className="text-sm text-purple-700 dark:text-purple-400">{suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Next Call Preparation */}
        <TabsContent value="nextcall" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-500" />
                <span>Next Call Preparation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Agenda Items</h5>
                    <ul className="space-y-1">
                      {feedback.nextCallPrep.agenda.map((item, index) => (
                        <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                          <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 mr-2 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Key Questions to Ask</h5>
                    <ul className="space-y-1">
                      {feedback.nextCallPrep.keyQuestions.map((question, index) => (
                        <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                          <MessageSquare className="h-3 w-3 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Objection Preparation</h5>
                    <ul className="space-y-1">
                      {feedback.nextCallPrep.objectionPrep.map((objection, index) => (
                        <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                          <AlertTriangle className="h-3 w-3 text-orange-500 mt-1 mr-2 flex-shrink-0" />
                          {objection}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Materials to Prepare</h5>
                    <ul className="space-y-1">
                      {feedback.nextCallPrep.materials.map((material, index) => (
                        <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                          <BookOpen className="h-3 w-3 text-purple-500 mt-1 mr-2 flex-shrink-0" />
                          {material}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              {feedback.nextCallPrep.valuePropRefinement && (
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h5 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Value Proposition Refinement</h5>
                  <p className="text-sm text-blue-700 dark:text-blue-400">{feedback.nextCallPrep.valuePropRefinement}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}