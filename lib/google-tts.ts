import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { getRegionalVoiceById } from './voice-constants';

let googleTTSClient: TextToSpeechClient | null = null;

async function getGoogleTTSClient(): Promise<TextToSpeechClient> {
  try {
    if (!googleTTSClient) {
      console.log('Initializing Google TTS client...');
      
      if (!process.env.GOOGLE_TTS_CLIENT_EMAIL || !process.env.GOOGLE_TTS_PRIVATE_KEY) {
        throw new Error('Google TTS credentials not properly configured. Please check GOOGLE_TTS_CLIENT_EMAIL and GOOGLE_TTS_PRIVATE_KEY environment variables.');
      }
      
      googleTTSClient = new TextToSpeechClient({
        credentials: {
          client_email: process.env.GOOGLE_TTS_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_TTS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        projectId: process.env.GOOGLE_TTS_PROJECT_ID,
      });
      
      console.log('Google TTS client initialized successfully');
    }
    
    return googleTTSClient;
  } catch (error) {
    console.error('Google TTS initialization error:', error);
    throw error;
  }
}

export interface GoogleTTSOptions {
  text: string;
  voiceName?: string;
  languageCode?: string;
  ssmlGender?: 'MALE' | 'FEMALE';
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
}

/**
 * Main function to generate Google TTS audio - compatible with ElevenLabs interface
 * Returns the same format as ElevenLabs for seamless migration
 */
interface VoiceSettings {
  voiceId?: string;
  pitch?: number;
  speed?: number;
  emotionalTone?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  region?: 'US' | 'UK';
}

export async function generateGoogleTTSAudio(
  text: string, 
  voiceSettings: VoiceSettings = {}
): Promise<{ success: boolean; audioBase64?: string; error?: string; fallbackReason?: string }> {
  try {
    const client = await getGoogleTTSClient();
    
    // Convert ElevenLabs voice settings to Google TTS parameters
    const googleVoiceSettings = convertElevenLabsToGoogleTTS(voiceSettings);
    
    // Optimize text for natural speech with SSML
    const optimizedText = optimizeTextForNaturalSpeech(text);
    
    const request = {
      input: { text: text }, // Temporarily use plain text to test
      voice: {
        languageCode: googleVoiceSettings.languageCode,
        name: googleVoiceSettings.voiceName,
        ssmlGender: googleVoiceSettings.ssmlGender,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: googleVoiceSettings.speakingRate,
        // Chirp 3: HD voices don't support pitch - WaveNet voices do
        ...(googleVoiceSettings.voiceName?.includes('Chirp3-HD') ? {} : { pitch: googleVoiceSettings.pitch }),
        volumeGainDb: googleVoiceSettings.volumeGainDb,
        // Premium audio quality for natural sound
        sampleRateHertz: 24000, // Higher sample rate for better quality
        effectsProfileId: ['large-home-entertainment-class-device'], // Enhanced audio profile
      },
    };

    console.log('Generating Google TTS audio for text:', text.substring(0, 50) + '...');
    console.log('Using voice settings:', googleVoiceSettings);
    
    const [response] = await client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      return { 
        success: false, 
        error: 'No audio content returned from Google TTS',
        fallbackReason: 'google_tts_error'
      };
    }

    const audioBase64 = Buffer.from(response.audioContent).toString('base64');
    console.log('Google TTS audio generated successfully, size:', audioBase64.length);
    
    return { success: true, audioBase64 };
    
  } catch (error) {
    console.error('Google TTS generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown Google TTS error',
      fallbackReason: 'google_tts_error'
    };
  }
}

/**
 * Convert ElevenLabs voice settings to Google TTS parameters
 * Maintains compatibility with existing voiceSettings objects
 */
