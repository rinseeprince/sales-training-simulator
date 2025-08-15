export const AI_CONFIG = {
  SIM_MODEL: process.env.AI_SIM_MODEL || 'gpt-4o',
  COACH_MODEL: process.env.AI_COACH_MODEL || 'gpt-4o',
  temperature: 0.7,
  presence_penalty: 0.2,
  frequency_penalty: 0.2,
  max_tokens: 180,
  seed: 42
} as const;

export const LEGACY_MODE = process.env.AI_ENGINE_LEGACY === 'true';
