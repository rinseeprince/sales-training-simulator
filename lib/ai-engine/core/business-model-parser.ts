// Business Model Parser - Extracts context from scenarios

import { openai } from '@/lib/api-utils';
import { 
  BusinessContext, 
  ProductContext, 
  ScenarioContext,
  PersonaConfig,
  CallType,
  DifficultyLevel
} from '../types/prospect-types';
import { AI_MODEL_CONFIG } from '../config/ai-model-config';

export interface ParsedScenario {
  businessContext: BusinessContext;
  productContext: ProductContext;
  additionalContext?: Record<string, unknown>;
}

export class BusinessModelParser {
  async parseScenario(scenarioPrompt: string): Promise<ParsedScenario> {
    try {
      const parsePrompt = this.buildParsePrompt(scenarioPrompt);
      
      const completion = await openai.chat.completions.create({
        model: AI_MODEL_CONFIG.functionCalling.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting business context from sales scenarios.'
          },
          {
            role: 'user',
            content: parsePrompt
          }
        ],
        temperature: AI_MODEL_CONFIG.functionCalling.temperature,
        max_tokens: AI_MODEL_CONFIG.functionCalling.maxTokens,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No parsing response received');
      
      const parsed = JSON.parse(response);
      return this.validateAndEnrichParsedData(parsed);

    } catch (error) {
      console.error('Business model parsing error:', error);
      return this.generateDefaultContext(scenarioPrompt);
    }
  }

  private buildParsePrompt(scenarioPrompt: string): string {
    return `Extract business and product context from this sales scenario:

"${scenarioPrompt}"

Provide a JSON response with this structure:
{
  "businessContext": {
    "companyName": "extracted company name or 'Prospect Company'",
    "industry": "identified industry",
    "companySize": "small/medium/large/enterprise based on context",
    "annualRevenue": "if mentioned",
    "currentChallenges": ["list of challenges mentioned"],
    "existingSolutions": ["current tools/processes mentioned"],
    "budgetRange": "if mentioned",
    "decisionTimeframe": "if mentioned",
    "competitors": ["mentioned competitors"],
    "recentInitiatives": ["any mentioned initiatives"]
  },
  "productContext": {
    "productName": "your product being sold",
    "category": "product category (CRM, Analytics, etc.)",
    "valuePropositions": ["key value props that would appeal"],
    "keyFeatures": ["relevant features for this scenario"],
    "pricing": "if mentioned",
    "competitiveAdvantages": ["advantages over competition"],
    "commonUseCases": ["use cases for this industry"],
    "integrations": ["relevant integrations"],
    "implementation": "implementation approach"
  },
  "additionalContext": {
    "buyingTriggers": ["what might trigger a purchase"],
    "successMetrics": ["how they measure success"],
    "stakeholders": ["likely stakeholders involved"],
    "salesApproach": "recommended approach for this scenario"
  }
}

Extract as much relevant information as possible. Make intelligent inferences based on industry standards when specific details aren't provided.`;
  }

  private validateAndEnrichParsedData(parsed: Record<string, unknown>): ParsedScenario {
    // Ensure all required fields exist
    const businessContext: BusinessContext = {
      companyName: parsed.businessContext?.companyName || 'Prospect Company',
      industry: parsed.businessContext?.industry || 'Technology',
      companySize: parsed.businessContext?.companySize || 'medium',
      annualRevenue: parsed.businessContext?.annualRevenue,
      currentChallenges: parsed.businessContext?.currentChallenges || ['Efficiency', 'Growth'],
      existingSolutions: parsed.businessContext?.existingSolutions || ['Manual processes'],
      budgetRange: parsed.businessContext?.budgetRange,
      decisionTimeframe: parsed.businessContext?.decisionTimeframe,
      competitors: parsed.businessContext?.competitors || [],
      recentInitiatives: parsed.businessContext?.recentInitiatives || []
    };

    const productContext: ProductContext = {
      productName: parsed.productContext?.productName || 'Sales Solution',
      category: parsed.productContext?.category || 'SaaS',
      valuePropositions: parsed.productContext?.valuePropositions || [
        'Increase efficiency',
        'Reduce costs',
        'Improve customer satisfaction'
      ],
      keyFeatures: parsed.productContext?.keyFeatures || [
        'Easy to use',
        'Scalable',
        'Integrated analytics'
      ],
      pricing: parsed.productContext?.pricing,
      competitiveAdvantages: parsed.productContext?.competitiveAdvantages || [
        'Better user experience',
        'Faster implementation',
        'Superior support'
      ],
      commonUseCases: parsed.productContext?.commonUseCases || [],
      integrations: parsed.productContext?.integrations || [],
      implementation: parsed.productContext?.implementation || 'Phased rollout'
    };

    return {
      businessContext,
      productContext,
      additionalContext: parsed.additionalContext
    };
  }

  private generateDefaultContext(scenarioPrompt: string): ParsedScenario {
    // Extract basic info from prompt
    const industry = this.extractIndustry(scenarioPrompt);
    const companySize = this.extractCompanySize(scenarioPrompt);
    
    return {
      businessContext: {
        companyName: 'Prospect Company',
        industry,
        companySize,
        currentChallenges: ['Operational efficiency', 'Revenue growth', 'Customer satisfaction'],
        existingSolutions: ['Current vendor solution', 'Internal tools'],
        competitors: ['Competitor A', 'Competitor B']
      },
      productContext: {
        productName: 'Your Solution',
        category: 'Business Software',
        valuePropositions: [
          'Streamline operations',
          'Increase revenue',
          'Improve customer experience'
        ],
        keyFeatures: [
          'Cloud-based platform',
          'Real-time analytics',
          'Easy integration'
        ],
        competitiveAdvantages: [
          'Industry-leading technology',
          'Proven ROI',
          'World-class support'
        ],
        commonUseCases: [
          'Process automation',
          'Data analysis',
          'Customer management'
        ]
      }
    };
  }