function convertElevenLabsToGoogleTTS(elevenLabsSettings: VoiceSettings = {}) {
  // Map ElevenLabs voiceId to Google TTS voice
  const voiceMapping = getGoogleVoiceFromElevenLabs(elevenLabsSettings.voiceId);
  
  // Apply voice-specific adjustments for better character representation
  const voiceAdjustments = getVoiceAdjustments(elevenLabsSettings.voiceId);
  
  return {
    voiceName: voiceMapping.name,
    languageCode: voiceMapping.languageCode,
    ssmlGender: voiceMapping.ssmlGender,
    // Convert ElevenLabs parameters to Google TTS equivalents with voice-specific adjustments
    speakingRate: convertStabilityToSpeakingRate(elevenLabsSettings.stability) * voiceAdjustments.speakingRateMultiplier,
    pitch: convertStyleToPitch(elevenLabsSettings.style) + voiceAdjustments.pitchOffset,
    volumeGainDb: convertSimilarityBoostToVolume(elevenLabsSettings.similarityBoost) + voiceAdjustments.volumeOffset,
  };
}

/**
 * Get voice-specific adjustments optimized for Chirp 3: HD voices
 * All voices use Chirp 3: HD for ultra-natural speech with perfect intonation
 */
function getVoiceAdjustments(voiceId?: string) {
  const adjustments: Record<string, { speakingRateMultiplier: number; pitchOffset: number; volumeOffset: number }> = {
    // NEW REGIONAL VOICE IDS - US Voices
    'professional-male-us': {
      speakingRateMultiplier: 0.98,
      pitchOffset: 0,
      volumeOffset: 2.0
    },
    'professional-female-us': {
      speakingRateMultiplier: 1.0,
      pitchOffset: 0,
      volumeOffset: 2.0
    },
    'executive-male-us': {
      speakingRateMultiplier: 0.95,
      pitchOffset: 0,
      volumeOffset: 2.5
    },
    'executive-female-us': {
      speakingRateMultiplier: 0.97,
      pitchOffset: 0,
      volumeOffset: 2.3
    },
    'casual-male-us': {
      speakingRateMultiplier: 1.03,
      pitchOffset: 0,
      volumeOffset: 1.8
    },
    'casual-female-us': {
      speakingRateMultiplier: 1.02,
      pitchOffset: 0,
      volumeOffset: 1.8
    },

    // NEW REGIONAL VOICE IDS - UK Voices
    'professional-male-uk': {
      speakingRateMultiplier: 0.98,
      pitchOffset: 0,
      volumeOffset: 2.0
    },
    'professional-female-uk': {
      speakingRateMultiplier: 1.0,
      pitchOffset: 0,
      volumeOffset: 2.0
    },
    'executive-male-uk': {
      speakingRateMultiplier: 0.95,
      pitchOffset: 0,
      volumeOffset: 2.5
    },
    'executive-female-uk': {
      speakingRateMultiplier: 0.97,
      pitchOffset: 0,
      volumeOffset: 2.3
    },
    'casual-male-uk': {
      speakingRateMultiplier: 1.03,
      pitchOffset: 0,
      volumeOffset: 1.8
    },
    'casual-female-uk': {
      speakingRateMultiplier: 1.02,
      pitchOffset: 0,
      volumeOffset: 1.8
    },

    // LEGACY ELEVENLABS VOICE IDS (for backward compatibility)
    '21m00Tcm4TlvDq8ikWAM': { // professional-male
      speakingRateMultiplier: 0.98,
      pitchOffset: 0,
      volumeOffset: 2.0
    },
    'EXAVITQu4vr4xnSDxMaL': { // professional-female
      speakingRateMultiplier: 1.0,
      pitchOffset: 0,
      volumeOffset: 2.0
    },
    'pNInz6obpgDQGcFmaJgB': { // executive-male
      speakingRateMultiplier: 0.95,
      pitchOffset: 0,
      volumeOffset: 2.5
    },
    'VR6AewLTigWG4xSOukaG': { // executive-female
      speakingRateMultiplier: 0.97,
      pitchOffset: 0,
      volumeOffset: 2.3
    },
    'yoZ06aMxZJJ28mfd3POQ': { // casual-male
      speakingRateMultiplier: 1.03,
      pitchOffset: 0,
      volumeOffset: 1.8
    },
    'ThT5KcBeYPX3keUQqHPh': { // casual-female
      speakingRateMultiplier: 1.02,
      pitchOffset: 0,
      volumeOffset: 1.8
    },

    // LEGACY STYLE-ONLY IDS (for backward compatibility)
    'professional-male': {
      speakingRateMultiplier: 0.98,
      pitchOffset: 0,
      volumeOffset: 2.0
    },
    'professional-female': {
      speakingRateMultiplier: 1.0,
      pitchOffset: 0,
      volumeOffset: 2.0
    },
    'executive-male': {
      speakingRateMultiplier: 0.95,
      pitchOffset: 0,
      volumeOffset: 2.5
    },
    'executive-female': {
      speakingRateMultiplier: 0.97,
      pitchOffset: 0,
      volumeOffset: 2.3
    },
    'casual-male': {
      speakingRateMultiplier: 1.03,
      pitchOffset: 0,
      volumeOffset: 1.8
    },
    'casual-female': {
      speakingRateMultiplier: 1.02,
      pitchOffset: 0,
      volumeOffset: 1.8
    },
    
    // Default - Chirp 3: HD optimized
    'default': {
      speakingRateMultiplier: 0.98,
      pitchOffset: 0,
      volumeOffset: 2.0
    }
  };
  
  return adjustments[voiceId || 'default'] || adjustments['default'];
}

