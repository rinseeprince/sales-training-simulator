// Conversation State Manager

import { 
  ConversationContext, 
  ConversationTurn, 
  ConversationEvent,
  ConversationAnalytics 
} from '../types/conversation-types';
import { ConversationState, ProspectMemory } from '../types/prospect-types';
import { randomUUID } from 'crypto';

export class ConversationManager {
  private context: ConversationContext;
  private events: ConversationEvent[] = [];
  
  constructor(scenarioId: string) {
    this.context = {
      scenarioId,
      sessionId: randomUUID(),
      startTime: new Date().toISOString(),
      currentPhase: 'opening',
      turns: [],
      state: this.initializeState(),
      memory: this.initializeMemory(),
      metrics: {
        duration: 0,
        turnCount: 0,
        avgResponseTime: 0
      }
    };
  }

  private initializeState(): ConversationState {
    return {
      currentPhase: 'opening',
      rapportLevel: 0.1,
      trustLevel: 0.1,
      engagementLevel: 0.5,
      objectionsSurfaced: [],
      painPointsDiscovered: [],
      valuePropsPresented: [],
      questionsAsked: [],
      commitmentsGiven: [],
      nextStepsDiscussed: false,
      budgetDiscussed: false,
      timelineDiscussed: false,
      decisionMakersIdentified: false
    };
  }

  private initializeMemory(): ProspectMemory {
    return {
      conversationHistory: [],
      revealedInformation: {
        company: {},
        personal: {},
        challenges: [],
        goals: [],
        budget: null,
        timeline: null,
        decisionProcess: null
      },
      repTactics: {
        questionsAsked: [],
        valuePropsUsed: [],
        objectionHandlingApproaches: [],
        closingAttempts: 0
      },
      emotionalJourney: []
    };
  }

  addTurn(speaker: 'rep' | 'prospect', message: string, metadata?: any): ConversationTurn {
    const turn: ConversationTurn = {
      id: randomUUID(),
      speaker,
      message,
      timestamp: new Date().toISOString(),
      metadata: {
        phase: this.context.currentPhase,
        ...metadata
      }
    };

    this.context.turns.push(turn);
    this.context.metrics.turnCount++;
    
    // Update conversation history in memory
    this.context.memory.conversationHistory.push({
      speaker,
      message,
      timestamp: turn.timestamp,
      phase: this.context.currentPhase
    });

    // Analyze turn for events
    this.analyzeTurn(turn);
    
    return turn;
  }

  private analyzeTurn(turn: ConversationTurn): void {
    const message = turn.message.toLowerCase();
    
    // Detect phase changes
    if (this.shouldChangePhase(turn)) {
      const newPhase = this.determineNewPhase(turn);
      if (newPhase !== this.context.currentPhase) {
        this.recordPhaseChange(this.context.currentPhase, newPhase, turn);
        this.context.currentPhase = newPhase;
        this.context.state.currentPhase = newPhase;
      }
    }

    // Detect events
    if (message.includes('?') && turn.speaker === 'rep') {
      this.recordEvent('question', turn.timestamp, { question: turn.message }, 'neutral');
      this.context.state.questionsAsked.push(turn.message);
    }

    if (this.isObjection(message) && turn.speaker === 'prospect') {
      this.recordEvent('objection', turn.timestamp, { objection: turn.message }, 'negative');
      if (!this.context.state.objectionsSurfaced.includes(turn.message)) {
        this.context.state.objectionsSurfaced.push(turn.message);
      }
    }

    if (this.isValueProp(message) && turn.speaker === 'rep') {
      this.recordEvent('value-prop', turn.timestamp, { valueProp: turn.message }, 'positive');
      this.context.state.valuePropsPresented.push(turn.message);
    }

    if (this.isClosingAttempt(message) && turn.speaker === 'rep') {
      this.recordEvent('closing-attempt', turn.timestamp, { attempt: turn.message }, 'neutral');
      this.context.memory.repTactics.closingAttempts++;
    }

    if (this.isCommitment(message) && turn.speaker === 'prospect') {
      this.recordEvent('commitment', turn.timestamp, { commitment: turn.message }, 'positive');
      this.context.state.commitmentsGiven.push(turn.message);
    }
  }

  private shouldChangePhase(turn: ConversationTurn): boolean {
    const phaseTransitionKeywords = {
      discovery: ['tell me about', 'what challenges', 'how do you'],
      'value-prop': ['our solution', 'we help', 'the benefit'],
      'objection-handling': ['too expensive', 'not interested', 'already have'],
      closing: ['next steps', 'meeting', 'demo', 'proposal']
    };

    const message = turn.message.toLowerCase();
    
    for (const [phase, keywords] of Object.entries(phaseTransitionKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return true;
      }
    }
    
    return false;
  }

  private determineNewPhase(turn: ConversationTurn): string {
    const message = turn.message.toLowerCase();
    
    if (message.includes('next step') || message.includes('meeting')) {
      return 'closing';
    }
    if (this.isObjection(message)) {
      return 'objection-handling';
    }
    if (this.isValueProp(message)) {
      return 'value-prop';
    }
    if (message.includes('?') && turn.speaker === 'rep') {
      return 'discovery';
    }
    
    return this.context.currentPhase;
  }

