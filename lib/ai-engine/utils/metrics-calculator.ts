// Metrics calculation utilities

import { CallTranscript } from '@/lib/types';
import { CallScore, ScoringMetric } from '../types/scoring-types';
import { CallType } from '../types/prospect-types';
import { METRIC_WEIGHTS, IDEAL_TALK_RATIOS } from '../config/scoring-weights';

export class MetricsCalculator {
  static calculateWeightedScore(
    metrics: Record<string, ScoringMetric>,
    callType: CallType
  ): number {
    const weights = METRIC_WEIGHTS[callType];
    let totalScore = 0;
    
    Object.entries(metrics).forEach(([key, metric]) => {
      const weight = weights[key] || 0;
      totalScore += metric.score * weight;
    });
    
    return Math.round(totalScore);
  }

  static calculateTalkRatioScore(
    repPercentage: number,
    callType: CallType
  ): { score: number; analysis: string } {
    const idealRange = IDEAL_TALK_RATIOS[callType];
    const midpoint = (idealRange.min + idealRange.max) / 2;
    const deviation = Math.abs(repPercentage - midpoint);
    
    let score: number;
    let analysis: string;
    
    // Find the appropriate rubric score
    if (repPercentage >= idealRange.min && repPercentage <= idealRange.max) {
      score = 100;
      analysis = `Perfect talk ratio (${repPercentage.toFixed(1)}%) within ideal range of ${idealRange.min}-${idealRange.max}%`;
    } else if (deviation <= 5) {
      score = 90;
      analysis = `Good talk ratio (${repPercentage.toFixed(1)}%), slightly outside ideal range`;
    } else if (deviation <= 10) {
      score = 75;
      analysis = `Acceptable talk ratio (${repPercentage.toFixed(1)}%), moderately outside ideal range`;
    } else if (deviation <= 20) {
      score = 50;
      analysis = `Poor talk ratio (${repPercentage.toFixed(1)}%), significantly outside ideal range`;
    } else if (deviation <= 30) {
      score = 25;
      analysis = `Very poor talk ratio (${repPercentage.toFixed(1)}%), far outside ideal range`;
    } else {
      score = 0;
      analysis = `Extremely imbalanced talk ratio (${repPercentage.toFixed(1)}%)`;
    }
    
    // Add specific feedback
    if (repPercentage > idealRange.max) {
      analysis += '. Rep dominated the conversation - need more listening and discovery.';
    } else if (repPercentage < idealRange.min) {
      analysis += '. Rep needs to guide the conversation more effectively.';
    }
    
    return { score, analysis };
  }

  static calculateDiscoveryScore(
    openQuestions: number,
    totalQuestions: number,
    depth: 'surface' | 'moderate' | 'deep'
  ): { score: number; analysis: string } {
    const openRatio = totalQuestions > 0 ? openQuestions / totalQuestions : 0;
    let score: number;
    let analysis: string;
    
    // Apply rubric
    if (depth === 'deep' && openRatio > 0.7) {
      score = 100;
      analysis = 'Excellent discovery with deep, business-focused questions';
    } else if (depth === 'deep' && openRatio > 0.5) {
      score = 85;
      analysis = 'Strong discovery reaching business impact level';
    } else if (depth === 'moderate' && openRatio > 0.5) {
      score = 70;
      analysis = 'Good discovery covering key areas';
    } else if (depth === 'moderate' && openRatio > 0.3) {
      score = 60;
      analysis = 'Adequate discovery but could go deeper';
    } else if (depth === 'surface' && totalQuestions > 3) {
      score = 50;
      analysis = 'Surface-level discovery missing business impact';
    } else if (totalQuestions > 0) {
      score = 30;
      analysis = 'Poor discovery, mostly closed questions';
    } else {
      score = 0;
      analysis = 'No discovery attempted';
    }
    
    // Add ratio details
    analysis += ` (${openQuestions} open / ${totalQuestions} total questions)`;
    
    return { score, analysis };
  }

