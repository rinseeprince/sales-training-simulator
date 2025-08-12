// Difficulty level modifiers and prompts

import { DifficultyLevel, DifficultyModifier } from '../types/prospect-types';

export const DIFFICULTY_MODIFIERS: Record<DifficultyLevel, DifficultyModifier> = {
  1: {
    level: 1,
    name: 'Very Cooperative',
    description: 'Prospect is eager to learn and share information freely',
    cooperationLevel: 0.9,
    informationSharingLevel: 0.9,
    objectionFrequency: 0.1,
    trustBuildingRequired: 0.1,
    responseDelay: 500
  },
  2: {
    level: 2,
    name: 'Somewhat Cooperative',
    description: 'Prospect is willing to engage but needs some prompting',
    cooperationLevel: 0.7,
    informationSharingLevel: 0.7,
    objectionFrequency: 0.3,
    trustBuildingRequired: 0.3,
    responseDelay: 800
  },
  3: {
    level: 3,
    name: 'Moderately Cooperative',
    description: 'Prospect requires good questions and value demonstration',
    cooperationLevel: 0.5,
    informationSharingLevel: 0.5,
    objectionFrequency: 0.5,
    trustBuildingRequired: 0.5,
    responseDelay: 1000
  },
  4: {
    level: 4,
    name: 'Somewhat Guarded',
    description: 'Prospect is skeptical and shares information selectively',
    cooperationLevel: 0.3,
    informationSharingLevel: 0.3,
    objectionFrequency: 0.7,
    trustBuildingRequired: 0.7,
    responseDelay: 1500
  },
  5: {
    level: 5,
    name: 'Very Guarded',
    description: 'Prospect is highly skeptical and requires significant effort',
    cooperationLevel: 0.1,
    informationSharingLevel: 0.1,
    objectionFrequency: 0.9,
    trustBuildingRequired: 0.9,
    responseDelay: 2000
  }
};

export function getDifficultyPrompt(level: DifficultyLevel): string {
  const modifier = DIFFICULTY_MODIFIERS[level];
  
  return `DIFFICULTY LEVEL: ${level} - ${modifier.name}

BEHAVIOR MODIFIERS:
- Cooperation Level: ${modifier.cooperationLevel * 100}%
- Information Sharing: ${modifier.informationSharingLevel * 100}%
- Objection Frequency: ${modifier.objectionFrequency * 100}%
- Trust Building Required: ${modifier.trustBuildingRequired * 100}%

INTERACTION STYLE:
${getDifficultyBehavior(level)}

INFORMATION SHARING APPROACH:
${getInformationSharingStyle(level)}

OBJECTION STYLE:
${getObjectionStyle(level)}`;
}

function getDifficultyBehavior(level: DifficultyLevel): string {
  const behaviors: Record<DifficultyLevel, string> = {
    1: `- Respond enthusiastically to questions
- Volunteer additional information
- Show clear buying signals
- Minimal objections or concerns
- Quick to see value in solutions`,
    
    2: `- Respond positively to good questions
- Share information with light prompting
- Show interest but need convincing
- Raise a few reasonable concerns
- Open to exploring solutions`,
    
    3: `- Require specific, relevant questions
- Share information when directly asked
- Show cautious interest
- Present multiple objections
- Need clear value demonstration`,
    
    4: `- Respond selectively to questions
- Guard sensitive information
- Show skepticism throughout
- Present strong objections
- Require proof and references`,
    
    5: `- Resist most questions initially
- Share minimal information
- Display active skepticism
- Present frequent, strong objections
- Demand extensive justification`
  };
  
  return behaviors[level];
}

function getInformationSharingStyle(level: DifficultyLevel): string {
  const styles: Record<DifficultyLevel, string> = {
    1: `Share freely about:
- Current challenges and pain points
- Budget and decision process
- Team structure and stakeholders
- Timeline and urgency
- Success criteria`,
    
    2: `Share with light prompting:
- Basic challenges
- General budget range
- Key stakeholders
- Rough timeline
- High-level goals`,
    
    3: `Share only when asked directly:
- Specific pain points
- Budget constraints
- Decision makers
- Project timeline
- Success metrics`,
    
    4: `Reluctantly share:
- Surface-level challenges
- Vague budget indications
- Limited stakeholder info
- Uncertain timeline
- General objectives`,
    
    5: `Extremely guarded about:
- Any internal challenges
- Budget information
- Decision process
- Timeline details
- Strategic initiatives`
  };
  
  return styles[level];
}

function getObjectionStyle(level: DifficultyLevel): string {
  const styles: Record<DifficultyLevel, string> = {
    1: `- Raise minor concerns that are easily addressed
- Accept reasonable responses quickly
- Focus on implementation details
- Show willingness to move forward`,
    
    2: `- Present common, reasonable objections
- Listen to responses with open mind
- Ask follow-up questions for clarity
- Can be convinced with good answers`,
    
    3: `- Raise multiple substantive objections
- Require detailed responses
- Push back on vague answers
- Need evidence and examples`,
    
    4: `- Present strong, frequent objections
- Challenge most claims
- Demand proof and references
- Remain skeptical even after responses`,
    
    5: `- Object to almost everything
- Dismiss initial responses
- Require extensive evidence
- Find new objections constantly`
  };
  
  return styles[level];
}

// Dynamic difficulty adjustment based on rep performance
export function adjustDifficultyResponse(
  baseLevel: DifficultyLevel,
  repPerformance: 'poor' | 'average' | 'excellent'
): string {
  const adjustments = {
    poor: `Since the rep is struggling:
- Don't make it impossibly hard
- Give subtle hints when stuck
- Respond to genuine effort
- Allow some progress`,
    
    average: `Maintain consistent difficulty:
- Stick to the defined level
- Respond appropriately to good techniques
- Don't give away information too easily
- Provide realistic challenges`,
    
    excellent: `Since the rep is performing well:
- Can be slightly more challenging
- Require more sophisticated approaches
- Test advanced techniques
- Push for deeper discovery`
  };
  
  return adjustments[repPerformance];
}