/**
 * Map regional voice IDs to Google TTS voices (updated for backward compatibility)
 * Using ONLY Chirp 3: HD voices for ultra-natural, human-like speech across all options
 */
function getGoogleVoiceFromElevenLabs(elevenLabsVoiceId?: string) {
  // Handle new regional voice IDs
  const regionalVoice = getRegionalVoiceById(elevenLabsVoiceId || '');
  if (regionalVoice) {
    return {
      name: regionalVoice.googleVoiceName,
      languageCode: regionalVoice.languageCode,
      ssmlGender: regionalVoice.gender
    };
  }

  // Legacy mappings for backward compatibility
  const voiceMappings: Record<string, { name: string; languageCode: string; ssmlGender: 'MALE' | 'FEMALE' }> = {
    // Legacy professional voices - map to US versions for backward compatibility
    '21m00Tcm4TlvDq8ikWAM': { // professional-male
      name: 'en-US-Chirp3-HD-Fenrir',
      languageCode: 'en-US',
      ssmlGender: 'MALE'
    },
    'EXAVITQu4vr4xnSDxMaL': { // professional-female
      name: 'en-US-Chirp3-HD-Erinome',
      languageCode: 'en-US',
      ssmlGender: 'FEMALE'
    },
    
    // Legacy executive voices
    'pNInz6obpgDQGcFmaJgB': { // executive-male
      name: 'en-US-Chirp3-HD-Iapetus',
      languageCode: 'en-US',
      ssmlGender: 'MALE'
    },
    'VR6AewLTigWG4xSOukaG': { // executive-female
      name: 'en-US-Chirp3-HD-Gacrux',
      languageCode: 'en-US',
      ssmlGender: 'FEMALE'
    },
    
    // Legacy casual voices
    'yoZ06aMxZJJ28mfd3POQ': { // casual-male
      name: 'en-US-Chirp3-HD-Puck',
      languageCode: 'en-US',
      ssmlGender: 'MALE'
    },
    'ThT5KcBeYPX3keUQqHPh': { // casual-female
      name: 'en-US-Chirp3-HD-Zephyr',
      languageCode: 'en-US',
      ssmlGender: 'FEMALE'
    },
    
    // Legacy voice styles without regional prefix - map to US
    'professional-male': {
      name: 'en-US-Chirp3-HD-Fenrir',
      languageCode: 'en-US',
      ssmlGender: 'MALE'
    },
    'professional-female': {
      name: 'en-US-Chirp3-HD-Erinome',
      languageCode: 'en-US',
      ssmlGender: 'FEMALE'
    },
    'executive-male': {
      name: 'en-US-Chirp3-HD-Iapetus',
      languageCode: 'en-US',
      ssmlGender: 'MALE'
    },
    'executive-female': {
      name: 'en-US-Chirp3-HD-Gacrux',
      languageCode: 'en-US',
      ssmlGender: 'FEMALE'
    },
    'casual-male': {
      name: 'en-US-Chirp3-HD-Puck',
      languageCode: 'en-US',
      ssmlGender: 'MALE'
    },
    'casual-female': {
      name: 'en-US-Chirp3-HD-Zephyr',
      languageCode: 'en-US',
      ssmlGender: 'FEMALE'
    },
    
    // Default fallback - US professional male
    'default': {
      name: 'en-US-Chirp3-HD-Fenrir',
      languageCode: 'en-US', 
      ssmlGender: 'MALE'
    }
  };
  
  const mapping = voiceMappings[elevenLabsVoiceId || 'default'] || voiceMappings['default'];
  console.log(`Voice mapping: ${elevenLabsVoiceId} -> ${mapping.name} (${mapping.ssmlGender})`);
  
  return mapping;
}