  static calculateObjectionScore(
    handledCount: number,
    totalCount: number,
    techniques: Record<string, number>
  ): { score: number; analysis: string } {
    if (totalCount === 0) {
      return { 
        score: 100, 
        analysis: 'No objections raised during the call' 
      };
    }
    
    const successRate = handledCount / totalCount;
    const techniqueScore = this.evaluateObjectionTechniques(techniques);
    
    // Combine success rate and technique quality
    const baseScore = successRate * 80; // 80% weight on handling
    const qualityBonus = techniqueScore * 0.2; // 20% weight on technique
    const score = Math.round(baseScore + qualityBonus);
    
    let analysis = `Handled ${handledCount} of ${totalCount} objections (${(successRate * 100).toFixed(0)}% success rate)`;
    
    if (techniqueScore >= 80) {
      analysis += ' using excellent technique';
    } else if (techniqueScore >= 60) {
      analysis += ' with good technique';
    } else {
      analysis += ' but technique needs improvement';
    }
    
    return { score, analysis };
  }

  private static evaluateObjectionTechniques(techniques: Record<string, number>): number {
    const total = Object.values(techniques).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0;
    
    // Ideal is using all 4 techniques (acknowledge, clarify, respond, confirm)
    const techniqueTypes = Object.keys(techniques).filter(key => techniques[key] > 0).length;
    const techniqueScore = (techniqueTypes / 4) * 100;
    
    return techniqueScore;
  }

  static calculateConfidenceScore(
    fillerCount: number,
    messageCount: number,
    assertiveness: 'low' | 'moderate' | 'high'
  ): { score: number; analysis: string } {
    const fillerRatio = messageCount > 0 ? fillerCount / messageCount : 0;
    let score = 70; // Base score
    
    // Deduct for filler words
    score -= Math.min(40, fillerRatio * 20);
    
    // Adjust for assertiveness
    if (assertiveness === 'high') {
      score += 20;
    } else if (assertiveness === 'moderate') {
      score += 10;
    } else {
      score -= 10;
    }
    
    score = Math.max(0, Math.min(100, score));
    
    let analysis = `${assertiveness} assertiveness`;
    if (fillerCount > 0) {
      analysis += ` with ${fillerCount} filler words (${fillerRatio.toFixed(1)} per message)`;
    } else {
      analysis += ' with clear, confident delivery';
    }
    
    return { score, analysis };
  }

  static calculateCTAScore(
    ctaPresent: boolean,
    quality: 'none' | 'weak' | 'moderate' | 'strong',
    specificity: 'vague' | 'somewhat-specific' | 'very-specific',
    mutualAgreement: boolean
  ): { score: number; analysis: string } {
    if (!ctaPresent) {
      return { 
        score: 0, 
        analysis: 'No clear call-to-action or next steps established' 
      };
    }
    
    let score = 40; // Base score for having a CTA
    
    // Add points for quality
    switch (quality) {
      case 'strong':
        score += 30;
        break;
      case 'moderate':
        score += 20;
        break;
      case 'weak':
        score += 10;
        break;
    }
    
    // Add points for specificity
    switch (specificity) {
      case 'very-specific':
        score += 20;
        break;
      case 'somewhat-specific':
        score += 10;
        break;
    }
    
    // Add points for mutual agreement
    if (mutualAgreement) {
      score += 10;
    }
    
    let analysis = `${quality} CTA with ${specificity.replace('-', ' ')} details`;
    if (mutualAgreement) {
      analysis += ' and mutual agreement';
    } else {
      analysis += ' but no clear prospect commitment';
    }
    
    return { score, analysis };
  }

  static calculateTrends(
    currentScore: number,
    historicalScores: number[]
  ): {
    trend: 'improving' | 'stable' | 'declining';
    averageScore: number;
    improvement: number;
  } {
    if (historicalScores.length === 0) {
      return {
        trend: 'stable',
        averageScore: currentScore,
        improvement: 0
      };
    }
    
    const averageScore = historicalScores.reduce((sum, score) => sum + score, 0) / historicalScores.length;
    const recentScores = historicalScores.slice(-3); // Last 3 scores
    const recentAverage = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    
    let trend: 'improving' | 'stable' | 'declining';
    if (currentScore > recentAverage + 5) {
      trend = 'improving';
    } else if (currentScore < recentAverage - 5) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }
    
