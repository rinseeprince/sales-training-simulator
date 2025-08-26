declare module '@google-cloud/text-to-speech' {
  export interface SynthesizeSpeechRequest {
    input: {
      text?: string;
      ssml?: string;
    };
    voice: {
      languageCode: string;
      name?: string;
      ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
    };
    audioConfig: {
      audioEncoding: 'LINEAR16' | 'MP3' | 'OGG_OPUS' | 'MULAW' | 'ALAW';
      speakingRate?: number;
      pitch?: number;
      volumeGainDb?: number;
      sampleRateHertz?: number;
      effectsProfileId?: string[];
    };
  }

  export interface SynthesizeSpeechResponse {
    audioContent: Uint8Array | string;
  }

  export class TextToSpeechClient {
    constructor(options?: {
      credentials?: {
        client_email: string;
        private_key: string;
      };
      projectId?: string;
      keyFilename?: string;
    });

    synthesizeSpeech(
      request: SynthesizeSpeechRequest
    ): Promise<[SynthesizeSpeechResponse]>;
  }
}

// Keep the existing Web Speech API declarations from elevenlabs-node.d.ts
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof webkitSpeechRecognition;
}
