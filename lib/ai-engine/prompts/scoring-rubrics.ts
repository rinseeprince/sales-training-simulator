// Scoring rubrics and evaluation prompts

import { CallType } from '../types/prospect-types';
import { METRIC_WEIGHTS, IDEAL_TALK_RATIOS } from '../config/scoring-weights';

export function buildScoringPrompt(callType: CallType, transcript: string): string {
  const weights = METRIC_WEIGHTS[callType];
  const talkRatios = IDEAL_TALK_RATIOS[callType];
  
  return `You are an expert sales trainer evaluating a ${callType} call. Analyze the transcript and provide detailed scoring.

TRANSCRIPT:
${transcript}

EVALUATION CRITERIA AND WEIGHTS:
- Talk Ratio (${weights.talkRatio * 100}%): Ideal range is ${talkRatios.min}%-${talkRatios.max}% rep talking
- Discovery Quality (${weights.discovery * 100}%): Open questions, depth, business impact
- Objection Handling (${weights.objectionHandling * 100}%): Technique, effectiveness, rapport
- Confidence/Presence (${weights.confidence * 100}%): Clarity, assertiveness, control
- CTA/Next Steps (${weights.cta * 100}%): Specificity, mutual agreement, timeline

Provide a detailed evaluation following this EXACT JSON structure:
{
  "overallScore": <0-100>,
  "metrics": {
    "talkRatio": {
      "score": <0-100>,
      "repTalkPercentage": <number>,
      "prospectTalkPercentage": <number>,
      "analysis": "<detailed analysis>",
      "examples": ["<specific example>", "<specific example>"]
    },
    "discovery": {
      "score": <0-100>,
      "openQuestions": <count>,
      "closedQuestions": <count>,
      "depth": "surface|moderate|deep",
      "strongQuestions": ["<question>", "<question>"],
      "missedOpportunities": ["<opportunity>", "<opportunity>"],
      "analysis": "<detailed analysis>"
    },
    "objectionHandling": {
      "score": <0-100>,
      "totalObjections": <count>,
      "handledWell": <count>,
      "techniques": ["<technique used>", "<technique used>"],
      "examples": [
        {
          "objection": "<what prospect said>",
          "response": "<how rep responded>",
          "effectiveness": "poor|fair|good|excellent"
        }
      ],
      "analysis": "<detailed analysis>"
    },
    "confidence": {
      "score": <0-100>,
      "strengths": ["<strength>", "<strength>"],
      "weaknesses": ["<weakness>", "<weakness>"],
      "fillerWords": <count>,
      "assertiveness": "low|moderate|high",
      "analysis": "<detailed analysis>"
    },
    "cta": {
      "score": <0-100>,
      "present": <true|false>,
      "quality": "none|weak|moderate|strong",
      "specificity": "vague|somewhat-specific|very-specific",
      "mutualAgreement": <true|false>,
      "nextSteps": "<what was agreed>",
      "analysis": "<detailed analysis>"
    }
  },
  "strengths": [
    "<specific strength with example>",
    "<specific strength with example>",
    "<specific strength with example>"
  ],
  "improvements": [
    {
      "issue": "<specific issue>",
      "example": "<where it happened>",
      "suggestion": "<how to improve>",
      "priority": "low|medium|high"
    }
  ],
  "coachingNotes": "<paragraph of specific, actionable coaching advice>"
}

Be specific, reference exact quotes from the transcript, and provide actionable feedback.`;
}

