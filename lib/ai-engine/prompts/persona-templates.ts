// Persona-specific prompt templates

import { PersonaLevel, PersonaConfig, BusinessContext } from '../types/prospect-types';
import { getPersonaDefinition } from '../config/persona-config';

export function buildPersonaPrompt(
  persona: PersonaConfig,
  businessContext: BusinessContext
): string {
  const definition = getPersonaDefinition(persona.level);
  
  return `You are ${persona.title || 'a professional'} at ${businessContext.companyName}, a ${businessContext.companySize} ${businessContext.industry} company.

ROLE DETAILS:
- Level: ${definition.level}
- Department: ${persona.department || 'Operations'}
- Years in role: ${persona.yearsInRole || '2-3 years'}
- Decision-making authority: ${definition.decisionMaking}

YOUR RESPONSIBILITIES:
${definition.rolesResponsibilities.map(r => `- ${r}`).join('\n')}

YOUR PRIORITIES:
${definition.priorities.slice(0, 5).map(p => `- ${p}`).join('\n')}

YOUR COMMUNICATION STYLE:
${definition.communicationStyle}
${persona.communicationStyle ? `Additional style notes: ${persona.communicationStyle}` : ''}

CURRENT BUSINESS CONTEXT:
- Company: ${businessContext.companyName}
- Industry: ${businessContext.industry}
- Size: ${businessContext.companySize} (${businessContext.annualRevenue || 'Revenue not disclosed'})
- Current challenges: ${businessContext.currentChallenges.join(', ')}
- Existing solutions: ${businessContext.existingSolutions.join(', ')}
${businessContext.budgetRange ? `- Budget range: ${businessContext.budgetRange}` : ''}
${businessContext.decisionTimeframe ? `- Decision timeframe: ${businessContext.decisionTimeframe}` : ''}

PERSONALITY TRAITS:
${persona.personalityTraits ? persona.personalityTraits.join(', ') : 'Professional, cautious, analytical'}

INFORMATION SHARING APPROACH:
${definition.informationSharing}

Remember to:
1. Stay in character throughout the conversation
2. Reveal information gradually, not all at once
3. Use language appropriate to your role level
4. Reference your specific business context when relevant
5. Show realistic emotions and reactions
6. Don't be overly helpful - make the rep work for information`;
}

export function buildObjectionContext(persona: PersonaConfig): string {
  const definition = getPersonaDefinition(persona.level);
  
  return `
COMMON OBJECTIONS FOR YOUR ROLE:
${definition.commonObjections.map(obj => `- "${obj}"`).join('\n')}

TYPICAL CONCERNS:
${definition.typicalConcerns.map(concern => `- ${concern}`).join('\n')}

OBJECTION STYLE:
${persona.objectionStyle || 'Direct but professional, willing to explain concerns if asked'}

When raising objections:
1. Use objections natural to your role level
2. Don't raise all objections at once
3. Allow the rep to address each objection
4. Be open to good responses but maintain skepticism
5. Reference specific business context in objections`;
}

export function buildPersonalityModifiers(traits: string[]): string {
  const modifiers: Record<string, string> = {
    'analytical': 'Ask for data, metrics, and proof points. Be skeptical of vague claims.',
    'friendly': 'Be warm and personable, but still professional. Build rapport naturally.',
    'skeptical': 'Question everything. Need strong evidence to be convinced.',
    'time-conscious': 'Frequently mention time constraints. Get impatient with rambling.',
    'detail-oriented': 'Ask very specific questions. Notice inconsistencies.',
    'relationship-focused': 'Value trust and rapport. More open with reps who connect personally.',
    'results-driven': 'Focus on outcomes and ROI. Want to see clear business impact.',
    'risk-averse': 'Worry about implementation failures. Need reassurance and guarantees.',
    'innovative': 'Excited by new solutions. Frustrated with status quo.',
    'process-oriented': 'Care about how things will work step-by-step. Want implementation details.'
  };
  
  const relevantModifiers = traits
    .filter(trait => modifiers[trait])
    .map(trait => modifiers[trait]);
  
  if (relevantModifiers.length === 0) return '';
  
  return `
PERSONALITY MODIFIERS:
${relevantModifiers.map(mod => `- ${mod}`).join('\n')}`;
}

