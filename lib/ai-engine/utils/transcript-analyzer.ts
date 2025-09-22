// Transcript analysis utilities

import { CallTranscript } from '@/lib/types';
import { 
  FILLER_WORDS, 
  CONFIDENCE_INDICATORS,
  OBJECTION_TECHNIQUES 
} from '../config/scoring-weights';

export class TranscriptAnalyzer {
  private transcript: CallTranscript[];
  
  constructor(transcript: CallTranscript[]) {
    this.transcript = transcript;
  }

  // Extract all questions from the transcript
  extractQuestions(): Array<{ question: string; speaker: string; index: number }> {
    const questions = [];
    
    this.transcript.forEach((turn, index) => {
      if (turn.message.includes('?')) {
        questions.push({
          question: turn.message,
          speaker: turn.speaker,
          index
        });
      }
    });
    
    return questions;
  }

  // Categorize questions by type
  categorizeQuestions(): Record<string, CallTranscript[]> {
    const categories = {
      open: [],
      closed: [],
      situational: [],
      problem: [],
      implication: [],
      needPayoff: [],
      other: []
    };
    
    const questions = this.transcript.filter(t => 
      t.speaker === 'rep' && t.message.includes('?')
    );
    
    questions.forEach(q => {
      const lower = q.message.toLowerCase();
      
      // Open vs Closed
      if (this.isOpenQuestion(q.message)) {
        categories.open.push(q);
      } else {
        categories.closed.push(q);
      }
      
      // SPIN categories
      if (lower.includes('tell me about') || lower.includes('describe') || lower.includes('currently')) {
        categories.situational.push(q);
      } else if (lower.includes('challenge') || lower.includes('problem') || lower.includes('difficult')) {
        categories.problem.push(q);
      } else if (lower.includes('impact') || lower.includes('affect') || lower.includes('cost')) {
        categories.implication.push(q);
      } else if (lower.includes('ideal') || lower.includes('if you could') || lower.includes('success')) {
        categories.needPayoff.push(q);
      } else {
        categories.other.push(q);
      }
    });
    
    return categories;
  }

  private isOpenQuestion(question: string): boolean {
    const closedStarters = [
      'do you', 'are you', 'is it', 'can you', 
      'will you', 'have you', 'did you', 'would you',
      'does your', 'is there', 'has your'
    ];
    
    const lower = question.toLowerCase().trim();
    return !closedStarters.some(starter => lower.startsWith(starter));
  }

  // Find objections in the transcript
  findObjections(): Array<{
    objection: string;
    response?: string;
    handled: boolean;
    index: number;
  }> {
    const objections = [];
    const objectionKeywords = [
      'too expensive', 'budget', 'not interested', 'already have',
      'not the right time', 'need to think', 'talk to my',
      'send me information', 'not a priority', 'too busy',
      'don\'t see the value', 'working fine', 'don\'t need'
    ];
    
    this.transcript.forEach((turn, index) => {
      if (turn.speaker !== 'rep') {
        const lower = turn.message.toLowerCase();
        const hasObjection = objectionKeywords.some(keyword => lower.includes(keyword));
        
        if (hasObjection) {
          // Find the rep's response
          const nextRepIndex = this.transcript
            .slice(index + 1)
            .findIndex(t => t.speaker === 'rep');
          
          const response = nextRepIndex !== -1 
            ? this.transcript[index + 1 + nextRepIndex].message 
            : undefined;
          
          objections.push({
            objection: turn.message,
            response,
            handled: !!response && this.evaluateObjectionHandling(response),
            index
          });
        }
      }
    });
    
    return objections;
  }

  private evaluateObjectionHandling(response: string): boolean {
    const lower = response.toLowerCase();
    let score = 0;
    
    // Check for acknowledgment
    if (OBJECTION_TECHNIQUES.acknowledge.some(phrase => lower.includes(phrase))) {
      score++;
    }
    
    // Check for clarification
    if (OBJECTION_TECHNIQUES.clarify.some(phrase => lower.includes(phrase))) {
      score++;
    }
    
    // Check for value/benefit mention
    if (lower.includes('value') || lower.includes('benefit') || lower.includes('roi')) {
      score++;
    }
    
    // Check for confirmation
    if (OBJECTION_TECHNIQUES.confirm.some(phrase => lower.includes(phrase))) {
      score++;
    }
    
    return score >= 2; // At least 2 elements for "handled"
  }