  private extractIndustry(prompt: string): string {
    const industries = [
      'technology', 'healthcare', 'finance', 'retail', 'manufacturing',
      'education', 'real estate', 'hospitality', 'transportation', 'energy'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    for (const industry of industries) {
      if (lowerPrompt.includes(industry)) {
        return industry.charAt(0).toUpperCase() + industry.slice(1);
      }
    }
    
    return 'Technology'; // Default
  }

  private extractCompanySize(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('enterprise') || lowerPrompt.includes('fortune')) {
      return 'enterprise';
    }
    if (lowerPrompt.includes('large') || lowerPrompt.includes('thousand')) {
      return 'large';
    }
    if (lowerPrompt.includes('small') || lowerPrompt.includes('startup')) {
      return 'small';
    }
    
    return 'medium'; // Default
  }

  buildScenarioContext(
    parsedScenario: ParsedScenario,
    personaConfig: PersonaConfig,
    callType: CallType,
    difficulty: DifficultyLevel
  ): ScenarioContext {
    return {
      businessContext: parsedScenario.businessContext,
      productContext: parsedScenario.productContext,
      personaConfig,
      callType,
      difficulty,
      specificObjections: this.generateSpecificObjections(
        parsedScenario,
        personaConfig,
        callType
      ),
      hiddenNeeds: this.generateHiddenNeeds(parsedScenario),
      successMetrics: this.generateSuccessMetrics(parsedScenario)
    };
  }

  private generateSpecificObjections(
    parsed: ParsedScenario,
    persona: PersonaConfig,
    callType: CallType
  ): string[] {
    const objections = [];
    
    // Budget-related objections
    if (persona.level === 'junior' || persona.level === 'manager') {
      objections.push(`We don't have budget for ${parsed.productContext.category} solutions`);
    }
    
    // Competition objections
    if (parsed.businessContext.existingSolutions.length > 0) {
      objections.push(`We're already using ${parsed.businessContext.existingSolutions[0]}`);
    }
    
    // Timing objections
    if (callType === 'discovery-outbound') {
      objections.push('This isn\'t a priority for us right now');
    }
    
    // Authority objections
    if (persona.level === 'junior') {
      objections.push('I\'m not the person who makes these decisions');
    }
    
    return objections;
  }

  private generateHiddenNeeds(parsed: ParsedScenario): string[] {
    const needs = [];
    
    // Based on challenges
    parsed.businessContext.currentChallenges.forEach(challenge => {
      if (challenge.toLowerCase().includes('efficiency')) {
        needs.push('Reduce manual work and save time');
      }
      if (challenge.toLowerCase().includes('growth')) {
        needs.push('Scale operations without adding headcount');
      }
      if (challenge.toLowerCase().includes('customer')) {
        needs.push('Improve customer satisfaction scores');
      }
    });
    
    // Industry-specific needs
    switch (parsed.businessContext.industry.toLowerCase()) {
      case 'healthcare':
        needs.push('Maintain compliance with regulations');
        break;
      case 'finance':
        needs.push('Reduce risk and ensure security');
        break;
      case 'retail':
        needs.push('Improve inventory management');
        break;
      case 'manufacturing':
        needs.push('Optimize supply chain');
        break;
    }
    
    return needs;
  }

  private generateSuccessMetrics(parsed: ParsedScenario): string[] {
    const metrics = [];
    
    // Universal metrics
    metrics.push('Return on investment (ROI)');
    metrics.push('Time to value');
    metrics.push('User adoption rate');
    
    // Size-specific metrics
    switch (parsed.businessContext.companySize) {
      case 'enterprise':
        metrics.push('Enterprise-wide standardization');
        metrics.push('Cross-department efficiency gains');
        break;
      case 'small':
        metrics.push('Quick implementation');
        metrics.push('Minimal training required');
        break;
    }
    
    // Industry-specific metrics
    if (parsed.businessContext.industry.toLowerCase().includes('sales')) {
      metrics.push('Sales cycle reduction');
      metrics.push('Win rate improvement');
    }
    
    return metrics;
  }

  // Helper method to extract persona from scenario text
  extractPersonaHints(scenarioPrompt: string): Partial<PersonaConfig> {
    const hints: Partial<PersonaConfig> = {};
    const lowerPrompt = scenarioPrompt.toLowerCase();
    
    // Extract level hints
    if (lowerPrompt.includes('ceo') || lowerPrompt.includes('cto') || lowerPrompt.includes('cfo')) {
      hints.level = 'c-level';
    } else if (lowerPrompt.includes('vp') || lowerPrompt.includes('vice president')) {
      hints.level = 'vp';
    } else if (lowerPrompt.includes('director')) {
      hints.level = 'director';
    } else if (lowerPrompt.includes('manager')) {
      hints.level = 'manager';
    }
    
    // Extract personality hints
    const traits = [];
    if (lowerPrompt.includes('analytical') || lowerPrompt.includes('data')) {
      traits.push('analytical');
    }
    if (lowerPrompt.includes('busy') || lowerPrompt.includes('time')) {
      traits.push('time-conscious');
    }
    if (lowerPrompt.includes('skeptical') || lowerPrompt.includes('cautious')) {
      traits.push('skeptical');
    }
    
    if (traits.length > 0) {
      hints.personalityTraits = traits;
    }
    
    return hints;
  }
}