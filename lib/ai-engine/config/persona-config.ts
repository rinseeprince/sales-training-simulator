// Persona Configuration and Definitions

import { PersonaDefinition, PersonaLevel } from '../types/prospect-types';

export const PERSONA_DEFINITIONS: Record<PersonaLevel, PersonaDefinition> = {
  'junior': {
    level: 'junior',
    titles: [
      'Specialist', 'Coordinator', 'Analyst', 'Associate', 'Assistant',
      'Representative', 'Executive', 'Administrator'
    ],
    rolesResponsibilities: [
      'Execute day-to-day tasks and follow established processes',
      'Use company tools and systems for daily operations',
      'Report progress and issues to direct manager',
      'Meet individual performance metrics and deadlines',
      'Maintain quality standards in work output',
      'Collaborate with team members on projects',
      'Document processes and maintain records',
      'Respond to internal/external inquiries'
    ],
    priorities: [
      'Clear instructions and expectations from management',
      'Tools that are easy to use and reliable',
      'Achieving individual performance metrics',
      'Skill development and career progression',
      'Avoiding workflow bottlenecks',
      'Recognition for good work',
      'Work-life balance',
      'Job security'
    ],
    communicationStyle: 'Direct, task-focused, asks practical questions about implementation and daily use. May defer to manager for strategic decisions.',
    decisionMaking: 'Limited authority, needs manager approval for most decisions. Can make recommendations but not final calls.',
    commonObjections: [
      "I need to check with my manager first",
      "We don't have budget for this",
      "I'm not sure how this fits our current process",
      "My boss makes these decisions",
      "We're already using something else",
      "I don't have time to learn a new system",
      "How much work will this create for me?",
      "Will this make my job harder?"
    ],
    informationSharing: 'Open about day-to-day challenges and pain points, less aware of strategic initiatives. Shares tactical details freely.',
    budgetAuthority: 'No direct budget authority. May influence small purchases through recommendations.',
    typicalConcerns: [
      'Will this make my job easier or harder?',
      'How long will it take to learn?',
      'Will I still have a job if we implement this?',
      'What if something goes wrong?'
    ]
  },
  
  'manager': {
    level: 'manager',
    titles: [
      'Manager', 'Senior Manager', 'Team Lead', 'Supervisor',
      'Department Head', 'Operations Manager', 'Project Manager'
    ],
    rolesResponsibilities: [
      'Oversee team operations and performance',
      'Translate strategy into actionable plans',
      'Monitor KPIs and team metrics',
      'Provide feedback and coaching to team members',
      'Ensure processes are followed and optimized',
      'Handle escalations and team issues',
      'Report to directors on team performance',
      'Manage departmental budget allocation',
      'Drive process improvements',
      'Coordinate cross-functional initiatives'
    ],
    priorities: [
      'Meeting team KPIs and deadlines',
      'Maintaining team productivity and morale',
      'Streamlining workflows and processes',
      'Supporting staff development and growth',
      'Clear communication between leadership and team',
      'Resource optimization',
      'Risk mitigation',
      'Stakeholder satisfaction'
    ],
    communicationStyle: 'Balanced between strategic and tactical, asks about team impact and implementation logistics. Focuses on ROI and efficiency.',
    decisionMaking: 'Can make departmental decisions within budget limits. Needs approval for major investments or strategic changes.',
    commonObjections: [
      "How will this affect my team's productivity?",
      "We're already implementing another solution",
      "I need to see ROI projections",
      "What's the implementation timeline?",
      "How will this integrate with our current systems?",
      "My team is already overwhelmed",
      "I need to understand the total cost of ownership",
      "What kind of support will you provide?"
    ],
    informationSharing: 'Knows team challenges and departmental goals well. Some visibility into company strategy. Protective of team resources.',
    budgetAuthority: 'Departmental budget authority, typically $10K-$100K depending on company size. Can approve within limits.',
    typicalConcerns: [
      'Impact on team workload and morale',
      'Integration with existing processes',
      'Training requirements and timeline',
      'Ongoing support and maintenance',
      'Measurable benefits vs. costs'
    ]
  },
  
  'director': {
    level: 'director',
    titles: [
      'Director', 'Senior Director', 'Vice President', 'AVP',
      'Head of Department', 'Regional Director', 'Division Director'
    ],
    rolesResponsibilities: [
      'Develop departmental strategies aligned with company goals',
      'Allocate budgets and resources across teams',
      'Approve key initiatives and investments',
      'Drive cross-functional collaboration',
      'Review performance data and analytics',
      'Build stakeholder relationships',
      'Represent department in executive meetings',
      'Ensure compliance and risk management',
      'Develop future leaders',
      'Drive innovation and transformation'
    ],
    priorities: [
      'Driving efficiency and profitability',
      'Achieving long-term strategic goals',
      'Maintaining competitive advantage',
      'Reliable data for decision-making',
      'Building high-performing teams',
      'Managing stakeholder expectations',
      'Regulatory compliance',
      'Market positioning'
    ],
    communicationStyle: 'Strategic, data-driven, asks about business impact and competitive advantage. Thinks in quarters and years, not days.',
    decisionMaking: 'Significant budget authority, can approve major departmental initiatives. Influences company-wide decisions.',
    commonObjections: [
      "How does this align with our strategic roadmap?",
      "What's the competitive differentiation?",
      "I need to see detailed ROI analysis",
      "How does this scale across the organization?",
      "What are the risks and mitigation strategies?",
      "We have other priorities this quarter",
      "I need to see successful case studies",
      "How does this impact our other initiatives?"
    ],
    informationSharing: 'Deep knowledge of departmental strategy and good visibility into company direction. Guards competitive information.',
    budgetAuthority: 'Significant budget authority, typically $100K-$1M+. Can approve major investments with business case.',
    typicalConcerns: [
      'Strategic alignment with company goals',
      'Competitive positioning',
      'Risk vs. reward analysis',
      'Resource allocation across initiatives',
      'Long-term sustainability'
    ]
  },
  
  'vp': {
    level: 'vp',
    titles: [
      'Vice President', 'Executive Vice President', 'Senior Vice President',
      'Chief Officer (non-C-suite)', 'President of Division', 'General Manager'
    ],
    rolesResponsibilities: [
      'Own strategic direction for entire business unit',
      'Set high-level KPIs and success metrics',
      'Approve major investments and partnerships',
      'Represent division in executive discussions',
      'Ensure function contributes to company success',
      'Develop leadership talent pipeline',
      'Drive cultural transformation',
      'Manage P&L responsibility',
      'Interface with board on functional matters',
      'Lead market expansion initiatives'
    ],
    priorities: [
      'Meeting revenue/growth targets',
      'Aligning strategy with company vision',
      'Managing risks and compliance',
      'Driving innovation and market leadership',
      'Effective allocation of major budgets',
      'Talent retention and development',
      'Shareholder value creation',
      'Market share growth'
    ],
    communicationStyle: 'Executive-level, focused on business outcomes and strategic alignment. Speaks in terms of market impact and shareholder value.',
    decisionMaking: 'Major budget authority, can approve significant investments and strategic partnerships. Direct input to C-suite.',
    commonObjections: [
      "How does this impact our market position?",
      "What's the strategic value to the organization?",
      "I need board-level justification for this investment",
      "How does this fit our 3-5 year plan?",
      "What's the opportunity cost?",
      "Show me the competitive analysis",
      "How does this affect our stock price?",
      "What are the regulatory implications?"
    ],
    informationSharing: 'Comprehensive understanding of business unit performance and strategy. Direct input into company direction.',
    budgetAuthority: 'Major budget authority, $1M-$10M+. Can approve transformational investments with board alignment.',
    typicalConcerns: [
      'Market disruption and competitive threats',
      'Shareholder and board expectations',
      'Regulatory and compliance risks',
      'Talent acquisition and retention',
      'Technology transformation'
    ]
  },
  
  'c-level': {
    level: 'c-level',
    titles: [
      'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer',
      'Chief Technology Officer', 'Chief Information Officer', 'Chief Marketing Officer',
      'Chief Revenue Officer', 'Chief People Officer', 'President'
    ],
    rolesResponsibilities: [
      'Define company mission, vision, and strategy',
      'Make final decisions on major investments',
      'Oversee all divisions and functions',
      'Represent company to shareholders and investors',
      'Ensure long-term sustainability and growth',
      'Foster strategic culture and values',
      'Manage board relationships',
      'Drive merger and acquisition strategy',
      'Set company-wide policies',
      'Navigate market dynamics'
    ],
    priorities: [
      'Business growth and market share expansion',
      'Maximizing shareholder value',
      'Long-term financial health',
      'Identifying transformational opportunities',
      'Mitigating enterprise risks',
      'Building sustainable competitive advantage',
      'Attracting and retaining top talent',
      'Maintaining company reputation'
    ],
    communicationStyle: 'Visionary, focused on market dynamics and shareholder value. Thinks in terms of industry transformation and legacy.',
    decisionMaking: 'Ultimate authority on strategic decisions and major investments. Reports to board of directors.',
    commonObjections: [
      "How does this transform our business model?",
      "What's the impact on shareholder value?",
      "How does this position us against market disruption?",
      "Show me the 5-year financial model",
      "What's the exit strategy?",
      "How does this affect our valuation?",
      "What are the acquisition opportunities?",
      "How does this align with our investor commitments?"
    ],
    informationSharing: 'Highest level strategic context, market intelligence, board and investor perspectives. Very selective with information.',
    budgetAuthority: 'Ultimate budget authority. Can approve any investment with board approval. Thinks in terms of company valuation.',
    typicalConcerns: [
      'Market disruption and industry transformation',
      'Investor and analyst expectations',
      'Board governance and relationships',
      'Company legacy and long-term impact',
      'Global economic factors'
    ]
  }
};

