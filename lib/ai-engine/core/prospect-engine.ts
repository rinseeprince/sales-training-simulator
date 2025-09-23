// AI Prospect Engine - Core implementation

import { openai } from '@/lib/api-utils';
import { 
  AIProspectConfig, 
  ProspectResponse, 
  ConversationState,
  ProspectMemory,
  Sentiment
} from '../types/prospect-types';
import { ConversationTurn } from '../types/conversation-types';
import { 
  buildPersonaPrompt, 
  buildObjectionContext, 
  buildPersonalityModifiers,
  PERSONA_RESPONSE_PATTERNS 
} from '../prompts/persona-templates';
import { getCallTypePrompt } from '../prompts/call-type-contexts';
import { getDifficultyPrompt } from '../prompts/difficulty-modifiers';
import { AI_MODEL_CONFIG, CONVERSATION_TIMING } from '../config/ai-model-config';

export class AIProspectEngine {
  private config: AIProspectConfig;
  private conversationState: ConversationState;
  private memory: ProspectMemory;
  private systemPrompt: string;

  constructor(config: AIProspectConfig) {
    this.config = config;
    this.conversationState = this.initializeConversationState();
    this.memory = this.initializeMemory();
    this.systemPrompt = this.buildSystemPrompt();
  }

  private initializeConversationState(): ConversationState {
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

  private buildSystemPrompt(): string {
    const { scenarioContext } = this.config;
    const { personaConfig, businessContext, callType, difficulty } = scenarioContext;

    const personaPrompt = buildPersonaPrompt(personaConfig, businessContext);
    const callTypePrompt = getCallTypePrompt(callType);
    const difficultyPrompt = getDifficultyPrompt(difficulty);
    const objectionContext = buildObjectionContext(personaConfig);
    const personalityModifiers = personaConfig.personalityTraits 
      ? buildPersonalityModifiers(personaConfig.personalityTraits)
      : '';

    return `${personaPrompt}

${callTypePrompt}

${difficultyPrompt}

${objectionContext}

${personalityModifiers}

CONVERSATION RULES:
1. Stay 100% in character as the prospect, not the salesperson
2. Respond naturally with appropriate emotion and tone
3. Don't volunteer all information at once - make the rep work for it
4. React realistically to good and bad sales techniques
5. Your responses should be 1-3 sentences maximum
6. Show personality and human reactions
7. If the rep asks multiple questions, address the most important one
8. Don't be overly helpful or cooperative unless difficulty level is 1-2
9. Reference your specific business context when relevant
10. Track what information you've already shared and maintain consistency

CURRENT CONVERSATION STATE:
- Phase: ${this.conversationState.currentPhase}
- Rapport Level: ${this.conversationState.rapportLevel}
- Trust Level: ${this.conversationState.trustLevel}
- Engagement: ${this.conversationState.engagementLevel}`;
  }

  async generateResponse(repMessage: string): Promise<ProspectResponse> {
    try {
      // Update conversation history
      this.addToHistory('rep', repMessage);

      // Analyze rep's message
      const messageAnalysis = this.analyzeRepMessage(repMessage);
      
      // Update conversation state based on analysis
      this.updateConversationState(messageAnalysis);

      // Check if prospect should hang up
      if (this.conversationState.shouldHangup) {
        return this.generateHangupResponse();
      }

      // Build conversation context for AI
      const messages = this.buildConversationContext();

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: AI_MODEL_CONFIG.prospect.model,
        messages,
        temperature: AI_MODEL_CONFIG.prospect.temperature,
        max_tokens: AI_MODEL_CONFIG.prospect.maxTokens,
        presence_penalty: AI_MODEL_CONFIG.prospect.presencePenalty,
        frequency_penalty: AI_MODEL_CONFIG.prospect.frequencyPenalty
      });

      const aiMessage = completion.choices[0]?.message?.content || '';
      
      // Parse and structure the response
      const response = this.parseAIResponse(aiMessage);
      
      // Update memory and state
      this.updateMemory(response);
      this.addToHistory('prospect', response.message);

      // Add realistic delay based on difficulty
      const delay = this.calculateResponseDelay();
      await new Promise(resolve => setTimeout(resolve, delay));

      return response;

    } catch (error) {
      console.error('Prospect engine error:', error);
      return this.generateFallbackResponse();
    }
  }

  private analyzeRepMessage(message: string): any {
    const analysis = {
      hasQuestion: message.includes('?'),
      questionType: this.detectQuestionType(message),
      hasValueProp: this.detectValueProposition(message),
      hasObjectionResponse: this.detectObjectionHandling(message),
      hasClosingAttempt: this.detectClosingAttempt(message),
      sentiment: this.analyzeMessageSentiment(message),
      topics: this.extractTopics(message),
      hangupTriggers: this.detectHangupTriggers(message)
    };

    return analysis;
  }

  private detectQuestionType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('what') && lowerMessage.includes('challenge')) return 'problem';
    if (lowerMessage.includes('how') && lowerMessage.includes('impact')) return 'implication';
    if (lowerMessage.includes('what') && lowerMessage.includes('ideal')) return 'need-payoff';
    if (lowerMessage.includes('tell me about')) return 'situation';
    if (lowerMessage.includes('?')) return 'general';
    
    return 'none';
  }

  private detectValueProposition(message: string): boolean {
    const valuePhrases = [
      'we help', 'our solution', 'we provide', 'benefit', 'value',
      'roi', 'save time', 'increase revenue', 'reduce cost'
    ];
    
    const lowerMessage = message.toLowerCase();
    return valuePhrases.some(phrase => lowerMessage.includes(phrase));
  }

  private detectObjectionHandling(message: string): boolean {
    const objectionPhrases = [
      'i understand', 'i hear you', 'that makes sense', 'other clients',
      'what we\'ve found', 'let me address', 'good question'
    ];
    
    const lowerMessage = message.toLowerCase();
    return objectionPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  private detectClosingAttempt(message: string): boolean {
    const closingPhrases = [
      'next step', 'meeting', 'demo', 'proposal', 'trial',
      'how do we proceed', 'what would you need', 'timeline'
    ];
    
    const lowerMessage = message.toLowerCase();
    return closingPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  private analyzeMessageSentiment(message: string): Sentiment {
    // Simple sentiment analysis - in production, use a proper NLP service
    const positiveWords = ['great', 'excellent', 'perfect', 'love', 'excited'];
    const negativeWords = ['problem', 'issue', 'concern', 'worried', 'difficult'];
    
    const lowerMessage = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'friendly';
    if (negativeCount > positiveCount) return 'skeptical';
    return 'neutral';
  }

  private extractTopics(message: string): string[] {
    // Extract key topics from the message
    const topics = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('cost')) topics.push('budget');
    if (lowerMessage.includes('timeline') || lowerMessage.includes('when')) topics.push('timeline');
    if (lowerMessage.includes('decision') || lowerMessage.includes('approval')) topics.push('decision-process');
    if (lowerMessage.includes('challenge') || lowerMessage.includes('problem')) topics.push('pain-points');
    
    return topics;
  }

  private detectHangupTriggers(message: string): string[] {
    const triggers = [];
    const lowerMessage = message.toLowerCase();
    const { difficulty, personaConfig } = this.config.scenarioContext;
    
    // Only check for hangup triggers on ultra-hard scenarios (advanced difficulty)
    if (difficulty !== 'advanced') return triggers;
    
    // Generic hangup triggers that apply to all ultra-hard prospects
    if (this.isGenericPitch(message)) triggers.push('generic_pitch');
    if (this.isPrematureProbing(message)) triggers.push('premature_probing');
    if (this.isIgnoringObjections(message)) triggers.push('ignoring_objections');
    if (this.isUnprofessionalOpening(message)) triggers.push('unprofessional_opening');
    
    // Persona-specific hangup triggers based on prospect name/type
    const prospectName = personaConfig.name?.toLowerCase() || '';
    
    if (prospectName.includes('robert') || prospectName.includes('cto')) {
      // Hostile CTO triggers
      if (lowerMessage.includes('revolutionary') || lowerMessage.includes('game-changing')) triggers.push('buzzwords');
      if (lowerMessage.includes('how are you') || lowerMessage.includes('hope you\'re doing well')) triggers.push('generic_pleasantries');
      if (this.askingAboutTechStack(message)) triggers.push('tech_stack_probing');
    }
    
    if (prospectName.includes('victoria') || prospectName.includes('vp') && prospectName.includes('sales')) {
      // Arrogant VP Sales triggers
      if (this.cannotProveSalesCredibility(message)) triggers.push('no_sales_credibility');
      if (this.tryingToTeachSales(message)) triggers.push('teaching_sales');
    }
    
    if (prospectName.includes('amanda') || prospectName.includes('ciso')) {
      // Paranoid CISO triggers
      if (this.askingAboutSecurity(message)) triggers.push('security_probing');
      if (this.soundsLikeSocialEngineering(message)) triggers.push('social_engineering');
    }
    
    if (prospectName.includes('richard') || prospectName.includes('cfo')) {
      // Ice-Cold CFO triggers
      if (this.noROIInFirst60Seconds(message)) triggers.push('no_roi_focus');
      if (this.usingEmotionalLanguage(message)) triggers.push('emotional_language');
    }
    
    if (prospectName.includes('marcus') || (prospectName.includes('ceo') && lowerMessage.includes('rude'))) {
      // Rude CEO triggers
      if (this.notAcknowledgingStatus(message)) triggers.push('no_status_acknowledgment');
      if (this.takingTooLong(message)) triggers.push('taking_too_long');
    }
    
    if (prospectName.includes('jennifer') || prospectName.includes('cio')) {
      // Skeptical CIO triggers
      if (this.makingBigPromises(message)) triggers.push('big_promises');
      if (this.minimizingRisks(message)) triggers.push('minimizing_risks');
    }
    
    return triggers;
  }

  // Hangup trigger detection helpers
  private isGenericPitch(message: string): boolean {
    const pitchPhrases = ['we help companies', 'our solution provides', 'leading provider', 'industry-leading'];
    return pitchPhrases.some(phrase => message.toLowerCase().includes(phrase));
  }

  private isPrematureProbing(message: string): boolean {
    if (this.memory.conversationHistory.length > 2) return false; // Only in first exchange
    const probingQuestions = ['tell me about your', 'what are your current', 'how do you currently', 'what challenges'];
    return probingQuestions.some(phrase => message.toLowerCase().includes(phrase));
  }

  private isIgnoringObjections(message: string): boolean {
    const lastProspectMessage = this.memory.conversationHistory
      .filter(turn => turn.speaker === 'prospect')
      .slice(-1)[0];
    
    if (!lastProspectMessage) return false;
    
    const hadObjection = lastProspectMessage.message.toLowerCase().includes('not interested') ||
                        lastProspectMessage.message.toLowerCase().includes('don\'t have time') ||
                        lastProspectMessage.message.toLowerCase().includes('not buying');
    
    const acknowledgesObjection = message.toLowerCase().includes('understand') ||
                                 message.toLowerCase().includes('hear you') ||
                                 message.toLowerCase().includes('respect that');
    
    return hadObjection && !acknowledgesObjection;
  }

  private isUnprofessionalOpening(message: string): boolean {
    if (this.memory.conversationHistory.length > 1) return false; // Only check opening
    const unprofessionalPhrases = ['how are you today', 'hope you\'re having a great day', 'this is a sales call'];
    return unprofessionalPhrases.some(phrase => message.toLowerCase().includes(phrase));
  }

  private askingAboutTechStack(message: string): boolean {
    const techQuestions = ['current tech stack', 'what tools', 'what systems', 'how do you handle'];
    return techQuestions.some(phrase => message.toLowerCase().includes(phrase));
  }

  private cannotProveSalesCredibility(message: string): boolean {
    // This would need to be enhanced with actual credential checking
    const hasCredentials = message.toLowerCase().includes('quota') ||
                          message.toLowerCase().includes('carried') ||
                          message.toLowerCase().includes('achieved') ||
                          message.toLowerCase().includes('top performer');
    return !hasCredentials;
  }

  private tryingToTeachSales(message: string): boolean {
    const teachingPhrases = ['you should', 'best practice', 'what we recommend', 'studies show'];
    return teachingPhrases.some(phrase => message.toLowerCase().includes(phrase));
  }

  private askingAboutSecurity(message: string): boolean {
    const securityQuestions = ['security tools', 'current setup', 'infrastructure', 'what you use'];
    return securityQuestions.some(phrase => message.toLowerCase().includes(phrase));
  }

  private soundsLikeSocialEngineering(message: string): boolean {
    const fishingPhrases = ['who handles', 'what vendor', 'recent incident', 'breach'];
    return fishingPhrases.some(phrase => message.toLowerCase().includes(phrase));
  }

  private noROIInFirst60Seconds(message: string): boolean {
    if (this.memory.conversationHistory.length > 2) return false; // First exchange only
    const roiTerms = ['roi', 'save', 'cost', 'revenue', 'profit', 'million', 'thousand', '%'];
    return !roiTerms.some(term => message.toLowerCase().includes(term));
  }

  private usingEmotionalLanguage(message: string): boolean {
    const emotionalWords = ['excited', 'amazing', 'fantastic', 'love', 'passionate'];
    return emotionalWords.some(word => message.toLowerCase().includes(word));
  }

  private notAcknowledgingStatus(message: string): boolean {
    const statusAcknowledgment = ['ceo', 'executive', 'leader', 'appreciate your time', 'valuable time'];
    return !statusAcknowledgment.some(phrase => message.toLowerCase().includes(phrase));
  }

  private takingTooLong(message: string): boolean {
    return message.length > 200; // More than 200 characters is too long for impatient CEO
  }

  private makingBigPromises(message: string): boolean {
    const promiseWords = ['guarantee', 'promise', 'ensure', 'will definitely', 'always works'];
    return promiseWords.some(word => message.toLowerCase().includes(word));
  }

  private minimizingRisks(message: string): boolean {
    const minimizingPhrases = ['no risk', 'easy implementation', 'simple', 'nothing to worry about'];
    return minimizingPhrases.some(phrase => message.toLowerCase().includes(phrase));
  }

  private updateConversationState(analysis: any): void {
    // Check for hangup triggers first
    if (analysis.hangupTriggers && analysis.hangupTriggers.length > 0) {
      this.conversationState.shouldHangup = true;
      this.conversationState.hangupReason = analysis.hangupTriggers[0]; // Use first trigger as primary reason
      this.conversationState.hangupTriggers = analysis.hangupTriggers;
      return; // Skip other updates if hanging up
    }
    
    // Update rapport based on rep's approach
    if (analysis.hasQuestion && analysis.questionType !== 'none') {
      this.conversationState.rapportLevel = Math.min(1, this.conversationState.rapportLevel + 0.05);
    }
    
    // Update trust based on objection handling
    if (analysis.hasObjectionResponse) {
      this.conversationState.trustLevel = Math.min(1, this.conversationState.trustLevel + 0.1);
    }
    
    // Update engagement
    if (analysis.hasValueProp && this.conversationState.painPointsDiscovered.length > 0) {
      this.conversationState.engagementLevel = Math.min(1, this.conversationState.engagementLevel + 0.1);
    }
    
    // Track closing attempts
    if (analysis.hasClosingAttempt) {
      this.memory.repTactics.closingAttempts++;
    }
    
    // Update phase
    this.updateConversationPhase(analysis);
  }

  private updateConversationPhase(analysis: any): void {
    const { currentPhase } = this.conversationState;
    
    if (currentPhase === 'opening' && analysis.hasQuestion) {
      this.conversationState.currentPhase = 'discovery';
    } else if (currentPhase === 'discovery' && analysis.hasValueProp) {
      this.conversationState.currentPhase = 'value-prop';
    } else if (analysis.hasClosingAttempt) {
      this.conversationState.currentPhase = 'closing';
    }
  }

  private buildConversationContext(): any[] {
    const recentHistory = this.memory.conversationHistory.slice(-6); // Last 3 exchanges
    
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...recentHistory.map(turn => ({
        role: turn.speaker === 'rep' ? 'user' : 'assistant',
        content: turn.message
      }))
    ];
    
    return messages;
  }

  private parseAIResponse(aiMessage: string): ProspectResponse {
    // Determine sentiment based on response content
    const sentiment = this.determineResponseSentiment(aiMessage);
    
    // Check if an objection was raised
    const raisedObjection = this.extractObjection(aiMessage);
    
    // Extract any revealed information
    const revealedInfo = this.extractRevealedInformation(aiMessage);
    
    return {
      message: aiMessage,
      sentiment,
      revealedInformation: revealedInfo,
      raisedObjection,
      emotionalTone: this.determineEmotionalTone(aiMessage),
      conversationPhaseShift: this.detectPhaseShift(aiMessage)
    };
  }

  private determineResponseSentiment(message: string): Sentiment {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('not interested') || lowerMessage.includes('don\'t need')) {
      return 'hostile';
    }
    if (lowerMessage.includes('interesting') || lowerMessage.includes('tell me more')) {
      return 'friendly';
    }
    if (lowerMessage.includes('not sure') || lowerMessage.includes('maybe')) {
      return 'skeptical';
    }
    
    return 'neutral';
  }

  private extractObjection(message: string): string | undefined {
    const objectionPatterns = [
      /too expensive/i,
      /don't have budget/i,
      /not the right time/i,
      /already have .+/i,
      /need to think about it/i,
      /talk to my (boss|manager|team)/i
    ];
    
    for (const pattern of objectionPatterns) {
      const match = message.match(pattern);
      if (match) return match[0];
    }
    
    return undefined;
  }

  private extractRevealedInformation(message: string): any {
    const info: any = {};
    
    // Extract budget information
    const budgetMatch = message.match(/\$[\d,]+[kKmM]?/);
    if (budgetMatch) info.budget = budgetMatch[0];
    
    // Extract timeline
    const timelinePatterns = [/next (quarter|month|year)/i, /by (Q\d|end of)/i];
    for (const pattern of timelinePatterns) {
      const match = message.match(pattern);
      if (match) info.timeline = match[0];
    }
    
    // Extract company size
    const sizeMatch = message.match(/(\d+)\s*(employees|people|staff)/i);
    if (sizeMatch) info.companySize = sizeMatch[0];
    
    return Object.keys(info).length > 0 ? info : undefined;
  }

  private determineEmotionalTone(message: string): string {
    // Simple emotion detection
    if (message.includes('!')) return 'enthusiastic';
    if (message.includes('...')) return 'hesitant';
    if (message.length < 20) return 'curt';
    if (message.includes('actually') || message.includes('honestly')) return 'candid';
    
    return 'professional';
  }

  private detectPhaseShift(message: string): string | undefined {
    if (message.includes('next step') || message.includes('what would')) {
      return 'moving-to-closing';
    }
    if (message.includes('tell me more') || message.includes('how does')) {
      return 'increasing-interest';
    }
    
    return undefined;
  }

  private updateMemory(response: ProspectResponse): void {
    // Update revealed information
    if (response.revealedInformation) {
      Object.assign(this.memory.revealedInformation.company, response.revealedInformation);
    }
    
    // Track objections
    if (response.raisedObjection && !this.conversationState.objectionsSurfaced.includes(response.raisedObjection)) {
      this.conversationState.objectionsSurfaced.push(response.raisedObjection);
    }
    
    // Update emotional journey
    this.memory.emotionalJourney.push({
      timestamp: new Date().toISOString(),
      sentiment: response.sentiment,
      trigger: 'response'
    });
  }

  private addToHistory(speaker: 'rep' | 'prospect', message: string): void {
    this.memory.conversationHistory.push({
      speaker,
      message,
      timestamp: new Date().toISOString(),
      phase: this.conversationState.currentPhase
    });
  }

  private calculateResponseDelay(): number {
    const { difficulty } = this.config.scenarioContext;
    const baseDelay = CONVERSATION_TIMING.minResponseDelay;
    const variableDelay = (difficulty - 1) * 300; // Add 300ms per difficulty level
    const randomVariation = Math.random() * 500; // 0-500ms random variation
    
    return Math.min(
      baseDelay + variableDelay + randomVariation,
      CONVERSATION_TIMING.maxResponseDelay
    );
  }

  private generateFallbackResponse(): ProspectResponse {
    const { personaConfig } = this.config.scenarioContext;
    const patterns = PERSONA_RESPONSE_PATTERNS[personaConfig.level];
    const fallbacks = patterns.greeting || ["I'm not sure I understand. Can you clarify?"];
    
    return {
      message: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      sentiment: 'neutral',
      emotionalTone: 'confused'
    };
  }

  // Public methods for state management
  getConversationState(): ConversationState {
    return { ...this.conversationState };
  }

  getMemory(): ProspectMemory {
    return { ...this.memory };
  }

  resetConversation(): void {
    this.conversationState = this.initializeConversationState();
    this.memory = this.initializeMemory();
  }
}