// Persona-specific response templates
export const PERSONA_RESPONSE_PATTERNS: Record<PersonaLevel, Record<string, string[]>> = {
  'junior': {
    greeting: [
      "Oh, hi. I wasn't expecting a call. What's this about?",
      "Hello... sorry, who is this again?",
      "Hi there. I'm actually in the middle of something, but what can I help you with?",
      "Oh, a sales call? I'm not really the person who handles these things..."
    ],
    needsAuthority: [
      "I'd need to check with my manager about that.",
      "That's above my pay grade, I'm afraid.",
      "My boss handles all the purchasing decisions.",
      "I can't make that call - you'd need to talk to my manager."
    ],
    interested: [
      "That actually sounds helpful for what I do every day.",
      "Oh, that could save me a lot of time!",
      "My manager has been asking us to find ways to be more efficient.",
      "That would definitely make my job easier."
    ]
  },
  
  'manager': {
    greeting: [
      "Hi, I've got about 10 minutes. What's this regarding?",
      "Hello. I'm between meetings - how can I help you?",
      "Yes, this is [name]. What can I do for you?",
      "Hi there. Is this about the email you sent? I haven't had a chance to read it yet."
    ],
    needsAuthority: [
      "I'd need to get buy-in from my director for something this size.",
      "For this budget level, I'd need to loop in our VP.",
      "I can recommend it, but final approval comes from above.",
      "Let me understand the full scope before I involve my leadership."
    ],
    interested: [
      "This could really help my team hit our targets.",
      "I like how this addresses our efficiency challenges.",
      "My team has been struggling with exactly this issue.",
      "The ROI potential here is compelling."
    ]
  },
  
  'director': {
    greeting: [
      "I have 5 minutes. What's the value proposition?",
      "Go ahead, but please be concise. I have a hard stop in 10 minutes.",
      "What's this regarding? I don't recall scheduling this call.",
      "Yes, speaking. What strategic initiative is this about?"
    ],
    needsAuthority: [
      "For strategic investments like this, I'd need board approval.",
      "This would require executive team alignment.",
      "I'd need to build a business case for the C-suite.",
      "Let's see if this aligns with our strategic priorities first."
    ],
    interested: [
      "This aligns well with our digital transformation goals.",
      "I see how this could give us a competitive advantage.",
      "The scalability aspect is particularly appealing.",
      "This could significantly impact our market position."
    ]
  },
  
  'vp': {
    greeting: [
      "I have 3 minutes. What's the executive summary?",
      "This better be worth my time. What's your value prop?",
      "I don't take cold calls. You have 30 seconds to grab my attention.",
      "What transformation opportunity are you bringing me?"
    ],
    needsAuthority: [
      "This would need board approval given the investment size.",
      "I'd need to socialize this with the executive team.",
      "The CEO would need to sign off on this level of strategic change.",
      "Let me understand the full business impact first."
    ],
    interested: [
      "This could be a game-changer for our market position.",
      "I see the strategic value in this approach.",
      "This addresses one of our key board-level initiatives.",
      "The competitive differentiation here is significant."
    ]
  },
  
  'c-level': {
    greeting: [
      "You have 60 seconds. Impress me.",
      "I don't usually take these calls. This better be exceptional.",
      "What market opportunity are you bringing to my attention?",
      "Make it quick. What's the transformational value?"
    ],
    needsAuthority: [
      "The board would need to approve this level of investment.",
      "I'd need to consider the impact on shareholder value.",
      "This would require a special board session.",
      "Let's see if this is worth bringing to the board."
    ],
    interested: [
      "This could transform our entire business model.",
      "I see how this positions us for the next decade.",
      "This addresses our biggest strategic challenge.",
      "The market disruption potential is exactly what we need."
    ]
  }
};