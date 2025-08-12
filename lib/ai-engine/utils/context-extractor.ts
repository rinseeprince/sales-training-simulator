// Context extraction utilities

import { CallTranscript } from '@/lib/types';
import { BusinessContext, ProductContext } from '../types/prospect-types';

export class ContextExtractor {
  private transcript: CallTranscript[];
  
  constructor(transcript: CallTranscript[]) {
    this.transcript = transcript;
  }

  extractBusinessContext(): Partial<BusinessContext> {
    const context: Partial<BusinessContext> = {};
    
    // Extract company information
    const companyInfo = this.extractCompanyInfo();
    if (companyInfo.name) context.companyName = companyInfo.name;
    if (companyInfo.size) context.companySize = companyInfo.size;
    if (companyInfo.industry) context.industry = companyInfo.industry;
    
    // Extract challenges
    context.currentChallenges = this.extractChallenges();
    
    // Extract budget information
    const budget = this.extractBudget();
    if (budget) context.budgetRange = budget;
    
    // Extract timeline
    const timeline = this.extractTimeline();
    if (timeline) context.decisionTimeframe = timeline;
    
    // Extract existing solutions
    context.existingSolutions = this.extractExistingSolutions();
    
    return context;
  }

  private extractCompanyInfo(): { name?: string; size?: string; industry?: string } {
    const info: any = {};
    
    this.transcript.forEach(turn => {
      const lower = turn.message.toLowerCase();
      
      // Company size patterns
      if (lower.match(/\b(\d+)\s*(employees|people|staff)/i)) {
        const match = lower.match(/\b(\d+)\s*(employees|people|staff)/i);
        const count = parseInt(match[1]);
        
        if (count < 50) info.size = 'small';
        else if (count < 500) info.size = 'medium';
        else if (count < 5000) info.size = 'large';
        else info.size = 'enterprise';
      }
      
      // Industry patterns
      const industries = [
        'technology', 'healthcare', 'finance', 'retail', 'manufacturing',
        'education', 'real estate', 'hospitality', 'transportation'
      ];
      
      industries.forEach(industry => {
        if (lower.includes(industry)) {
          info.industry = industry.charAt(0).toUpperCase() + industry.slice(1);
        }
      });
      
      // Company name patterns
      if (lower.includes('we are') || lower.includes('our company')) {
        // Extract company name from context
        const nameMatch = turn.message.match(/(?:we are|our company,?\s+)([A-Z][A-Za-z\s&]+)/);
        if (nameMatch) {
          info.name = nameMatch[1].trim();
        }
      }
    });
    
    return info;
  }

  private extractChallenges(): string[] {
    const challenges = new Set<string>();
    const challengeKeywords = [
      'challenge', 'problem', 'issue', 'struggle', 'difficult',
      'pain point', 'concern', 'bottleneck', 'inefficient'
    ];
    
    this.transcript.forEach(turn => {
      if (turn.speaker !== 'rep') {
        const lower = turn.message.toLowerCase();
        
        challengeKeywords.forEach(keyword => {
          if (lower.includes(keyword)) {
            // Extract the sentence containing the challenge
            const sentences = turn.message.split(/[.!?]+/);
            sentences.forEach(sentence => {
              if (sentence.toLowerCase().includes(keyword)) {
                const challenge = this.cleanChallenge(sentence.trim());
                if (challenge) challenges.add(challenge);
              }
            });
          }
        });
        
        // Specific challenge patterns
        if (lower.includes('too much time')) challenges.add('Time-consuming processes');
        if (lower.includes('manual') && lower.includes('process')) challenges.add('Manual processes');
        if (lower.includes('can\'t scale')) challenges.add('Scalability issues');
        if (lower.includes('data') && lower.includes('silo')) challenges.add('Data silos');
        if (lower.includes('lack of visibility')) challenges.add('Lack of visibility');
      }
    });
    
    return Array.from(challenges);
  }