    const improvement = currentScore - averageScore;
    
    return { trend, averageScore, improvement };
  }

  static generateMetricBreakdown(
    score: CallScore
  ): Array<{ metric: string; score: number; weight: number; contribution: number }> {
    const breakdown = [];
    
    Object.entries(score.breakdown).forEach(([metric, data]) => {
      breakdown.push({
        metric: data.name,
        score: data.score,
        weight: data.weight,
        contribution: data.score * data.weight
      });
    });
    
    return breakdown.sort((a, b) => b.contribution - a.contribution);
  }

  static identifyTopImprovementAreas(
    score: CallScore,
    maxAreas: number = 3
  ): Array<{ metric: string; currentScore: number; targetScore: number; impact: string }> {
    const areas = [];
    
    Object.entries(score.breakdown).forEach(([metric, data]) => {
      if (data.score < 70) {
        areas.push({
          metric: data.name,
          currentScore: data.score,
          targetScore: Math.min(data.score + 20, 85),
          impact: this.calculateImprovementImpact(metric, data.score, data.weight)
        });
      }
    });
    
    return areas
      .sort((a, b) => a.currentScore - b.currentScore)
      .slice(0, maxAreas);
  }

  private static calculateImprovementImpact(
    metric: string,
    currentScore: number,
    weight: number
  ): string {
    const potentialGain = (85 - currentScore) * weight;
    
    if (potentialGain > 15) {
      return 'High impact - improving this will significantly boost overall score';
    } else if (potentialGain > 8) {
      return 'Medium impact - worthwhile improvement area';
    } else {
      return 'Low impact - minor contribution to overall score';
    }
  }

  static calculateCallDuration(transcript: CallTranscript[]): number {
    // Estimate based on average speaking rate
    const totalWords = transcript.reduce((sum, turn) => {
      return sum + turn.message.split(' ').length;
    }, 0);
    
    // Average speaking rate: 150 words per minute
    const estimatedMinutes = totalWords / 150;
    
    return Math.round(estimatedMinutes);
  }

  static generatePerformanceInsights(
    scores: Array<{ date: string; score: number; callType: CallType }>
  ): {
    bestCallType: CallType;
    worstCallType: CallType;
    consistency: number;
    strengths: string[];
    focusAreas: string[];
  } {
    // Group scores by call type
    const scoresByType: Record<CallType, number[]> = {
      'discovery-outbound': [],
      'discovery-inbound': [],
      'objection-handling': [],
      'elevator-pitch': []
    };
    
    scores.forEach(({ callType, score }) => {
      if (scoresByType[callType]) {
        scoresByType[callType].push(score);
      }
    });
    
    // Calculate averages
    const averages = Object.entries(scoresByType).map(([type, scores]) => ({
      type: type as CallType,
      average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      count: scores.length
    }));
    
    // Find best and worst
    const sorted = averages.filter(a => a.count > 0).sort((a, b) => b.average - a.average);
    const bestCallType = sorted[0]?.type || 'discovery-outbound';
    const worstCallType = sorted[sorted.length - 1]?.type || 'discovery-outbound';
    
    // Calculate consistency (standard deviation)
    const allScores = scores.map(s => s.score);
    const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const variance = allScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / allScores.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - stdDev); // Lower std dev = higher consistency
    
    // Identify strengths and focus areas
    const strengths = [];
    const focusAreas = [];
    
    sorted.forEach(({ type, average }) => {
      if (average >= 80) {
        strengths.push(`Strong ${type} performance (${average.toFixed(0)}% average)`);
      } else if (average < 60) {
        focusAreas.push(`Improve ${type} skills (currently ${average.toFixed(0)}%)`);
      }
    });
    
    return {
      bestCallType,
      worstCallType,
      consistency: Math.round(consistency),
      strengths,
      focusAreas
    };
  }
}