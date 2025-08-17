// Call Scoring Engine - Core implementation

import { openai } from '@/lib/api-utils';
import { CallTranscript } from '@/lib/types';
import {
  CallScore,
  ScoringMetric,
  TalkRatioAnalysis,
  DiscoveryQualityAnalysis,
  ObjectionHandlingAnalysis,
  CTAAnalysis,
  ConfidenceAnalysis,
  SentimentAnalysis,
  MethodologyAnalysis,
  CoachingFeedback
} from '../types/scoring-types';
import { CallType } from '../types/prospect-types';
import { 
  buildScoringPrompt, 
  buildDetailedAnalysisPrompt,
  METRIC_EVALUATIONS 
} from '../prompts/scoring-rubrics';
import { generateCoachingFeedback } from '../prompts/feedback-templates';
import { 
  METRIC_WEIGHTS, 
  IDEAL_TALK_RATIOS,
  FILLER_WORDS,
  CONFIDENCE_INDICATORS,
  QUESTION_QUALITY,
  OBJECTION_TECHNIQUES
} from '../config/scoring-weights';
import { AI_MODEL_CONFIG } from '../config/ai-model-config';

export class CallScoringEngine {
  private transcript: CallTranscript[];
  private callType: CallType;
  private transcriptText: string;

  constructor(transcript: CallTranscript[], callType: CallType = 'discovery-outbound') {
    this.transcript = transcript;
    this.callType = callType;
    this.transcriptText = this.formatTranscript();
  }

  private formatTranscript(): string {
    return this.transcript
      .map(turn => {
        // Handle different transcript formats safely
        const speaker = turn.speaker || 'UNKNOWN';
        const message = turn.message || turn.text || '';
        return `${speaker.toUpperCase()}: ${message}`;
      })
      .filter(line => line.trim() !== ': ') // Remove empty entries
      .join('\n\n');
  }

  async scoreCall(): Promise<CallScore> {
    try {
      // Get AI-powered scoring
      const aiScoring = await this.getAIScoring();
      
      // Get detailed analysis
      const detailedAnalysis = await this.getDetailedAnalysis();
      
      // Calculate final scores with weights
      const finalScore = this.calculateWeightedScore(aiScoring);
      
      // Generate coaching feedback
      const coachingFeedback = generateCoachingFeedback(
        finalScore,
        this.callType,
        'manager' // Default persona level for now
      );
      
      // Combine everything
      return {
        ...finalScore,
        detailedAnalysis,
        coachingFeedback
      };

    } catch (error) {
      console.error('Scoring engine error:', error);
      return this.generateFallbackScore();
    }
  }

