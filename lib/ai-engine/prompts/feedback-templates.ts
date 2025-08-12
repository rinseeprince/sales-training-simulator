// Coaching feedback templates

import { CallScore, CoachingFeedback } from '../types/scoring-types';
import { CallType, PersonaLevel } from '../types/prospect-types';

export function generateCoachingFeedback(
  score: CallScore,
  callType: CallType,
  personaLevel: PersonaLevel
): CoachingFeedback {
  const templates = getCoachingTemplates(score.overallScore);
  
  return {
    summary: generateSummary(score, callType, personaLevel),
    strengths: generateStrengths(score),
    improvements: generateImprovements(score),
    missedOpportunities: generateMissedOpportunities(score),
    nextCallPrep: generateNextCallPrep(score, callType, personaLevel),
    practiceRecommendations: generatePracticeRecommendations(score)
  };
}

function generateSummary(score: CallScore, callType: CallType, personaLevel: PersonaLevel): string {
  const performance = getPerformanceLevel(score.overallScore);
  
  const templates = {
    excellent: `Outstanding ${callType} call performance! You demonstrated mastery in engaging a ${personaLevel}-level prospect with a score of ${score.overallScore}/100. Your ability to ${getTopStrength(score)} was particularly impressive.`,
    
    good: `Good ${callType} call with a ${personaLevel}-level prospect, scoring ${score.overallScore}/100. You showed solid fundamentals, particularly in ${getTopStrength(score)}. Focus on ${getTopImprovement(score)} to reach the next level.`,
    
    average: `This ${callType} call with a ${personaLevel}-level prospect scored ${score.overallScore}/100, showing room for growth. While you ${getTopStrength(score)}, working on ${getTopImprovement(score)} will significantly improve your results.`,
    
    poor: `This ${callType} call needs significant improvement, scoring ${score.overallScore}/100. Engaging ${personaLevel}-level prospects requires stronger ${getTopImprovement(score)}. Let's focus on building these fundamental skills.`
  };
  
  return templates[performance];
}

function getPerformanceLevel(score: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}

function getTopStrength(score: CallScore): string {
  const metrics = Object.entries(score.breakdown)
    .sort(([, a], [, b]) => b.score - a.score);
  
  const [topMetric] = metrics[0];
  
  const strengthDescriptions: Record<string, string> = {
    talkRatio: 'maintain an ideal conversation balance',
    discovery: 'ask insightful discovery questions',
    objectionHandling: 'handle objections professionally',
    confidence: 'project confidence and authority',
    cta: 'drive clear next steps'
  };
  
  return strengthDescriptions[topMetric] || 'demonstrate sales skills';
}

function getTopImprovement(score: CallScore): string {
  const metrics = Object.entries(score.breakdown)
    .sort(([, a], [, b]) => a.score - b.score);
  
  const [weakestMetric] = metrics[0];
  
  const improvementDescriptions: Record<string, string> = {
    talkRatio: 'conversation balance and listening skills',
    discovery: 'discovery questioning techniques',
    objectionHandling: 'objection handling strategies',
    confidence: 'confidence and executive presence',
    cta: 'closing and next step clarity'
  };
  
  return improvementDescriptions[weakestMetric] || 'core sales skills';
}

function generateStrengths(score: CallScore): Array<{
  category: string;
  observation: string;
  example: string;
  timestamp?: string;
}> {
  const strengths: Array<{
    category: string;
    observation: string;
    example: string;
    timestamp?: string;
  }> = [];
  
  // Add strengths based on high-scoring metrics
  Object.entries(score.breakdown).forEach(([metric, data]) => {
    if (data.score >= 80) {
      strengths.push({
        category: metric,
        observation: getStrengthObservation(metric, data.score),
        example: getStrengthExample(metric, score.detailedAnalysis)
      });
    }
  });
  
  return strengths.slice(0, 3); // Top 3 strengths
}

function generateImprovements(score: CallScore): Array<{
  category: string;
  issue: string;
  suggestion: string;
  example: string;
  priority: 'low' | 'medium' | 'high';
}> {
  const improvements: Array<{
    category: string;
    issue: string;
    suggestion: string;
    example: string;
    priority: 'low' | 'medium' | 'high';
  }> = [];
  
  Object.entries(score.breakdown).forEach(([metric, data]) => {
    if (data.score < 70) {
      improvements.push({
        category: metric,
        issue: getImprovementIssue(metric, data.score),
        suggestion: getImprovementSuggestion(metric),
        example: getImprovementExample(metric, score.detailedAnalysis),
        priority: data.score < 50 ? 'high' : data.score < 60 ? 'medium' : 'low'
      });
    }
  });
  
  return improvements.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }).slice(0, 3);
}