  private cleanChallenge(text: string): string {
    // Remove common prefixes
    const prefixes = ['our', 'the', 'we have', 'there is', 'it\'s'];
    let cleaned = text;
    
    prefixes.forEach(prefix => {
      if (cleaned.toLowerCase().startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    });
    
    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    
    return cleaned;
  }

  private extractBudget(): string | undefined {
    let budget: string | undefined;
    
    this.transcript.forEach(turn => {
      if (turn.speaker !== 'rep') {
        // Look for budget patterns
        const budgetMatch = turn.message.match(/\$?([\d,]+)([kKmM])?(?:\s*-\s*\$?([\d,]+)([kKmM])?)?/);
        
        if (budgetMatch && turn.message.toLowerCase().includes('budget')) {
          const amount1 = parseInt(budgetMatch[1].replace(/,/g, ''));
          const unit1 = budgetMatch[2]?.toLowerCase();
          
          let budgetString = '$' + amount1.toLocaleString();
          if (unit1 === 'k') budgetString += 'K';
          if (unit1 === 'm') budgetString += 'M';
          
          if (budgetMatch[3]) {
            const amount2 = parseInt(budgetMatch[3].replace(/,/g, ''));
            const unit2 = budgetMatch[4]?.toLowerCase();
            
            budgetString += '-$' + amount2.toLocaleString();
            if (unit2 === 'k') budgetString += 'K';
            if (unit2 === 'm') budgetString += 'M';
          }
          
          budget = budgetString;
        }
        
        // Qualitative budget indicators
        if (turn.message.toLowerCase().includes('no budget')) {
          budget = 'No budget allocated';
        } else if (turn.message.toLowerCase().includes('limited budget')) {
          budget = 'Limited budget';
        } else if (turn.message.toLowerCase().includes('budget approved')) {
          budget = 'Budget approved';
        }
      }
    });
    
    return budget;
  }

  private extractTimeline(): string | undefined {
    let timeline: string | undefined;
    
    this.transcript.forEach(turn => {
      if (turn.speaker !== 'rep') {
        const lower = turn.message.toLowerCase();
        
        // Specific timeline patterns
        if (lower.includes('next quarter')) timeline = 'Next quarter';
        else if (lower.includes('this quarter')) timeline = 'This quarter';
        else if (lower.includes('next year')) timeline = 'Next year';
        else if (lower.includes('this year')) timeline = 'This year';
        else if (lower.includes('asap') || lower.includes('as soon as possible')) timeline = 'ASAP';
        else if (lower.includes('no rush') || lower.includes('not urgent')) timeline = 'No urgency';
        
        // Month patterns
        const monthMatch = lower.match(/by\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i);
        if (monthMatch) {
          timeline = `By ${monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1)}`;
        }
        
        // Relative time patterns
        const relativeMatch = lower.match(/(?:within|in)\s+(\d+)\s+(weeks?|months?)/i);
        if (relativeMatch) {
          timeline = `Within ${relativeMatch[1]} ${relativeMatch[2]}`;
        }
      }
    });
    
    return timeline;
  }

  private extractExistingSolutions(): string[] {
    const solutions = new Set<string>();
    const solutionIndicators = [
      'currently using', 'already have', 'existing', 'current solution',
      'we use', 'working with', 'implemented'
    ];
    
    this.transcript.forEach(turn => {
      if (turn.speaker !== 'rep') {
        const lower = turn.message.toLowerCase();
        
        solutionIndicators.forEach(indicator => {
          if (lower.includes(indicator)) {
            // Extract solution name or type
            const patterns = [
              /(?:using|have|with)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)/,
              /(?:using|have)\s+(?:a|an|our)\s+([a-z]+\s+(?:system|solution|tool|platform))/i
            ];
            
            patterns.forEach(pattern => {
              const match = turn.message.match(pattern);
              if (match) {
                solutions.add(match[1].trim());
              }
            });
          }
        });
        
        // Common solution types
        if (lower.includes('spreadsheet') || lower.includes('excel')) {
          solutions.add('Spreadsheets');
        }
        if (lower.includes('manual') || lower.includes('paper')) {
          solutions.add('Manual processes');
        }
        if (lower.includes('homegrown') || lower.includes('custom built')) {
          solutions.add('Custom-built solution');
        }
      }
    });
    
    return Array.from(solutions);
  }