  // Analyze confidence indicators
  analyzeConfidence(): {
    fillerWordCount: number;
    confidenceScore: number;
    examples: string[];
  } {
    let fillerWordCount = 0;
    let positiveIndicators = 0;
    let negativeIndicators = 0;
    const examples = [];
    
    const repMessages = this.transcript.filter(t => t.speaker === 'rep');
    
    repMessages.forEach(msg => {
      const lower = msg.message.toLowerCase();
      
      // Count filler words
      FILLER_WORDS.forEach(filler => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        const matches = lower.match(regex);
        if (matches) {
          fillerWordCount += matches.length;
          if (examples.length < 3 && matches.length > 2) {
            examples.push(`Excessive "${filler}" in: "${msg.message.substring(0, 50)}..."`);
          }
        }
      });
      
      // Count confidence indicators
      CONFIDENCE_INDICATORS.positive.forEach(indicator => {
        if (lower.includes(indicator.toLowerCase())) {
          positiveIndicators++;
        }
      });
      
      CONFIDENCE_INDICATORS.negative.forEach(indicator => {
        if (lower.includes(indicator.toLowerCase())) {
          negativeIndicators++;
          if (examples.length < 3) {
            examples.push(`Uncertain language: "${msg.message.substring(0, 50)}..."`);
          }
        }
      });
    });
    
    // Calculate confidence score (0-100)
    const totalMessages = repMessages.length || 1;
    const fillerRatio = fillerWordCount / totalMessages;
    const confidenceRatio = (positiveIndicators - negativeIndicators) / totalMessages;
    
    let confidenceScore = 70; // Base score
    confidenceScore -= Math.min(30, fillerRatio * 10); // Deduct for fillers
    confidenceScore += Math.max(-20, Math.min(30, confidenceRatio * 20)); // Adjust for indicators
    