function generateMissedOpportunities(score: CallScore): Array<{
  moment: string;
  whatHappened: string;
  suggestion: string;
  impact: string;
}> {
  const opportunities: Array<{
    moment: string;
    whatHappened: string;
    suggestion: string;
    impact: string;
  }> = [];
  
  // Check for discovery missed opportunities
  if (score.detailedAnalysis.discovery.missedOpportunities.length > 0) {
    score.detailedAnalysis.discovery.missedOpportunities.forEach(opp => {
      opportunities.push({
        moment: 'During discovery',
        whatHappened: opp,
        suggestion: 'Ask follow-up questions to uncover deeper business impact',
        impact: 'Would have revealed critical pain points and built stronger business case'
      });
    });
  }
  
  // Check for objection handling misses
  const poorObjections = score.detailedAnalysis.objectionHandling.objectionTypes
    .filter(obj => obj.effectiveness === 'poor' || obj.effectiveness === 'fair');
  
  poorObjections.forEach(obj => {
    opportunities.push({
      moment: `When prospect said "${obj.objection}"`,
      whatHappened: 'Objection not fully addressed',
      suggestion: 'Use acknowledge-clarify-respond-confirm technique',
      impact: 'Would have built trust and moved conversation forward'
    });
  });
  
  return opportunities.slice(0, 3);
}

function generateNextCallPrep(
  score: CallScore,
  callType: CallType,
  personaLevel: PersonaLevel
): Array<{
  topic: string;
  action: string;
  rationale: string;
}> {
  const prep = [];
  
  // Based on CTA quality
  if (!score.detailedAnalysis.cta.ctaPresent) {
    prep.push({
      topic: 'Clear next steps',
      action: 'Prepare specific meeting agenda and value proposition',
      rationale: 'No clear next steps were established in this call'
    });
  }
  
  // Based on discovery gaps
  if (score.breakdown.discovery.score < 70) {
    prep.push({
      topic: 'Discovery preparation',
      action: `Prepare ${personaLevel}-appropriate discovery questions focused on business impact`,
      rationale: 'Discovery was surface-level and missed key business drivers'
    });
  }
  
  // Based on objection patterns
  if (score.breakdown.objectionHandling.score < 70) {
    prep.push({
      topic: 'Objection responses',
      action: 'Prepare specific responses for common objections using customer success stories',
      rationale: 'Several objections were not effectively addressed'
    });
  }
  
  return prep;
}

function generatePracticeRecommendations(score: CallScore): Array<{
  skill: string;
  exercise: string;
  targetMetric: string;
}> {
  const recommendations: Array<{
    skill: string;
    exercise: string;
    targetMetric: string;
  }> = [];
  
  // Get the two weakest areas
  const weakAreas = Object.entries(score.breakdown)
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 2);
  
  weakAreas.forEach(([metric, data]) => {
    recommendations.push({
      skill: getSkillName(metric),
      exercise: getPracticeExercise(metric, data.score),
      targetMetric: `Improve ${metric} score from ${data.score} to ${Math.min(data.score + 20, 85)}`
    });
  });
  
  return recommendations;
}

// Helper functions
function getStrengthObservation(metric: string, score: number): string {
  const observations: Record<string, Record<string, string>> = {
    talkRatio: {
      excellent: 'Maintained perfect balance between talking and listening',
      good: 'Good conversation flow with appropriate talk time'
    },
    discovery: {
      excellent: 'Asked powerful, open-ended questions that uncovered deep business needs',
      good: 'Solid discovery process covering key areas'
    },
    objectionHandling: {
      excellent: 'Handled every objection with professional technique and empathy',
      good: 'Addressed most objections effectively'
    },
    confidence: {
      excellent: 'Projected strong executive presence and guided conversation masterfully',
      good: 'Demonstrated good confidence and control'
    },
    cta: {
      excellent: 'Secured clear, specific next steps with strong mutual commitment',
      good: 'Established clear follow-up actions'
    }
  };
  
  const level = score >= 90 ? 'excellent' : 'good';
  return observations[metric]?.[level] || 'Performed well in this area';
}