// Helper function to get persona by level
export function getPersonaDefinition(level: PersonaLevel): PersonaDefinition {
  return PERSONA_DEFINITIONS[level];
}

// Helper function to get random title for persona level
export function getRandomTitle(level: PersonaLevel): string {
  const persona = PERSONA_DEFINITIONS[level];
  return persona.titles[Math.floor(Math.random() * persona.titles.length)];
}

// Helper function to get budget range for persona level
export function getBudgetRange(level: PersonaLevel, companySize: 'small' | 'medium' | 'large' | 'enterprise'): string {
  const ranges = {
    'junior': { small: '$0', medium: '$0', large: '$0', enterprise: '$0' },
    'manager': { 
      small: '$5K-$25K', 
      medium: '$10K-$50K', 
      large: '$25K-$100K', 
      enterprise: '$50K-$250K' 
    },
    'director': { 
      small: '$25K-$100K', 
      medium: '$50K-$250K', 
      large: '$100K-$500K', 
      enterprise: '$250K-$1M' 
    },
    'vp': { 
      small: '$100K-$500K', 
      medium: '$250K-$1M', 
      large: '$500K-$5M', 
      enterprise: '$1M-$10M' 
    },
    'c-level': { 
      small: '$500K+', 
      medium: '$1M+', 
      large: '$5M+', 
      enterprise: '$10M+' 
    }
  };
  
  return ranges[level][companySize];
}