  extractProductContext(): Partial<ProductContext> {
    const context: Partial<ProductContext> = {};
    
    // Extract product mentions and features
    const features = this.extractFeaturesMentioned();
    if (features.length > 0) context.keyFeatures = features;
    
    // Extract value propositions discussed
    const valueProps = this.extractValuePropositions();
    if (valueProps.length > 0) context.valuePropositions = valueProps;
    
    // Extract competitive mentions
    const competitors = this.extractCompetitors();
    if (competitors.length > 0) {
      context.competitiveAdvantages = this.inferCompetitiveAdvantages(competitors);
    }
    
    return context;
  }

  private extractFeaturesMentioned(): string[] {
    const features = new Set<string>();
    const featureKeywords = [
      'feature', 'capability', 'functionality', 'module',
      'integration', 'dashboard', 'reporting', 'analytics'
    ];
    
    this.transcript.forEach(turn => {
      if (turn.speaker === 'rep') {
        const lower = turn.message.toLowerCase();
        
        featureKeywords.forEach(keyword => {
          if (lower.includes(keyword)) {
            // Extract specific features mentioned
            const sentences = turn.message.split(/[.!?]+/);
            sentences.forEach(sentence => {
              if (sentence.toLowerCase().includes(keyword)) {
                const feature = this.cleanFeature(sentence.trim());
                if (feature && feature.length < 50) {
                  features.add(feature);
                }
              }
            });
          }
        });
      }
    });
    
    return Array.from(features);
  }

