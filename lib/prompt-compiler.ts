interface ProspectContext {
  seniority: string;
  callType: string;
  scenario: string;
  difficulty: number;
  conversationHistory: Array<{role: string, content: string}>;
  emotionalState?: 'guarded' | 'warming' | 'engaged' | 'dismissive';
}

export function compileProspectPrompt(context: ProspectContext): string {
  // SENIORITY LAYER
  const seniorityMap = {
    'junior': 'You are a junior employee focused on day-to-day operations. You handle routine tasks and are budget-conscious.',
    'manager': 'You are a middle manager overseeing team operations. You balance efficiency with departmental goals.',
    'director': 'You are a director managing strategic initiatives. You focus on ROI and team performance.',
    'vp': 'You are a VP driving company-wide programs. You think about business impact and long-term strategy.',
    'c-level': 'You are a C-level executive leading business transformation. You focus on competitive advantage and growth.'
  };

  // CALL CONTEXT LAYER
  const contextMap = {
    'discovery-outbound': 'This is an unexpected call. You were not anticipating this conversation but remain professional.',
    'discovery-inbound': 'You expressed initial interest and are exploring whether this solution fits your needs.',
    'elevator-pitch': 'You have very limited time and need to quickly assess relevance.',
    'objection-handling': 'You have specific concerns that need addressing before moving forward.'
  };

  // DIFFICULTY & EMOTIONAL DRIFT
  const difficultyBehavior = {
    1: 'You share information readily and are generally receptive to new ideas.',
    2: 'You share basic information but ask clarifying questions when needed.',
    3: 'You provide relevant information but require clear value demonstration.',
    4: 'You are selective about information sharing and ask many qualifying questions.',
    5: 'You are highly guarded and require significant trust-building before opening up.'
  };

  // EMOTIONAL DRIFT LOGIC
  const recentHistory = context.conversationHistory.slice(-4);
  let emotionalState = context.emotionalState || 'guarded';
  
  // Analyze recent seller behavior for emotional drift
  const sellerMessages = recentHistory.filter(msg => msg.role === 'rep');
  const hasInsight = sellerMessages.some(msg => 
    msg.content.toLowerCase().includes('understand') || 
    msg.content.toLowerCase().includes('challenge') ||
    msg.content.toLowerCase().includes('help')
  );
  const isVague = sellerMessages.some(msg => msg.content.length < 20 || 
    msg.content.toLowerCase().includes('great solution'));

  if (hasInsight && !isVague) emotionalState = 'warming';
  if (isVague || sellerMessages.length > 3) emotionalState = 'dismissive';

  // RESPONSE RULES
  const responseRules = `
RESPONSE GUIDELINES:
- Default to 1-2 sentences unless the seller demonstrates clear value
- Answer questions directly without asking questions back
- Share information relevant to your role and the business context
- If the seller is vague or pushy, become more brief and guarded
- If they show genuine insight into your challenges, become more open
- Never role-swap into selling mode
- Keep responses natural and conversational
`;

  // CONVERSATION HISTORY
  const historyContext = recentHistory.length > 0 ? 
    `\nRECENT CONVERSATION:\n${recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}` : '';

  return `${seniorityMap[context.seniority] || seniorityMap.manager}

${contextMap[context.callType] || contextMap['discovery-outbound']}

SCENARIO: ${context.scenario}

BEHAVIOR: ${difficultyBehavior[context.difficulty] || difficultyBehavior[3]} Currently feeling ${emotionalState} based on the conversation flow.

${responseRules}${historyContext}

Respond naturally as this prospect would, staying true to your role and current emotional state.`;
}

export function serializeHistory(history: Array<{role: string, content: string, timestamp?: string}>, maxTurns: number = 8): Array<{role: string, content: string}> {
  return history.slice(-maxTurns).map(({role, content}) => ({role, content}));
}

export function validateProspectReply(reply: string, difficulty: number): {isValid: boolean, nudge?: string} {
  const roleSwapPhrases = ['let me ask you', 'what about you', 'how does that sound', 'would you like'];
  const hasRoleSwap = roleSwapPhrases.some(phrase => reply.toLowerCase().includes(phrase));
  
  if (hasRoleSwap) {
    return {
      isValid: false,
      nudge: 'Remember: You are the prospect being questioned, not the one asking questions. Answer what you were asked.'
    };
  }

  if (reply.length > 300) {
    return {
      isValid: false,
      nudge: 'Keep responses concise (1-2 sentences) unless the seller has earned a longer response through clear value demonstration.'
    };
  }

  if (difficulty >= 4 && (reply.toLowerCase().includes('sounds great') || reply.toLowerCase().includes('perfect solution'))) {
    return {
      isValid: false,
      nudge: 'At this difficulty level, you should be more skeptical and require more convincing.'
    };
  }

  return {isValid: true};
}