function getStrengthExample(metric: string, analysis: any): string {
  // This would pull from actual transcript analysis
  const examples: Record<string, string> = {
    talkRatio: 'Rep asked a question and then stayed quiet for the full answer',
    discovery: 'Rep asked "What impact does this have on your revenue?"',
    objectionHandling: 'Rep used feel-felt-found technique on budget objection',
    confidence: 'Rep confidently redirected conversation when prospect went off-topic',
    cta: 'Rep proposed specific date/time for demo with clear agenda'
  };
  
  return examples[metric] || 'Demonstrated strong technique';
}

function getImprovementIssue(metric: string, score: number): string {
  const issues: Record<string, Record<string, string>> = {
    talkRatio: {
      poor: 'Dominated conversation, preventing prospect from sharing',
      average: 'Talk ratio imbalanced, limiting discovery opportunity'
    },
    discovery: {
      poor: 'Asked mostly closed questions, missing business context',
      average: 'Surface-level discovery, not uncovering real pain'
    },
    objectionHandling: {
      poor: 'Became defensive or avoided addressing concerns',
      average: 'Incomplete objection handling, missing key steps'
    },
    confidence: {
      poor: 'Excessive filler words and hesitation undermined credibility',
      average: 'Some uncertainty evident in delivery'
    },
    cta: {
      poor: 'No clear next steps established',
      average: 'Vague commitment without specifics'
    }
  };
  
  const level = score < 50 ? 'poor' : 'average';
  return issues[metric]?.[level] || 'Needs improvement in this area';
}

function getImprovementSuggestion(metric: string): string {
  const suggestions: Record<string, string> = {
    talkRatio: 'After asking a question, count to 3 before speaking again. Let silence work for you.',
    discovery: 'Use SPIN questions: Situation → Problem → Implication → Need-Payoff',
    objectionHandling: 'Always acknowledge, clarify the concern, respond with evidence, then confirm',
    confidence: 'Record yourself and eliminate filler words. Practice your core value prop daily.',
    cta: 'Always end with specific date, time, participants, and agenda for next step'
  };
  
  return suggestions[metric] || 'Focus on improving this skill';
}

function getImprovementExample(metric: string, analysis: any): string {
  const examples: Record<string, string> = {
    talkRatio: 'Rep interrupted prospect 3 times during explanation',
    discovery: 'Rep asked "Do you have budget?" instead of exploring value first',
    objectionHandling: 'When prospect said "too expensive", rep immediately offered discount',
    confidence: 'Rep said "um" 15 times and "like" 8 times in 5 minutes',
    cta: 'Rep ended with "I\'ll send you some information" - no commitment'
  };
  
  return examples[metric] || 'See transcript for specific examples';
}

function getSkillName(metric: string): string {
  const names: Record<string, string> = {
    talkRatio: 'Active Listening',
    discovery: 'Discovery Questioning',
    objectionHandling: 'Objection Management',
    confidence: 'Executive Presence',
    cta: 'Closing Techniques'
  };
  
  return names[metric] || metric;
}

function getPracticeExercise(metric: string, currentScore: number): string {
  const exercises: Record<string, string> = {
    talkRatio: 'Practice the "70/30 rule" - aim for prospect talking 70% in discovery calls',
    discovery: 'Write 20 open-ended questions for your product. Practice 5 daily.',
    objectionHandling: 'Role-play top 5 objections using the 4-step process',
    confidence: 'Record 2-minute pitch daily. Count and eliminate filler words.',
    cta: 'Practice 10 different ways to ask for the next meeting'
  };
  
  return exercises[metric] || 'Practice this skill daily';
}

function getCoachingTemplates(score: number): any {
  // Additional coaching templates based on score ranges
  return {
    motivation: score >= 70 ? 
      'Keep up the great work! You\'re on track to mastery.' :
      'Every expert was once a beginner. Focus on one skill at a time.',
    
    encouragement: score >= 85 ?
      'You\'re in the top tier of sales professionals!' :
      'Consistent practice on these areas will dramatically improve your results.',
    
    nextLevel: score >= 70 ?
      'To reach elite status, focus on the subtle details and advanced techniques.' :
      'Master the fundamentals first, then layer in advanced strategies.'
  };
}