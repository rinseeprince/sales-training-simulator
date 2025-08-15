# AI Engine Upgrade Guide

## Overview

This guide documents the new compiled-prompt AI engine implementation that replaces the fragmented AI logic with a sophisticated single-model approach using gpt-5.

## Key Features

### 1. Centralized Model Configuration
- All AI model settings in `lib/ai-config.ts`
- Environment variable support for model selection
- Feature flag for legacy rollback

### 2. Compiled Prompt Engine
- Sophisticated prompt compilation in `lib/prompt-compiler.ts`
- Layered prompt structure: Seniority → Context → Scenario → Difficulty → Emotional drift → Rules → History
- Emotional state tracking based on seller behavior
- Response validation with nudging mechanism

### 3. Unified Streaming Implementation
- Updated `app/api/stream-gpt-voice/route.ts` with new engine
- Maintains existing streaming functionality
- Legacy mode support for rollback

### 4. Structured Coaching Feedback
- New `app/api/coach-call/route.ts` endpoint
- Category-based scoring (Opening, Discovery, Objection Handling, Value Demo, Closing)
- Structured feedback sections (Strengths, Improvements, Next Steps)
- JSON-based response format

### 5. Enhanced UI Components
- Prompt preview panel in scenario builder
- Advanced AI configuration options
- Structured coaching feedback display in post-call review
- Category-based performance visualization

## Configuration

### Environment Variables

```bash
# Model selection
AI_SIM_MODEL=gpt-4o             # Model for simulation
AI_COACH_MODEL=gpt-4o           # Model for coaching
AI_ENGINE_LEGACY=false          # Set to 'true' to use legacy implementation

# Optional UI display
NEXT_PUBLIC_AI_SIM_MODEL=gpt-4o
NEXT_PUBLIC_AI_COACH_MODEL=gpt-4o
```

### Model Configuration

The AI configuration is centralized in `lib/ai-config.ts`:

```typescript
export const AI_CONFIG = {
  SIM_MODEL: process.env.AI_SIM_MODEL || 'gpt-4o',
  COACH_MODEL: process.env.AI_COACH_MODEL || 'gpt-4o',
  temperature: 0.7,
  presence_penalty: 0.2,
  frequency_penalty: 0.2,
  max_tokens: 180,
  seed: 42
} as const;
```

## Implementation Details

### Prompt Compilation Process

1. **Seniority Layer**: Defines role-based behavior (junior to c-level)
2. **Call Context Layer**: Sets interaction type (outbound, inbound, elevator pitch, objection handling)
3. **Scenario Integration**: Incorporates user-defined scenario
4. **Difficulty Behavior**: Adjusts cooperation level (1-5 scale)
5. **Emotional Drift**: Tracks prospect engagement based on seller performance
6. **Response Rules**: Enforces natural conversation patterns
7. **Conversation History**: Includes recent exchanges for context

### Emotional State Tracking

The system tracks four emotional states:
- **Guarded**: Default state, cautious engagement
- **Warming**: Responds to insightful questions
- **Engaged**: Active participation in conversation
- **Dismissive**: Triggered by vague or pushy behavior

### Response Validation

The system validates AI responses for:
- Role consistency (prevents role-swapping)
- Response length (enforces conciseness)
- Difficulty alignment (ensures appropriate skepticism)

## Usage

### Testing the New Engine

1. Ensure environment variables are set
2. Create a scenario in the scenario builder
3. Enable "Show Prompt Preview" to see compiled prompt
4. Run simulation to test new behavior
5. Review structured coaching feedback in post-call review

### Rollback to Legacy Mode

If issues arise, set `AI_ENGINE_LEGACY=true` to revert to the previous implementation without code changes.

## API Endpoints

### Simulation Streaming
- **Endpoint**: `/api/stream-gpt-voice`
- **Method**: POST
- **Body**: 
  ```json
  {
    "transcript": "string",
    "scenarioPrompt": "string",
    "persona": {
      "seniority": "manager",
      "callType": "discovery-outbound",
      "difficulty": 3
    },
    "conversationHistory": []
  }
  ```

### Coaching Feedback
- **Endpoint**: `/api/coach-call`
- **Method**: POST
- **Body**:
  ```json
  {
    "transcript": [
      {
        "speaker": "rep",
        "message": "string"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "overallScore": 85,
    "categoryScores": {
      "opening": 18,
      "discovery": 22,
      "objectionHandling": 15,
      "valueDemonstration": 17,
      "closing": 13
    },
    "strengths": ["string"],
    "improvements": ["string"],
    "nextSteps": ["string"],
    "model": "gpt-5",
    "timestamp": "ISO 8601"
  }
  ```

## Migration Notes

1. The new engine maintains backward compatibility through the legacy flag
2. Existing scenario data works with the new engine
3. UI components gracefully degrade if new features are unavailable
4. All streaming functionality is preserved

## Future Enhancements

1. Custom prompt templates per industry
2. Multi-language support
3. Advanced emotional state modeling
4. Real-time coaching during calls
5. Performance analytics dashboard