    return {
      fillerWordCount,
      confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
      examples
    };
  }

  // Find value propositions mentioned
  findValuePropositions(): string[] {
    const valueProps = [];
    const valueKeywords = [
      'we help', 'our solution', 'benefit', 'value', 'save',
      'increase', 'improve', 'reduce', 'streamline', 'optimize',
      'roi', 'return on investment', 'efficiency', 'productivity'
    ];
    
    const repMessages = this.transcript.filter(t => t.speaker === 'rep');
    
    repMessages.forEach(msg => {
      const lower = msg.message.toLowerCase();
      if (valueKeywords.some(keyword => lower.includes(keyword))) {
        valueProps.push(msg.message);
      }
    });
    
    return valueProps;
  }

  // Analyze call flow and pacing
  analyzeCallFlow(): {
    phases: Array<{ phase: string; startIndex: number; endIndex: number }>;
    smoothness: 'smooth' | 'choppy' | 'disjointed';
    monologues: Array<{ speaker: string; startIndex: number; length: number }>;
  } {
    const phases = this.identifyPhases();
    const monologues = this.findMonologues();
    const smoothness = this.assessFlowSmoothness(phases, monologues);
    
    return { phases, smoothness, monologues };
  }

  private identifyPhases(): Array<{ phase: string; startIndex: number; endIndex: number }> {
    const phases = [];
    let currentPhase = 'opening';
    let phaseStart = 0;
    
    this.transcript.forEach((turn, index) => {
      const newPhase = this.detectPhase(turn, currentPhase);
      
      if (newPhase !== currentPhase) {
        phases.push({
          phase: currentPhase,
          startIndex: phaseStart,
          endIndex: index - 1
        });
        
        currentPhase = newPhase;
        phaseStart = index;
      }
    });
    
    // Add final phase
    if (this.transcript.length > 0) {
      phases.push({
        phase: currentPhase,
        startIndex: phaseStart,
        endIndex: this.transcript.length - 1
      });
    }
    
    return phases;
  }

  private detectPhase(turn: CallTranscript, currentPhase: string): string {
    const lower = turn.message.toLowerCase();
    
    if (lower.includes('next step') || lower.includes('meeting') || lower.includes('follow up')) {
      return 'closing';
    }
    
    if (turn.speaker !== 'rep' && this.isObjection(lower)) {
      return 'objection-handling';
    }
    
    if (turn.speaker === 'rep' && this.isValueProp(lower)) {
      return 'value-proposition';
    }
    
    if (turn.speaker === 'rep' && lower.includes('?') && currentPhase === 'opening') {
      return 'discovery';
    }
    
    return currentPhase;
  }

  private isObjection(message: string): boolean {
    const objectionKeywords = ['expensive', 'budget', 'not interested', 'already have'];
    return objectionKeywords.some(keyword => message.includes(keyword));
  }

  private isValueProp(message: string): boolean {
    const valueKeywords = ['we help', 'our solution', 'benefit', 'value'];
    return valueKeywords.some(keyword => message.includes(keyword));
  }

  private findMonologues(): Array<{ speaker: string; startIndex: number; length: number }> {
    const monologues = [];
    let currentSpeaker = null;
    let consecutiveCount = 0;
    let startIndex = 0;
    
    this.transcript.forEach((turn, index) => {
      if (turn.speaker === currentSpeaker) {
        consecutiveCount++;
      } else {
        if (consecutiveCount >= 3) {
          monologues.push({
            speaker: currentSpeaker,
            startIndex,
            length: consecutiveCount
          });
        }
        
        currentSpeaker = turn.speaker;
        consecutiveCount = 1;
        startIndex = index;
      }
    });
    
    // Check final sequence
    if (consecutiveCount >= 3) {
      monologues.push({
        speaker: currentSpeaker,
        startIndex,
        length: consecutiveCount
      });
    }
    
    return monologues;
  }

  private assessFlowSmoothness(
    phases: Array<{ phase: string; startIndex: number; endIndex: number }>,
    monologues: Array<{ speaker: string; startIndex: number; length: number }>
  ): 'smooth' | 'choppy' | 'disjointed' {
    // Too many phase changes = choppy
    if (phases.length > 6) return 'choppy';
    
    // Too many monologues = disjointed
    if (monologues.length > 3) return 'disjointed';
    
    // Very long monologues = disjointed
    if (monologues.some(m => m.length > 5)) return 'disjointed';
    
    return 'smooth';
  }

  // Generate conversation summary
  generateSummary(): {
    totalTurns: number;
    repTurns: number;
    prospectTurns: number;
    questions: number;
    objections: number;
    valueProps: number;
    avgMessageLength: number;
    keyTopics: string[];
  } {
    const repTurns = this.transcript.filter(t => t.speaker === 'rep').length;
    const prospectTurns = this.transcript.length - repTurns;
    const questions = this.extractQuestions().filter(q => q.speaker === 'rep').length;
    const objections = this.findObjections().length;
    const valueProps = this.findValuePropositions().length;
    
    // Calculate average message length
    const totalLength = this.transcript.reduce((sum, turn) => sum + turn.message.length, 0);
    const avgMessageLength = this.transcript.length > 0 ? totalLength / this.transcript.length : 0;
    
    // Extract key topics
    const keyTopics = this.extractKeyTopics();
    
    return {
      totalTurns: this.transcript.length,
      repTurns,
      prospectTurns,
      questions,
      objections,
      valueProps,
      avgMessageLength: Math.round(avgMessageLength),
      keyTopics
    };
  }

  private extractKeyTopics(): string[] {
    const topics = new Set<string>();
    const topicKeywords = {
      'budget': ['budget', 'cost', 'price', 'investment'],
      'timeline': ['timeline', 'when', 'timeframe', 'deadline'],
      'decision process': ['decision', 'approval', 'process'],
      'competition': ['competitor', 'alternative', 'current solution'],
      'implementation': ['implementation', 'rollout', 'deployment'],
      'integration': ['integrate', 'integration', 'connect'],
      'roi': ['roi', 'return', 'value', 'benefit'],
      'pain points': ['challenge', 'problem', 'issue', 'struggle']
    };
    
    this.transcript.forEach(turn => {
      const lower = turn.message.toLowerCase();
      
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => lower.includes(keyword))) {
          topics.add(topic);
        }
      });
    });
    
    return Array.from(topics);
  }
}