  private cleanFeature(text: string): string {
    // Remove common prefixes
    const prefixes = ['our', 'the', 'we have', 'it has', 'includes'];
    let cleaned = text;
    
    prefixes.forEach(prefix => {
      if (cleaned.toLowerCase().startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    });
    
    return cleaned;
  }

  private extractValuePropositions(): string[] {
    const valueProps = new Set<string>();
    const valueKeywords = [
      'help', 'enable', 'allow', 'improve', 'increase',
      'reduce', 'save', 'streamline', 'optimize', 'automate'
    ];
    
    this.transcript.forEach(turn => {
      if (turn.speaker === 'rep') {
        const lower = turn.message.toLowerCase();
        
        valueKeywords.forEach(keyword => {
          if (lower.includes(keyword)) {
            // Extract value statements
            const patterns = [
              new RegExp(`${keyword}s?\\s+(?:you\\s+)?(.+?)(?:\\.|,|and|by)`, 'i'),
              new RegExp(`(?:will|can|to)\\s+${keyword}\\s+(.+?)(?:\\.|,|and)`, 'i')
            ];
            
            patterns.forEach(pattern => {
              const match = turn.message.match(pattern);
              if (match) {
                const value = match[1].trim();
                if (value.length > 10 && value.length < 100) {
                  valueProps.add(this.capitalizeFirst(value));
                }
              }
            });
          }
        });
      }
    });
    
    return Array.from(valueProps);
  }

  private extractCompetitors(): string[] {
    const competitors = new Set<string>();
    
    this.transcript.forEach(turn => {
      const lower = turn.message.toLowerCase();
      
      // Look for competitor mentions
      if (lower.includes('competitor') || lower.includes('alternative') || lower.includes('vs')) {
        // Extract competitor names (capitalized words)
        const competitorMatch = turn.message.match(/(?:than|vs\.?|versus|against)\s+([A-Z][A-Za-z]+)/g);
        if (competitorMatch) {
          competitorMatch.forEach(match => {
            const name = match.replace(/^(than|vs\.?|versus|against)\s+/, '');
            competitors.add(name);
          });
        }
      }
      
      // Common competitor patterns
      if (lower.includes('salesforce')) competitors.add('Salesforce');
      if (lower.includes('hubspot')) competitors.add('HubSpot');
      if (lower.includes('microsoft')) competitors.add('Microsoft');
      if (lower.includes('oracle')) competitors.add('Oracle');
    });
    
    return Array.from(competitors);
  }

  private inferCompetitiveAdvantages(competitors: string[]): string[] {
    // Infer advantages based on common differentiators
    const advantages = [];
    
    if (competitors.length > 0) {
      advantages.push('More user-friendly interface');
      advantages.push('Faster implementation time');
      advantages.push('Better customer support');
      advantages.push('More competitive pricing');
    }
    
    return advantages;
  }

  private capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  extractKeyInsights(): {
    painPoints: string[];
    decisionCriteria: string[];
    stakeholders: string[];
    nextSteps: string[];
  } {
    return {
      painPoints: this.extractPainPoints(),
      decisionCriteria: this.extractDecisionCriteria(),
      stakeholders: this.extractStakeholders(),
      nextSteps: this.extractNextSteps()
    };
  }

  private extractPainPoints(): string[] {
    const painPoints = new Set<string>();
    
    this.transcript.forEach(turn => {
      if (turn.speaker !== 'rep') {
        const lower = turn.message.toLowerCase();
        
        // Pain point indicators
        const painIndicators = [
          'frustrat', 'pain', 'struggle', 'difficult', 'challenge',
          'problem', 'issue', 'waste', 'inefficient', 'slow'
        ];
        
        painIndicators.forEach(indicator => {
          if (lower.includes(indicator)) {
            const sentences = turn.message.split(/[.!?]+/);
            sentences.forEach(sentence => {
              if (sentence.toLowerCase().includes(indicator) && sentence.length > 20) {
                painPoints.add(sentence.trim());
              }
            });
          }
        });
      }
    });
    
    return Array.from(painPoints);
  }

  private extractDecisionCriteria(): string[] {
    const criteria = new Set<string>();
    const criteriaKeywords = [
      'important', 'looking for', 'need', 'require', 'must have',
      'critical', 'essential', 'priority', 'care about'
    ];
    
    this.transcript.forEach(turn => {
      if (turn.speaker !== 'rep') {
        const lower = turn.message.toLowerCase();
        
        criteriaKeywords.forEach(keyword => {
          if (lower.includes(keyword)) {
            // Extract what's important to them
            const patterns = [
              new RegExp(`${keyword}s?\\s+(?:that|to have|is)?\\s*(.+?)(?:\\.|,|and)`, 'i'),
              new RegExp(`(.+?)\\s+(?:is|are)\\s+${keyword}`, 'i')
            ];
            
            patterns.forEach(pattern => {
              const match = turn.message.match(pattern);
              if (match) {
                const criterion = match[1].trim();
                if (criterion.length > 5 && criterion.length < 100) {
                  criteria.add(this.capitalizeFirst(criterion));
                }
              }
            });
          }
        });
      }
    });
    
    return Array.from(criteria);
  }

  private extractStakeholders(): string[] {
    const stakeholders = new Set<string>();
    const titles = [
      'ceo', 'cfo', 'cto', 'cio', 'vp', 'director', 'manager',
      'team', 'boss', 'leadership', 'board', 'committee'
    ];
    
    this.transcript.forEach(turn => {
      const lower = turn.message.toLowerCase();
      
      titles.forEach(title => {
        if (lower.includes(title)) {
          // Extract context around the title
          const patterns = [
            new RegExp(`(?:my|our|the)\\s+(${title}\\s*(?:of\\s+\\w+)?)`, 'i'),
            new RegExp(`(${title}\\s*(?:of\\s+\\w+)?)\\s+(?:will|would|needs)`, 'i')
          ];
          
          patterns.forEach(pattern => {
            const match = turn.message.match(pattern);
            if (match) {
              stakeholders.add(this.capitalizeFirst(match[1].trim()));
            }
          });
        }
      });
    });
    
    return Array.from(stakeholders);
  }

  private extractNextSteps(): string[] {
    const nextSteps = new Set<string>();
    const nextStepKeywords = [
      'next step', 'follow up', 'send', 'schedule', 'meeting',
      'demo', 'proposal', 'call', 'discuss'
    ];
    
    this.transcript.forEach(turn => {
      const lower = turn.message.toLowerCase();
      
      nextStepKeywords.forEach(keyword => {
        if (lower.includes(keyword)) {
          // Look for commitment language
          if (lower.includes('will') || lower.includes('let\'s') || lower.includes('can we')) {
            const sentences = turn.message.split(/[.!?]+/);
            sentences.forEach(sentence => {
              if (sentence.toLowerCase().includes(keyword) && sentence.length > 10) {
                nextSteps.add(sentence.trim());
              }
            });
          }
        }
      });
    });
    
    return Array.from(nextSteps);
  }
}