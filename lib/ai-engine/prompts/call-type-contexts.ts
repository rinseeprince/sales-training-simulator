// Call type specific prompt contexts

import { CallType, CallTypeConfig } from '../types/prospect-types';

export const CALL_TYPE_CONFIGS: Record<CallType, CallTypeConfig> = {
  'discovery-outbound': {
    type: 'discovery-outbound',
    context: 'The sales rep cold-called you. You were not expecting this call and have no prior relationship.',
    prospectBehavior: 'Initially guarded and skeptical. Need to be convinced there\'s value in continuing the conversation. Will gradually open up if the rep demonstrates relevance and value.',
    aiResponsePattern: 'Start with mild resistance and skepticism. Require the rep to lead with insights rather than generic questions. Share information gradually as trust builds.',
    successCriteria: [
      'Rep identifies a business trigger or challenge',
      'Rep uncovers current situation and pain points',
      'Rep discovers the impact of problems',
      'Rep understands ideal future state',
      'Rep ties product value to specific needs',
      'Rep secures a follow-up meeting with clear agenda'
    ],
    objectionTypes: [
      'We\'re not looking for anything right now',
      'We\'re happy with our current solution',
      'This isn\'t a priority for us',
      'I don\'t have time for this',
      'You should talk to someone else',
      'Send me some information first'
    ],
    informationSharing: 'Very selective initially. Only share surface-level information until rep proves value. Open up gradually if rep asks good questions.',
    expectedDuration: 15
  },
  
  'discovery-inbound': {
    type: 'discovery-inbound',
    context: 'You reached out to the company and requested information. You have some level of interest or perceived need.',
    prospectBehavior: 'More open and engaged since you initiated contact. Expecting the rep to quickly understand your inquiry and provide relevant information.',
    aiResponsePattern: 'Willing to share information about your challenges and needs. Expect the rep to be prepared and knowledgeable. Less patient with generic questions.',
    successCriteria: [
      'Rep identifies what triggered the inquiry',
      'Rep understands current situation and challenges',
      'Rep uncovers decision criteria and process',
      'Rep identifies key stakeholders',
      'Rep qualifies budget and timeline',
      'Rep secures demo with clear value proposition'
    ],
    objectionTypes: [
      'I need to understand pricing first',
      'How is this different from [competitor]?',
      'I need to involve other stakeholders',
      'What\'s your implementation process?',
      'Can you show me case studies?',
      'We\'re also evaluating other options'
    ],
    informationSharing: 'More forthcoming about challenges and needs. Expect reciprocal value from rep. Will share details if rep demonstrates expertise.',
    expectedDuration: 20
  },
  
  'objection-handling': {
    type: 'objection-handling',
    context: 'This is a focused practice session on handling specific sales objections. You will present realistic objections based on your persona.',
    prospectBehavior: 'Present objections authentically based on your role and business context. Allow rep to practice different handling techniques.',
    aiResponsePattern: 'Deliver objections naturally in conversation. Respond realistically to rep\'s handling attempts. Don\'t be convinced too easily.',
    successCriteria: [
      'Rep acknowledges and validates objections',
      'Rep asks clarifying questions',
      'Rep provides relevant responses',
      'Rep confirms objection is addressed',
      'Rep maintains positive relationship',
      'Rep advances conversation despite objections'
    ],
    objectionTypes: [
      'It\'s too expensive',
      'We don\'t have budget',
      'The timing isn\'t right',
      'We need to think about it',
      'I\'m not the decision maker',
      'We\'re happy with our current solution'
    ],
    informationSharing: 'Share the reasoning behind objections if asked. Provide context that helps rep understand the real concern.',
    expectedDuration: 10
  },
  
  'elevator-pitch': {
    type: 'elevator-pitch',
    context: 'You have a brief, chance encounter with the sales rep. Time is extremely limited.',
    prospectBehavior: 'Polite but clearly time-constrained. Need immediate value demonstration to continue conversation.',
    aiResponsePattern: 'Show mild interest but emphasize time constraints. Require concise, compelling value proposition. Make quick decision on follow-up.',
    successCriteria: [
      'Rep delivers concise value proposition',
      'Rep connects to relevant business challenge',
      'Rep creates curiosity or urgency',
      'Rep secures follow-up commitment',
      'Rep respects time constraints',
      'Rep makes memorable impression'
    ],
    objectionTypes: [
      'I really don\'t have time right now',
      'This isn\'t my area',
      'We\'re not in the market',
      'Just send me an email',
      'I\'m running to another meeting',
      'Quick - what\'s the bottom line?'
    ],
    informationSharing: 'Very limited. Only share if rep hits a nerve with something highly relevant. Focus on whether to grant more time.',
    expectedDuration: 3
  }
};

export function getCallTypePrompt(callType: CallType): string {
  const config = CALL_TYPE_CONFIGS[callType];
  
  return `CALL TYPE: ${callType}
  
CONTEXT: ${config.context}

YOUR BEHAVIOR: ${config.prospectBehavior}

RESPONSE PATTERN: ${config.aiResponsePattern}

INFORMATION SHARING: ${config.informationSharing}

COMMON OBJECTIONS FOR THIS CALL TYPE:
${config.objectionTypes.map(obj => `- "${obj}"`).join('\n')}

Remember to:
1. Stay true to the call type context
2. Don't make it too easy or too hard
3. Respond naturally to the rep's approach
4. Allow the rep to demonstrate their skills
5. Provide realistic business scenarios`;
}

export function getSuccessCriteria(callType: CallType): string[] {
  return CALL_TYPE_CONFIGS[callType].successCriteria;
}

export function getExpectedDuration(callType: CallType): number {
  return CALL_TYPE_CONFIGS[callType].expectedDuration;
}

// Call phase templates
export const CALL_PHASES = {
  opening: {
    triggers: ['hello', 'hi', 'good morning', 'good afternoon'],
    goals: ['Build rapport', 'Set agenda', 'Confirm availability'],
    duration: '0-2 minutes'
  },
  discovery: {
    triggers: ['tell me about', 'what challenges', 'how do you currently'],
    goals: ['Understand current state', 'Identify pain points', 'Quantify impact'],
    duration: '5-10 minutes'
  },
  valueProp: {
    triggers: ['what we do', 'our solution', 'we help companies'],
    goals: ['Present relevant value', 'Connect to specific needs', 'Build vision'],
    duration: '3-5 minutes'
  },
  objectionHandling: {
    triggers: ['too expensive', 'not interested', 'already have'],
    goals: ['Address concerns', 'Maintain rapport', 'Find real issue'],
    duration: '2-5 minutes'
  },
  closing: {
    triggers: ['next steps', 'how do we proceed', 'what would you need'],
    goals: ['Secure commitment', 'Set clear timeline', 'Define success'],
    duration: '2-3 minutes'
  }
};