  private isObjection(message: string): boolean {
    const objectionKeywords = [
      'expensive', 'budget', 'not interested', 'already have',
      'not the right time', 'need to think', 'talk to my'
    ];
    return objectionKeywords.some(keyword => message.includes(keyword));
  }

  private isValueProp(message: string): boolean {
    const valuePropKeywords = [
      'we help', 'our solution', 'benefit', 'value', 'roi',
      'save time', 'increase revenue', 'reduce cost'
    ];
    return valuePropKeywords.some(keyword => message.includes(keyword));
  }

  private isClosingAttempt(message: string): boolean {
    const closingKeywords = [
      'next step', 'meeting', 'demo', 'proposal', 'trial',
      'how do we proceed', 'timeline'
    ];
    return closingKeywords.some(keyword => message.includes(keyword));
  }

  private isCommitment(message: string): boolean {
    const commitmentKeywords = [
      'yes', 'sounds good', 'let\'s do', 'i\'m interested',
      'makes sense', 'i agree', 'that works'
    ];
    return commitmentKeywords.some(keyword => message.includes(keyword));
  }

  private recordEvent(
    type: ConversationEvent['type'],
    timestamp: string,
    details: any,
    impact: ConversationEvent['impact']
  ): void {
    this.events.push({ type, timestamp, details, impact });
  }

  private recordPhaseChange(from: string, to: string, turn: ConversationTurn): void {
    this.events.push({
      type: 'phase-change',
      timestamp: turn.timestamp,
      details: { from, to, trigger: turn.message },
      impact: 'neutral'
    });
  }

  updateState(updates: Partial<ConversationState>): void {
    Object.assign(this.context.state, updates);
  }

  updateMemory(updates: Partial<ProspectMemory>): void {
    // Deep merge for nested objects
    if (updates.revealedInformation) {
      Object.assign(this.context.memory.revealedInformation, updates.revealedInformation);
    }
    if (updates.repTactics) {
      Object.assign(this.context.memory.repTactics, updates.repTactics);
    }
    if (updates.emotionalJourney) {
      this.context.memory.emotionalJourney.push(...updates.emotionalJourney);
    }
  }

  getContext(): ConversationContext {
    return { ...this.context };
  }

  getState(): ConversationState {
    return { ...this.context.state };
  }

  getMemory(): ProspectMemory {
    return { ...this.context.memory };
  }

  getAnalytics(): ConversationAnalytics {
    const phaseTransitions = this.events
      .filter(e => e.type === 'phase-change')
      .map(e => ({
        from: e.details.from,
        to: e.details.to,
        timestamp: e.timestamp,
        trigger: e.details.trigger
      }));

    const keyMoments = this.events
      .filter(e => e.type !== 'phase-change')
      .map(e => ({
        type: e.type,
        timestamp: e.timestamp,
        description: this.describeEvent(e),
        effectiveness: this.evaluateEventEffectiveness(e)
      }));

    const pacing = this.analyzePacing();

    return {
      events: this.events,
      phaseTransitions,
      keyMoments,
      pacing
    };
  }

  private describeEvent(event: ConversationEvent): string {
    switch (event.type) {
      case 'objection':
        return `Prospect raised objection: "${event.details.objection}"`;
      case 'commitment':
        return `Prospect made commitment: "${event.details.commitment}"`;
      case 'question':
        return `Rep asked discovery question`;
      case 'value-prop':
        return `Rep presented value proposition`;
      case 'closing-attempt':
        return `Rep attempted to close`;
      default:
        return `${event.type} occurred`;
    }
  }

  private evaluateEventEffectiveness(event: ConversationEvent): number {
    // Simple effectiveness scoring (0-10)
    if (event.impact === 'positive') return 8;
    if (event.impact === 'negative') return 3;
    return 5;
  }

  private analyzePacing(): ConversationAnalytics['pacing'] {
    if (this.context.turns.length < 2) {
      return {
        avgTurnDuration: 0,
        longestPause: 0,
        conversationFlow: 'smooth'
      };
    }

    // Calculate average time between turns
    let totalDuration = 0;
    let longestPause = 0;

    for (let i = 1; i < this.context.turns.length; i++) {
      const duration = new Date(this.context.turns[i].timestamp).getTime() - 
                      new Date(this.context.turns[i-1].timestamp).getTime();
      totalDuration += duration;
      longestPause = Math.max(longestPause, duration);
    }

    const avgTurnDuration = totalDuration / (this.context.turns.length - 1);
    
    // Determine flow quality
    let conversationFlow: 'smooth' | 'choppy' | 'rushed';
    if (avgTurnDuration < 5000) { // Less than 5 seconds
      conversationFlow = 'rushed';
    } else if (longestPause > 30000) { // More than 30 seconds
      conversationFlow = 'choppy';
    } else {
      conversationFlow = 'smooth';
    }

    return {
      avgTurnDuration: avgTurnDuration / 1000, // Convert to seconds
      longestPause: longestPause / 1000,
      conversationFlow
    };
  }

  reset(): void {
    this.context = {
      scenarioId: this.context.scenarioId,
      sessionId: randomUUID(),
      startTime: new Date().toISOString(),
      currentPhase: 'opening',
      turns: [],
      state: this.initializeState(),
      memory: this.initializeMemory(),
      metrics: {
        duration: 0,
        turnCount: 0,
        avgResponseTime: 0
      }
    };
    this.events = [];
  }
}