export function buildDetailedAnalysisPrompt(transcript: string): string {
  return `Analyze this sales call transcript for detailed conversation dynamics and methodology.

TRANSCRIPT:
${transcript}

Provide analysis in this JSON structure:
{
  "methodology": {
    "detected": "SPIN|Challenger|MEDDIC|Solution|Consultative|Mixed|None",
    "adherence": <0-100>,
    "examples": {
      "situation": ["<question>", "<question>"],
      "problem": ["<question>", "<question>"],
      "implication": ["<question>", "<question>"],
      "needPayoff": ["<question>", "<question>"]
    }
  },
  "sentiment": {
    "overall": "positive|neutral|negative",
    "progression": [
      {
        "phase": "<phase name>",
        "sentiment": "positive|neutral|negative",
        "trigger": "<what caused the shift>"
      }
    ],
    "rapportIndicators": <count>,
    "tensionPoints": ["<description>", "<description>"]
  },
  "keyMoments": [
    {
      "timestamp": "<approximate time>",
      "type": "breakthrough|objection|commitment|missed-opportunity",
      "description": "<what happened>",
      "impact": "positive|neutral|negative"
    }
  ],
  "conversationFlow": {
    "pacing": "too-slow|optimal|too-fast",
    "transitions": "smooth|choppy|abrupt",
    "repControl": <0-10>,
    "prospectEngagement": <0-10>
  }
}`;
}

// Metric-specific evaluation functions
export const METRIC_EVALUATIONS = {
  talkRatio: (repPercentage: number, callType: CallType): { score: number; feedback: string } => {
    const ideal = IDEAL_TALK_RATIOS[callType];
    const midpoint = (ideal.min + ideal.max) / 2;
    const deviation = Math.abs(repPercentage - midpoint);
    
    let score: number;
    let feedback: string;
    
    if (repPercentage >= ideal.min && repPercentage <= ideal.max) {
      score = 100;
      feedback = 'Perfect talk ratio for this call type';
    } else if (deviation <= 5) {
      score = 90;
      feedback = 'Very good talk ratio, slightly outside ideal range';
    } else if (deviation <= 10) {
      score = 75;
      feedback = 'Acceptable talk ratio but could be optimized';
    } else if (deviation <= 20) {
      score = 50;
      feedback = 'Talk ratio significantly imbalanced';
    } else if (deviation <= 30) {
      score = 25;
      feedback = 'Poor talk ratio, major imbalance';
    } else {
      score = 0;
      feedback = 'Extremely poor talk ratio';
    }
    
    if (repPercentage > ideal.max) {
      feedback += ' - Rep talking too much, not enough discovery';
    } else if (repPercentage < ideal.min) {
      feedback += ' - Rep not guiding conversation enough';
    }
    
    return { score, feedback };
  },
  
  discovery: (openCount: number, totalQuestions: number, depth: string): { score: number; feedback: string } => {
    const openRatio = totalQuestions > 0 ? openCount / totalQuestions : 0;
    let score: number;
    let feedback: string;
    
    if (depth === 'deep' && openRatio > 0.7) {
      score = 100;
      feedback = 'Excellent discovery with deep, open-ended questions';
    } else if (depth === 'moderate' && openRatio > 0.5) {
      score = 85;
      feedback = 'Good discovery covering key areas';
    } else if (depth === 'moderate' && openRatio > 0.3) {
      score = 70;
      feedback = 'Adequate discovery but could go deeper';
    } else if (depth === 'surface' && openRatio > 0.2) {
      score = 50;
      feedback = 'Surface-level discovery, missing opportunities';
    } else if (totalQuestions > 0) {
      score = 30;
      feedback = 'Poor discovery, mostly closed questions';
    } else {
      score = 0;
      feedback = 'No discovery attempted';
    }
    
    return { score, feedback };
  },
  
  objectionHandling: (handled: number, total: number): { score: number; feedback: string } => {
    if (total === 0) {
      return { score: 100, feedback: 'No objections raised' };
    }
    
    const successRate = handled / total;
    let score: number;
    let feedback: string;
    
    if (successRate >= 0.9) {
      score = 100;
      feedback = 'Excellent objection handling with proper technique';
    } else if (successRate >= 0.75) {
      score = 85;
      feedback = 'Good objection handling, most concerns addressed';
    } else if (successRate >= 0.5) {
      score = 70;
      feedback = 'Adequate objection handling, some missed';
    } else if (successRate >= 0.25) {
      score = 50;
      feedback = 'Poor objection handling, many unaddressed';
    } else {
      score = 25;
      feedback = 'Very poor objection handling';
    }
    
    return { score, feedback };
  }
};