  private async getAIScoring(): Promise<any> {
    const prompt = buildScoringPrompt(this.callType, this.transcriptText);
    
    const completion = await openai.chat.completions.create({
      model: AI_MODEL_CONFIG.scoring.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales trainer. Provide scoring in the exact JSON format requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: AI_MODEL_CONFIG.scoring.temperature,
      max_tokens: AI_MODEL_CONFIG.scoring.maxTokens,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No AI response received');
    
    return JSON.parse(response);
  }

  private async getDetailedAnalysis(): Promise<any> {
    const prompt = buildDetailedAnalysisPrompt(this.transcriptText);
    
    const completion = await openai.chat.completions.create({
      model: AI_MODEL_CONFIG.analysis.model,
      messages: [
        {
          role: 'system',
          content: 'You are analyzing sales conversation dynamics. Provide analysis in the exact JSON format requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: AI_MODEL_CONFIG.analysis.temperature,
      max_tokens: AI_MODEL_CONFIG.analysis.maxTokens,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No analysis response received');
    
    return JSON.parse(response);
  }

  private calculateWeightedScore(aiScoring: any): CallScore {
    const weights = METRIC_WEIGHTS[this.callType];
    
    // Build scoring metrics
    const metrics: Record<string, ScoringMetric> = {
      talkRatio: {
        name: 'Talk Ratio',
        score: aiScoring.metrics.talkRatio.score,
        weight: weights.talkRatio,
        details: aiScoring.metrics.talkRatio,
        feedback: [aiScoring.metrics.talkRatio.analysis]
      },
      discovery: {
        name: 'Discovery Quality',
        score: aiScoring.metrics.discovery.score,
        weight: weights.discovery,
        details: aiScoring.metrics.discovery,
        feedback: [aiScoring.metrics.discovery.analysis]
      },
      objectionHandling: {
        name: 'Objection Handling',
        score: aiScoring.metrics.objectionHandling.score,
        weight: weights.objectionHandling,
        details: aiScoring.metrics.objectionHandling,
        feedback: [aiScoring.metrics.objectionHandling.analysis]
      },
      confidence: {
        name: 'Confidence & Presence',
        score: aiScoring.metrics.confidence.score,
        weight: weights.confidence,
        details: aiScoring.metrics.confidence,
        feedback: [aiScoring.metrics.confidence.analysis]
      },
      cta: {
        name: 'Call to Action',
        score: aiScoring.metrics.cta.score,
        weight: weights.cta,
        details: aiScoring.metrics.cta,
        feedback: [aiScoring.metrics.cta.analysis]
      }
    };
    
    // Calculate weighted overall score
    const overallScore = Object.values(metrics).reduce((total, metric) => {
      return total + (metric.score * metric.weight);
    }, 0);
    
    return {
      overallScore: Math.round(overallScore),
      breakdown: metrics as any,
      detailedAnalysis: {} as any, // Will be filled by caller
      strengths: aiScoring.strengths || [],
      improvements: aiScoring.improvements?.map((imp: any) => imp.issue) || [],
      coachingFeedback: {} as any // Will be filled by caller
    };
  }

  // Manual analysis methods for when AI is unavailable
  analyzeTalkRatio(): TalkRatioAnalysis {
    const repMessages = this.transcript.filter(t => (t.speaker || '').toLowerCase() === 'rep');
    const totalMessages = this.transcript.length;
    const repTalkPercentage = totalMessages > 0 ? (repMessages.length / totalMessages) * 100 : 0;
    const prospectTalkPercentage = 100 - repTalkPercentage;
    
    const idealRange = IDEAL_TALK_RATIOS[this.callType];
    const isOptimal = repTalkPercentage >= idealRange.min && repTalkPercentage <= idealRange.max;
    
    // Analyze talk segments
    const segments = this.analyzeTalkSegments();
    const monologues = this.detectMonologues();
    
    return {
      repTalkPercentage,
      prospectTalkPercentage,
      idealRange,
      isOptimal,
      segments,
      monologues
    };
  }

  private analyzeTalkSegments(): Array<any> {
    const segments = [];
    let currentSpeaker = this.transcript[0]?.speaker;
    let segmentStart = 0;
    let segmentMessages = 1;
    
    for (let i = 1; i < this.transcript.length; i++) {
      if (this.transcript[i].speaker !== currentSpeaker) {
        segments.push({
          speaker: currentSpeaker,
          startTime: segmentStart,
          endTime: i,
          duration: segmentMessages
        });
        
        currentSpeaker = this.transcript[i].speaker;
        segmentStart = i;
        segmentMessages = 1;
      } else {
        segmentMessages++;
      }
    }
    
    // Add final segment
    if (this.transcript.length > 0) {
      segments.push({
        speaker: currentSpeaker,
        startTime: segmentStart,
        endTime: this.transcript.length - 1,
        duration: segmentMessages
      });
    }
    
    return segments;
  }

  private detectMonologues(): Array<any> {
    const segments = this.analyzeTalkSegments();
    const monologues = [];
    
    for (const segment of segments) {
      if (segment.duration >= 3) { // 3+ consecutive messages = monologue
        const messages = this.transcript.slice(segment.startTime, segment.endTime + 1);
        monologues.push({
          speaker: segment.speaker,
          startTime: segment.startTime,
          duration: segment.duration,
          content: messages.map(m => m.message || m.text || '').join(' ')
        });
      }
    }
    
    return monologues;
  }

  analyzeDiscoveryQuality(): DiscoveryQualityAnalysis {
    const repMessages = this.transcript.filter(t => (t.speaker || '').toLowerCase() === 'rep');
    const questions = repMessages.filter(m => (m.message || m.text || '').includes('?'));
    
    // Categorize questions
    const openQuestions = questions.filter(q => this.isOpenQuestion(q.message || q.text || ''));
    const closedQuestions = questions.filter(q => !this.isOpenQuestion(q.message || q.text || ''));
    
    // Analyze question categories (SPIN methodology)
    const categories = this.categorizeQuestions(questions);
    
    // Determine discovery depth
    const depth = this.assessDiscoveryDepth(questions, categories);
    
    // Find strong and weak questions
    const { strongQuestions, weakQuestions } = this.evaluateQuestions(questions);
    
    return {
      totalQuestions: questions.length,
      openQuestions: openQuestions.length,
      closedQuestions: closedQuestions.length,
      openQuestionRatio: questions.length > 0 ? openQuestions.length / questions.length : 0,
      questionCategories: categories,
      discoveryDepth: depth,
      missedOpportunities: this.findMissedOpportunities(),
      strongQuestions,
      weakQuestions
    };
  }

  private isOpenQuestion(question: string): boolean {
    const closedStarters = ['do you', 'are you', 'is it', 'can you', 'will you', 'have you', 'did you', 'would you'];
    const lowerQuestion = question.toLowerCase();
    
    return !closedStarters.some(starter => lowerQuestion.startsWith(starter));
  }

  private categorizeQuestions(questions: CallTranscript[]): any {
    const categories = {
      situation: 0,
      problem: 0,
      implication: 0,
      needPayoff: 0,
      other: 0
    };
    
    questions.forEach(q => {
      const lower = (q.message || q.text || '').toLowerCase();
      
      if (lower.includes('tell me about') || lower.includes('currently') || lower.includes('describe')) {
        categories.situation++;
      } else if (lower.includes('challenge') || lower.includes('problem') || lower.includes('issue')) {
        categories.problem++;
      } else if (lower.includes('impact') || lower.includes('affect') || lower.includes('consequence')) {
        categories.implication++;
      } else if (lower.includes('ideal') || lower.includes('success') || lower.includes('benefit')) {
        categories.needPayoff++;
      } else {
        categories.other++;
      }
    });
    
    return categories;
  }

  private assessDiscoveryDepth(questions: CallTranscript[], categories: any): 'surface' | 'moderate' | 'deep' {
    const hasBusinessImpact = questions.some(q => {
      const msg = (q.message || q.text || '').toLowerCase();
      return msg.includes('revenue') || msg.includes('cost') || msg.includes('roi');
    });
    
    const hasPainExploration = categories.problem > 0 && categories.implication > 0;
    const hasVisionBuilding = categories.needPayoff > 0;
    
    if (hasBusinessImpact && hasPainExploration && hasVisionBuilding) {
      return 'deep';
    } else if (hasPainExploration || hasBusinessImpact) {
      return 'moderate';
    } else {
      return 'surface';
    }
  }

  private evaluateQuestions(questions: CallTranscript[]): { strongQuestions: any[], weakQuestions: any[] } {
    const strongQuestions: any[] = [];
    const weakQuestions: any[] = [];
    
    questions.forEach(q => {
      const questionText = q.message || q.text || '';
      const isStrong = QUESTION_QUALITY.highValue.some(phrase => 
        questionText.toLowerCase().includes(phrase)
      );
      
      const isWeak = QUESTION_QUALITY.lowValue.some(phrase => 
        questionText.toLowerCase().startsWith(phrase)
      );
      
      if (isStrong) {
        strongQuestions.push({
          question: questionText,
          category: 'discovery',
          impact: 'Uncovers valuable business information'
        });
      } else if (isWeak) {
        weakQuestions.push({
          question: questionText,
          issue: 'Closed question limits information gathering',
          suggestion: 'Rephrase as open question starting with "What" or "How"'
        });
      }
    });
    
    return { strongQuestions, weakQuestions };
  }

  private findMissedOpportunities(): string[] {
    const opportunities: string[] = [];
    const prospectMessages = this.transcript.filter(t => {
      const speaker = (t.speaker || '').toLowerCase();
      return speaker === 'ai' || speaker === 'prospect';
    });
    
    // Look for unexplored pain points
    prospectMessages.forEach((msg, index) => {
      const lower = (msg.message || msg.text || '').toLowerCase();
      
      if (lower.includes('struggle') || lower.includes('challenge') || lower.includes('difficult')) {
        // Check if rep followed up
        const nextRepMessage = this.transcript.slice(index + 1).find(t => 
          (t.speaker || '').toLowerCase() === 'rep'
        );
        if (!nextRepMessage || !(nextRepMessage.message || nextRepMessage.text || '').includes('?')) {
          opportunities.push('Prospect mentioned a challenge but rep didn\'t explore it');
        }
      }
      
      if (lower.includes('budget') || lower.includes('cost')) {
        const hasROIDiscussion = this.transcript.slice(index).some(t => {
          const speaker = (t.speaker || '').toLowerCase();
          const text = (t.message || t.text || '').toLowerCase();
          return speaker === 'rep' && (text.includes('roi') || text.includes('value'));
        });
        if (!hasROIDiscussion) {
          opportunities.push('Budget mentioned but ROI/value not discussed');
        }
      }
    });
    
    return opportunities;
  }

  analyzeObjectionHandling(): ObjectionHandlingAnalysis {
    const objections = this.identifyObjections();
    const handledObjections = this.evaluateObjectionHandling(objections);
    
    return {
      totalObjections: objections.length,
      handledSuccessfully: handledObjections.filter(o => o.handled).length,
      successRate: objections.length > 0 
        ? handledObjections.filter(o => o.handled).length / objections.length 
        : 1,
      objectionTypes: handledObjections,
      missedObjections: handledObjections.filter(o => !o.handled).map(o => o.objection),
      techniques: this.countObjectionTechniques(handledObjections)
    };
  }

  private identifyObjections(): Array<{ index: number; objection: string }> {
    const objections: Array<{ index: number; objection: string }> = [];
    const objectionPhrases = [
      'too expensive', 'don\'t have budget', 'not interested',
      'already have', 'not the right time', 'need to think',
      'talk to my', 'send me information', 'not a priority'
    ];
    
    this.transcript.forEach((turn, index) => {
      const speaker = (turn.speaker || '').toLowerCase();
      if (speaker === 'ai' || speaker === 'prospect') {
        const lower = (turn.message || turn.text || '').toLowerCase();
        if (objectionPhrases.some(phrase => lower.includes(phrase))) {
          objections.push({ index, objection: turn.message || turn.text || '' });
        }
      }
    });
    
    return objections;
  }

  private evaluateObjectionHandling(objections: Array<{ index: number; objection: string }>): any[] {
    return objections.map(obj => {
      // Find rep's response
      const response = this.transcript
        .slice(obj.index + 1)
        .find(t => (t.speaker || '').toLowerCase() === 'rep');
      
      if (!response) {
        return {
          type: 'unaddressed',
          objection: obj.objection,
          response: 'No response',
          handled: false,
          technique: 'none',
          effectiveness: 'poor'
        };
      }
      
      // Evaluate response quality
      const responseText = response.message || response.text || '';
      const technique = this.identifyObjectionTechnique(responseText);
      const effectiveness = this.evaluateObjectionResponse(obj.objection, responseText);
      
      return {
        type: this.categorizeObjection(obj.objection),
        objection: obj.objection,
        response: responseText,
        handled: effectiveness !== 'poor',
        technique,
        effectiveness
      };
    });
  }

  private identifyObjectionTechnique(response: string): string {
    const lower = response.toLowerCase();
    const techniques = [];
    
    if (OBJECTION_TECHNIQUES.acknowledge.some(phrase => lower.includes(phrase))) {
      techniques.push('acknowledge');
    }
    if (OBJECTION_TECHNIQUES.clarify.some(phrase => lower.includes(phrase))) {
      techniques.push('clarify');
    }
    if (OBJECTION_TECHNIQUES.respond.some(phrase => lower.includes(phrase))) {
      techniques.push('respond');
    }
    if (OBJECTION_TECHNIQUES.confirm.some(phrase => lower.includes(phrase))) {
      techniques.push('confirm');
    }
    
    return techniques.length > 0 ? techniques.join('-') : 'direct-response';
  }

  private evaluateObjectionResponse(objection: string, response: string): 'poor' | 'fair' | 'good' | 'excellent' {
    const hasAcknowledgment = OBJECTION_TECHNIQUES.acknowledge.some(phrase => 
      response.toLowerCase().includes(phrase)
    );
    const hasValue = response.toLowerCase().includes('value') || response.toLowerCase().includes('benefit');
    const hasEvidence = response.includes('client') || response.includes('%') || response.includes('study');
    const hasQuestion = response.includes('?');
    
    let score = 0;
    if (hasAcknowledgment) score++;
    if (hasValue) score++;
    if (hasEvidence) score++;
    if (hasQuestion) score++;
    
    if (score >= 3) return 'excellent';
    if (score >= 2) return 'good';
    if (score >= 1) return 'fair';
    return 'poor';
  }

  private categorizeObjection(objection: string): string {
    const lower = objection.toLowerCase();
    
    if (lower.includes('expensive') || lower.includes('budget') || lower.includes('cost')) {
      return 'budget';
    }
    if (lower.includes('time') || lower.includes('busy')) {
      return 'timing';
    }
    if (lower.includes('already have') || lower.includes('current')) {
      return 'status-quo';
    }
    if (lower.includes('authority') || lower.includes('decision') || lower.includes('my boss')) {
      return 'authority';
    }
    
    return 'general';
  }

  private countObjectionTechniques(handledObjections: any[]): any {
    const techniques = {
      acknowledge: 0,
      clarify: 0,
      respond: 0,
      confirm: 0
    };
    
    handledObjections.forEach(obj => {
      if (obj.technique.includes('acknowledge')) techniques.acknowledge++;
      if (obj.technique.includes('clarify')) techniques.clarify++;
      if (obj.technique.includes('respond')) techniques.respond++;
      if (obj.technique.includes('confirm')) techniques.confirm++;
    });
    
    return techniques;
  }

  private generateFallbackScore(): CallScore {
    // Basic scoring when AI is unavailable
    const talkRatio = this.analyzeTalkRatio();
    const discovery = this.analyzeDiscoveryQuality();
    const objectionHandling = this.analyzeObjectionHandling();
    
    const basicScore = {
      overallScore: 50,
      breakdown: {
        talkRatio: {
          name: 'Talk Ratio',
          score: talkRatio.isOptimal ? 80 : 50,
          weight: METRIC_WEIGHTS[this.callType].talkRatio,
          details: talkRatio,
          feedback: ['Unable to perform detailed analysis']
        },
        discovery: {
          name: 'Discovery Quality',
          score: discovery.openQuestionRatio > 0.5 ? 70 : 40,
          weight: METRIC_WEIGHTS[this.callType].discovery,
          details: discovery,
          feedback: ['Unable to perform detailed analysis']
        },
        objectionHandling: {
          name: 'Objection Handling',
          score: objectionHandling.successRate * 100,
          weight: METRIC_WEIGHTS[this.callType].objectionHandling,
          details: objectionHandling,
          feedback: ['Unable to perform detailed analysis']
        },
        confidence: {
          name: 'Confidence & Presence',
          score: 50,
          weight: METRIC_WEIGHTS[this.callType].confidence,
          details: {},
          feedback: ['Unable to analyze confidence without AI']
        },
        cta: {
          name: 'Call to Action',
          score: 50,
          weight: METRIC_WEIGHTS[this.callType].cta,
          details: {},
          feedback: ['Unable to analyze CTA without AI']
        }
      },
      detailedAnalysis: {
        talkRatio,
        discovery,
        objectionHandling,
        cta: {} as CTAAnalysis,
        confidence: {} as ConfidenceAnalysis,
        sentiment: {} as SentimentAnalysis,
        methodology: {} as MethodologyAnalysis
      },
      strengths: ['Call completed successfully'],
      improvements: ['Full analysis unavailable'],
      coachingFeedback: {
        summary: 'Basic analysis completed. Full AI-powered analysis unavailable.',
        strengths: [],
        improvements: [],
        missedOpportunities: [],
        nextCallPrep: [],
        practiceRecommendations: []
      }
    };
    
    return basicScore as CallScore;
  }
}