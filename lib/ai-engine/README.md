# AI Engine for Sales Training Platform

This is a sophisticated AI engine that powers realistic sales conversation simulations and provides detailed performance analysis.

## Architecture Overview

### Core Components

1. **Prospect Engine** (`core/prospect-engine.ts`)
   - Simulates intelligent AI prospects with configurable personas
   - Maintains conversation state and memory
   - Adapts responses based on rep performance

2. **Scoring Engine** (`core/scoring-engine.ts`)
   - Comprehensive call analysis and scoring
   - Multiple metrics with weighted scoring
   - AI-powered coaching feedback generation

3. **Business Model Parser** (`core/business-model-parser.ts`)
   - Extracts business context from scenarios
   - Generates realistic company profiles
   - Creates industry-specific challenges

4. **Conversation Manager** (`core/conversation-manager.ts`)
   - Tracks conversation flow and phases
   - Identifies key moments and events
   - Provides real-time analytics

## Persona System

### 5 Persona Levels

1. **Junior (End User)**
   - Limited decision authority
   - Task-focused communication
   - Common objections: "Need manager approval", "No budget"

2. **Manager**
   - Departmental decision maker
   - Balance of tactical and strategic thinking
   - Common objections: "How does this affect my team?", "Need ROI data"

3. **Director**
   - Strategic focus
   - Significant budget authority
   - Common objections: "Strategic alignment?", "Competitive advantage?"

4. **VP**
   - Business unit leadership
   - Major investment decisions
   - Common objections: "Market impact?", "Board justification?"

5. **C-Level**
   - Executive vision
   - Company-wide impact
   - Common objections: "Shareholder value?", "Market disruption?"

## Call Types

1. **Discovery (Outbound)**: Cold call, skeptical prospect
2. **Discovery (Inbound)**: Interested prospect who reached out
3. **Objection Handling**: Practice handling specific objections
4. **Elevator Pitch**: Brief, time-constrained interaction

## Difficulty Levels (1-5)

- **Level 1**: Very cooperative, shares freely
- **Level 2**: Somewhat cooperative, needs prompting
- **Level 3**: Moderate, requires good technique
- **Level 4**: Guarded, skeptical, many objections
- **Level 5**: Very difficult, minimal information sharing

## Scoring Metrics

### Weighted Scoring System
- **Talk Ratio** (20%): Ideal balance of rep vs prospect talking
- **Discovery Quality** (25%): Open questions, depth, business impact
- **Objection Handling** (20%): Technique and effectiveness
- **Confidence** (15%): Presence, clarity, assertiveness
- **CTA/Next Steps** (20%): Specificity and mutual agreement

### Scoring Ranges
- 85-100: Excellent performance
- 70-84: Good performance
- 50-69: Average performance
- Below 50: Needs improvement

## API Endpoints

### Enhanced Streaming Voice API (V2)
```
POST /api/stream-gpt-voice-v2
{
  "transcript": "Rep's message",
  "scenarioPrompt": "Scenario description",
  "sessionId": "unique-session-id",
  "personaLevel": "manager",
  "callType": "discovery-outbound",
  "difficulty": 3,
  "voiceSettings": {...}
}
```

### Enhanced Scoring API (V2)
```
POST /api/score-call-v2
{
  "transcript": [...],
  "callType": "discovery-inbound",
  "personaLevel": "director",
  "includeDetailedAnalysis": true,
  "historicalScores": [...]
}
```

### Business Models API
```
GET /api/business-models?template=true&industry=technology
POST /api/business-models
PUT /api/business-models
DELETE /api/business-models?id=uuid
```

### AI Engine Test API
```
POST /api/ai-engine/test
{
  "testType": "prospect-response|scoring|business-parser|conversation-flow|transcript-analysis|full-simulation",
  "scenario": "basic|complex|objection",
  "input": "...",
  "options": {...}
}
```

## Database Schema

### New Tables
- `business_models`: Company and product contexts
- `scoring_rubrics`: Scoring criteria and benchmarks
- `performance_trends`: Historical performance tracking
- `conversation_sessions`: Active conversation state
- `ai_engine_config`: Configuration management

### Enhanced Tables
- `scenarios`: Added persona config, difficulty, call type
- `calls`: Added detailed metrics, coaching feedback, analysis

## Usage Examples

### Creating a Prospect Engine
```typescript
import { AIProspectEngine } from '@/lib/ai-engine/core/prospect-engine';
import { BusinessModelParser } from '@/lib/ai-engine/core/business-model-parser';

// Parse scenario
const parser = new BusinessModelParser();
const parsed = await parser.parseScenario(scenarioPrompt);

// Build context
const context = parser.buildScenarioContext(
  parsed,
  { level: 'manager', personalityTraits: ['analytical'] },
  'discovery-outbound',
  3 // difficulty
);

// Create engine
const engine = new AIProspectEngine({ scenarioContext: context });

// Generate response
const response = await engine.generateResponse("Hi, do you have a few minutes?");
```

### Scoring a Call
```typescript
import { CallScoringEngine } from '@/lib/ai-engine/core/scoring-engine';

const engine = new CallScoringEngine(transcript, 'discovery-inbound');
const score = await engine.scoreCall();

console.log(`Overall Score: ${score.overallScore}/100`);
console.log(`Coaching: ${score.coachingFeedback.summary}`);
```

## Configuration

### AI Model Settings
- Prospect responses: GPT-4 Turbo, temperature 0.8
- Scoring: GPT-4 Turbo, temperature 0.3
- Analysis: GPT-4 Turbo, temperature 0.5

### Voice Settings
- Default voice: ElevenLabs Rachel
- Emotional tone adjustments based on sentiment
- Stability and style parameters per persona

## Performance Considerations

- Conversation sessions timeout after 30 minutes
- Maximum 10 conversation turns stored in memory
- Transcript analysis limited to 4000 tokens
- Parallel processing for multiple analyses

## Future Enhancements

1. Video avatar integration
2. Multi-language support
3. Industry-specific knowledge bases
4. Team performance analytics
5. Custom scoring rubric builder
6. Real-time coaching hints
7. Integration with CRM systems
8. Mobile app support