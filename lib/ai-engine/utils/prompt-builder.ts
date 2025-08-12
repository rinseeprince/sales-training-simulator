// Dynamic prompt builder utilities

import { ScenarioContext, PersonaConfig, CallType, DifficultyLevel } from '../types/prospect-types';
import { CallTranscript } from '@/lib/types';
import { getPersonaDefinition } from '../config/persona-config';
import { CALL_TYPE_CONFIGS } from '../prompts/call-type-contexts';
import { DIFFICULTY_MODIFIERS } from '../prompts/difficulty-modifiers';

export class PromptBuilder {
  static buildProspectSystemPrompt(context: ScenarioContext): string {
    const sections = [
      this.buildPersonaSection(context.personaConfig, context.businessContext),
      this.buildCallTypeSection(context.callType),
      this.buildDifficultySection(context.difficulty),
      this.buildBusinessContextSection(context.businessContext),
      this.buildProductAwarenessSection(context.productContext),
      this.buildBehaviorRulesSection(),
      this.buildObjectionsSection(context)
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  private static buildPersonaSection(persona: PersonaConfig, businessContext: any): string {
    const definition = getPersonaDefinition(persona.level);
    
    return `YOU ARE: ${persona.title || definition.titles[0]} at ${businessContext.companyName}

ROLE CHARACTERISTICS:
- Level: ${definition.level}
- Department: ${persona.department || 'Operations'}
- Years in role: ${persona.yearsInRole || '2-3 years'}
- Decision authority: ${definition.decisionMaking}
- Budget authority: ${definition.budgetAuthority}

YOUR PRIORITIES:
${definition.priorities.slice(0, 5).map(p => `- ${p}`).join('\n')}

COMMUNICATION STYLE:
${definition.communicationStyle}
${persona.personalityTraits ? `\nPersonality traits: ${persona.personalityTraits.join(', ')}` : ''}`;
  }

  private static buildCallTypeSection(callType: CallType): string {
    const config = CALL_TYPE_CONFIGS[callType];
    
    return `CALL CONTEXT: ${config.type}
${config.context}

YOUR BEHAVIOR IN THIS CALL:
${config.prospectBehavior}

INFORMATION SHARING APPROACH:
${config.informationSharing}`;
  }

  private static buildDifficultySection(difficulty: DifficultyLevel): string {
    const modifier = DIFFICULTY_MODIFIERS[difficulty];
    
    return `DIFFICULTY LEVEL: ${difficulty} - ${modifier.name}

COOPERATION PARAMETERS:
- Willingness to share: ${modifier.informationSharingLevel * 100}%
- Trust required: ${modifier.trustBuildingRequired * 100}%
- Objection frequency: ${modifier.objectionFrequency * 100}%
- Response delay: ${modifier.responseDelay}ms`;
  }

  private static buildBusinessContextSection(context: any): string {
    return `YOUR COMPANY CONTEXT:
- Company: ${context.companyName}
- Industry: ${context.industry}
- Size: ${context.companySize}
- Current challenges: ${context.currentChallenges.join(', ')}
- Existing solutions: ${context.existingSolutions.join(', ')}
${context.budgetRange ? `- Budget range: ${context.budgetRange}` : ''}
${context.decisionTimeframe ? `- Timeline: ${context.decisionTimeframe}` : ''}`;
  }

  private static buildProductAwarenessSection(product: any): string {
    return `PRODUCT AWARENESS:
You may have heard of ${product.productName} as a ${product.category} solution.
You know they claim to ${product.valuePropositions[0]}.
You're aware of competitors: ${product.competitiveAdvantages.length > 0 ? 'Yes' : 'No'}`;
  }

  private static buildBehaviorRulesSection(): string {
    return `CONVERSATION RULES:
1. Stay 100% in character - you are the prospect, NOT the salesperson
2. Keep responses concise (1-3 sentences max)
3. Don't volunteer all information at once
4. React realistically to sales techniques
5. Show appropriate emotion and personality
6. Reference your specific context when relevant
7. Build on previous conversation points
8. Don't be unnaturally helpful`;
  }

  private static buildObjectionsSection(context: ScenarioContext): string {
    const objections = context.specificObjections || [];
    
    return `POTENTIAL OBJECTIONS TO USE:
${objections.map(obj => `- "${obj}"`).join('\n')}

Remember: Don't use all objections at once. Deploy them naturally based on conversation flow.`;
  }

  static buildScoringPrompt(
    transcript: CallTranscript[],
    callType: CallType,
    weights: Record<string, number>
  ): string {
    const transcriptText = transcript
      .map(t => `${t.speaker.toUpperCase()}: ${t.message}`)
      .join('\n\n');

    return `Analyze this ${callType} sales call transcript and provide detailed scoring.

TRANSCRIPT:
${transcriptText}

SCORING WEIGHTS:
${Object.entries(weights).map(([metric, weight]) => `- ${metric}: ${weight * 100}%`).join('\n')}

Evaluate each metric thoroughly and provide specific examples from the transcript.
Return a comprehensive JSON analysis with scores, examples, and actionable feedback.`;
  }

  static buildCoachingPrompt(
    score: number,
    strengths: string[],
    weaknesses: string[],
    callType: CallType
  ): string {
    return `Generate personalized coaching feedback for a sales rep who scored ${score}/100 on a ${callType} call.

STRENGTHS IDENTIFIED:
${strengths.map(s => `- ${s}`).join('\n')}

AREAS FOR IMPROVEMENT:
${weaknesses.map(w => `- ${w}`).join('\n')}

Provide:
1. Encouraging summary that acknowledges strengths
2. Specific, actionable advice for each weakness
3. Practice recommendations
4. Resources or techniques to study
5. Motivational closing

Keep feedback positive, specific, and actionable.`;
  }

  static buildTranscriptSummaryPrompt(transcript: CallTranscript[]): string {
    const transcriptText = transcript
      .map(t => `${t.speaker}: ${t.message}`)
      .join('\n');

    return `Summarize this sales call in a structured format:

TRANSCRIPT:
${transcriptText}

Provide:
1. Call overview (2-3 sentences)
2. Key topics discussed
3. Pain points uncovered
4. Objections raised
5. Value propositions presented
6. Next steps agreed upon
7. Overall outcome assessment`;
  }

  static combinePrompts(...prompts: string[]): string {
    return prompts.filter(Boolean).join('\n\n---\n\n');
  }

  static truncateTranscript(transcript: string, maxTokens: number = 4000): string {
    // Rough estimation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    
    if (transcript.length <= maxChars) {
      return transcript;
    }

    // Keep the beginning and end of the conversation
    const keepChars = Math.floor(maxChars * 0.4); // 40% from start, 40% from end
    const start = transcript.substring(0, keepChars);
    const end = transcript.substring(transcript.length - keepChars);
    
    return `${start}\n\n[... middle portion truncated for length ...]\n\n${end}`;
  }
}