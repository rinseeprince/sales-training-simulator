import { RegionalVoice } from './types';

/**
 * Regional voice configurations for both US and UK accents
 * Using Chirp 3: HD voices for ultra-natural, human-like speech
 */
export const REGIONAL_VOICES: RegionalVoice[] = [
  // US Voices
  {
    id: 'professional-male-us',
    name: 'Professional Male',
    gender: 'MALE',
    style: 'professional',
    region: 'US',
    languageCode: 'en-US',
    googleVoiceName: 'en-US-Chirp3-HD-Fenrir',
    flagEmoji: '🇺🇸'
  },
  {
    id: 'professional-female-us',
    name: 'Professional Female',
    gender: 'FEMALE',
    style: 'professional',
    region: 'US',
    languageCode: 'en-US',
    googleVoiceName: 'en-US-Chirp3-HD-Erinome',
    flagEmoji: '🇺🇸'
  },
  {
    id: 'executive-male-us',
    name: 'Executive Male',
    gender: 'MALE',
    style: 'executive',
    region: 'US',
    languageCode: 'en-US',
    googleVoiceName: 'en-US-Chirp3-HD-Iapetus',
    flagEmoji: '🇺🇸'
  },
  {
    id: 'executive-female-us',
    name: 'Executive Female',
    gender: 'FEMALE',
    style: 'executive',
    region: 'US',
    languageCode: 'en-US',
    googleVoiceName: 'en-US-Chirp3-HD-Gacrux',
    flagEmoji: '🇺🇸'
  },
  {
    id: 'casual-male-us',
    name: 'Casual Male',
    gender: 'MALE',
    style: 'casual',
    region: 'US',
    languageCode: 'en-US',
    googleVoiceName: 'en-US-Chirp3-HD-Puck',
    flagEmoji: '🇺🇸'
  },
  {
    id: 'casual-female-us',
    name: 'Casual Female',
    gender: 'FEMALE',
    style: 'casual',
    region: 'US',
    languageCode: 'en-US',
    googleVoiceName: 'en-US-Chirp3-HD-Zephyr',
    flagEmoji: '🇺🇸'
  },
  
  // UK Voices
  {
    id: 'professional-male-uk',
    name: 'Professional Male',
    gender: 'MALE',
    style: 'professional',
    region: 'UK',
    languageCode: 'en-GB',
    googleVoiceName: 'en-GB-Chirp3-HD-Fenrir',
    flagEmoji: '🇬🇧'
  },
  {
    id: 'professional-female-uk',
    name: 'Professional Female',
    gender: 'FEMALE',
    style: 'professional',
    region: 'UK',
    languageCode: 'en-GB',
    googleVoiceName: 'en-GB-Chirp3-HD-Erinome',
    flagEmoji: '🇬🇧'
  },
  {
    id: 'executive-male-uk',
    name: 'Executive Male',
    gender: 'MALE',
    style: 'executive',
    region: 'UK',
    languageCode: 'en-GB',
    googleVoiceName: 'en-GB-Chirp3-HD-Iapetus',
    flagEmoji: '🇬🇧'
  },
  {
    id: 'executive-female-uk',
    name: 'Executive Female',
    gender: 'FEMALE',
    style: 'executive',
    region: 'UK',
    languageCode: 'en-GB',
    googleVoiceName: 'en-GB-Chirp3-HD-Gacrux',
    flagEmoji: '🇬🇧'
  },
  {
    id: 'casual-male-uk',
    name: 'Casual Male',
    gender: 'MALE',
    style: 'casual',
    region: 'UK',
    languageCode: 'en-GB',
    googleVoiceName: 'en-GB-Chirp3-HD-Puck',
    flagEmoji: '🇬🇧'
  },
  {
    id: 'casual-female-uk',
    name: 'Casual Female',
    gender: 'FEMALE',
    style: 'casual',
    region: 'UK',
    languageCode: 'en-GB',
    googleVoiceName: 'en-GB-Chirp3-HD-Aoede',
    flagEmoji: '🇬🇧'
  }
];

/**
 * Get regional voice configuration by ID
 */
export function getRegionalVoiceById(voiceId: string): RegionalVoice | undefined {
  return REGIONAL_VOICES.find(voice => voice.id === voiceId);
}

/**
 * Get regional voices grouped by region
 */
export function getVoicesByRegion() {
  return REGIONAL_VOICES.reduce((acc, voice) => {
    if (!acc[voice.region]) {
      acc[voice.region] = [];
    }
    acc[voice.region].push(voice);
    return acc;
  }, {} as Record<string, RegionalVoice[]>);
}