/**
 * Convert ElevenLabs stability (0-1) to Google TTS speaking rate (0.25-4.0)
 * Optimized for natural human speech patterns
 */
function convertStabilityToSpeakingRate(stability?: number): number {
  if (stability === undefined || stability === null) return 1.0;
  
  // More subtle adjustments for natural speech
  // Stability 0.5 = normal rate 1.0
  // Higher stability = slightly slower, more measured speech
  // Lower stability = slightly faster, more conversational
  return Math.max(0.85, Math.min(1.15, 1.0 + (stability - 0.5) * 0.3));
}

/**
 * Convert ElevenLabs style (0-1) to Google TTS pitch (-20 to 20)
 * Optimized for natural expression without robotic extremes
 */
function convertStyleToPitch(style?: number): number {
  if (style === undefined || style === null) return 0.0;
  
  // More natural pitch variations
  // Style 0.5 = neutral pitch 0.0
  // Reduced range for more human-like expression
  return (style - 0.5) * 4; // Maps 0-1 to -2 to +2 pitch (more natural range)
}

/**
 * Convert ElevenLabs similarityBoost (0-1) to Google TTS volume gain (-96 to 16)
 * SimilarityBoost affects voice clarity - map to volume for audibility
 */
function convertSimilarityBoostToVolume(similarityBoost?: number): number {
  if (similarityBoost === undefined || similarityBoost === null) return 0.0;
  
  // SimilarityBoost 0.5 = normal volume 0.0
  // Higher boost = slightly louder
  // Lower boost = slightly quieter
  return (similarityBoost - 0.5) * 6; // Maps 0-1 to -3dB to +3dB
}

/**
 * Optimize text for natural speech using SSML
 * Adds natural pauses, emphasis, and breathing patterns for human-like delivery
 */
function optimizeTextForNaturalSpeech(text: string): string {
  // Escape XML special characters first
  let ssmlText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  // Add natural pauses after sentences
  ssmlText = ssmlText.replace(/\. /g, '. <break time="0.6s"/> ');
  ssmlText = ssmlText.replace(/\! /g, '! <break time="0.7s"/> ');
  ssmlText = ssmlText.replace(/\? /g, '? <break time="0.8s"/> ');
  
  // Add shorter pauses after commas and colons
  ssmlText = ssmlText.replace(/, /g, ', <break time="0.3s"/> ');
  ssmlText = ssmlText.replace(/: /g, ': <break time="0.4s"/> ');
  ssmlText = ssmlText.replace(/; /g, '; <break time="0.4s"/> ');
  
  // Add emphasis to important business terms
  ssmlText = ssmlText.replace(/\b(sales|revenue|growth|profit|ROI|conversion|success|achieve|increase|improve|deliver|exceed|optimize)\b/gi, 
    '<emphasis level="moderate">$1</emphasis>');
  
  // Add slight emphasis to numbers and percentages for clarity
  ssmlText = ssmlText.replace(/\b\d+(\.\d+)?%?\b/g, '<emphasis level="reduced">$&</emphasis>');
  
  // Slow down when speaking email addresses or URLs
  ssmlText = ssmlText.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 
    '<prosody rate="0.8">$&</prosody>');
  
  // Add natural breathing pauses for longer sentences (over 100 characters)
  const sentences = ssmlText.split(/(?<=[.!?])\s+/);
  const processedSentences = sentences.map(sentence => {
    if (sentence.length > 100) {
      // Add breathing pause roughly in the middle
      const words = sentence.split(' ');
      const midPoint = Math.floor(words.length / 2);
      words.splice(midPoint, 0, '<break time="0.2s"/>');
      return words.join(' ');
    }
    return sentence;
  });
  
  ssmlText = processedSentences.join(' ');
  
  // Wrap in SSML speak tags
  return `<speak>${ssmlText}</speak>`;
}
