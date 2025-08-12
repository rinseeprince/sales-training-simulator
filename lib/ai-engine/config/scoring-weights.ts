// Scoring System Configuration and Weights

import { CallType } from '../types/prospect-types';

// Metric weights by call type
export const METRIC_WEIGHTS: Record<CallType, Record<string, number>> = {
  'discovery-outbound': {
    talkRatio: 0.20,
    discovery: 0.30,
    objectionHandling: 0.20,
    confidence: 0.15,
    cta: 0.15
  },
  'discovery-inbound': {
    talkRatio: 0.15,
    discovery: 0.25,
    objectionHandling: 0.20,
    confidence: 0.20,
    cta: 0.20
  },
  'objection-handling': {
    talkRatio: 0.15,
    discovery: 0.15,
    objectionHandling: 0.35,
    confidence: 0.20,
    cta: 0.15
  },
  'elevator-pitch': {
    talkRatio: 0.10,
    discovery: 0.15,
    objectionHandling: 0.15,
    confidence: 0.30,
    cta: 0.30
  }
};

// Ideal talk ratios by call type
export const IDEAL_TALK_RATIOS: Record<CallType, { min: number; max: number }> = {
  'discovery-outbound': { min: 30, max: 40 },
  'discovery-inbound': { min: 35, max: 45 },
  'objection-handling': { min: 40, max: 50 },
  'elevator-pitch': { min: 60, max: 70 }
};

// Scoring rubrics for each metric
export const SCORING_RUBRICS = {
  talkRatio: [
    { score: 100, description: 'Perfect balance within ideal range' },
    { score: 90, description: 'Slightly outside ideal range (±5%)' },
    { score: 75, description: 'Moderately outside ideal range (±10%)' },
    { score: 50, description: 'Significantly outside ideal range (±20%)' },
    { score: 25, description: 'Far outside ideal range (±30%)' },
    { score: 0, description: 'Extremely imbalanced (>30% off)' }
  ],
  
  discovery: [
    { score: 100, description: 'Deep discovery with business impact questions' },
    { score: 85, description: 'Good mix of open questions covering key areas' },
    { score: 70, description: 'Basic discovery with some open questions' },
    { score: 50, description: 'Surface-level questions, mostly closed' },
    { score: 30, description: 'Very few questions asked' },
    { score: 0, description: 'No discovery attempted' }
  ],
  
  objectionHandling: [
    { score: 100, description: 'All objections handled with acknowledge-clarify-respond-confirm' },
    { score: 85, description: 'Most objections handled well with proper technique' },
    { score: 70, description: 'Objections addressed but missing some steps' },
    { score: 50, description: 'Attempted to handle but ineffective' },
    { score: 25, description: 'Defensive or argumentative responses' },
    { score: 0, description: 'Objections ignored or avoided' }
  ],
  
  confidence: [
    { score: 100, description: 'Strong presence, clear communication, no hesitation' },
    { score: 85, description: 'Generally confident with minor hesitations' },
    { score: 70, description: 'Adequate confidence, some filler words' },
    { score: 50, description: 'Noticeable uncertainty, many fillers' },
    { score: 25, description: 'Very uncertain, excessive hesitation' },
    { score: 0, description: 'No confidence, unable to guide conversation' }
  ],
  
  cta: [
    { score: 100, description: 'Clear, specific CTA with mutual agreement and timeline' },
    { score: 85, description: 'Good CTA with most elements present' },
    { score: 70, description: 'CTA attempted with some specificity' },
    { score: 50, description: 'Vague next steps mentioned' },
    { score: 25, description: 'Weak attempt at closing' },
    { score: 0, description: 'No CTA or next steps discussed' }
  ]
};

// Performance benchmarks
export const PERFORMANCE_BENCHMARKS = {
  beginner: {
    overall: 50,
    talkRatio: 60,
    discovery: 50,
    objectionHandling: 40,
    confidence: 45,
    cta: 40
  },
  intermediate: {
    overall: 70,
    talkRatio: 75,
    discovery: 70,
    objectionHandling: 65,
    confidence: 70,
    cta: 65
  },
  advanced: {
    overall: 85,
    talkRatio: 90,
    discovery: 85,
    objectionHandling: 85,
    confidence: 85,
    cta: 80
  },
  expert: {
    overall: 95,
    talkRatio: 95,
    discovery: 95,
    objectionHandling: 95,
    confidence: 95,
    cta: 95
  }
};

// Filler words to detect
export const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'basically', 'actually', 
  'literally', 'sort of', 'kind of', 'I mean', 'right?'
];

// Confidence indicators
export const CONFIDENCE_INDICATORS = {
  positive: [
    'I recommend', 'The best approach', 'Based on my experience',
    'I\'m confident', 'This will', 'You\'ll see', 'I guarantee'
  ],
  negative: [
    'I think maybe', 'It might', 'I\'m not sure', 'Possibly',
    'I guess', 'Sort of', 'Kind of', 'Perhaps'
  ]
};

// Question quality indicators
export const QUESTION_QUALITY = {
  highValue: [
    'What impact', 'How does this affect', 'What happens when',
    'Tell me about', 'Help me understand', 'What challenges',
    'What would success look like', 'What are your priorities'
  ],
  lowValue: [
    'Do you', 'Are you', 'Is it', 'Can you', 'Will you',
    'Have you', 'Did you', 'Would you'
  ]
};

// Objection handling techniques
export const OBJECTION_TECHNIQUES = {
  acknowledge: ['I understand', 'I hear you', 'That makes sense', 'I appreciate'],
  clarify: ['Can you tell me more', 'Help me understand', 'What specifically'],
  respond: ['What we\'ve found', 'Other clients', 'The way we address'],
  confirm: ['Does that address', 'How does that sound', 'Would that help']
};