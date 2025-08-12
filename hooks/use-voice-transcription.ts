import { useState, useRef, useCallback, useEffect } from 'react';

export interface TranscriptionConfig {
  useWhisper?: boolean;
  chunkDuration?: number; // in milliseconds
  language?: string;
  continuous?: boolean;
  pauseDuringAISpeech?: boolean; // New option to pause during AI speech
}

export interface TranscriptionChunk {
  text: string;
  isFinal: boolean;
  timestamp: string;
  confidence?: number;
}

export function useVoiceTranscription(config: TranscriptionConfig = {}) {
  const {
    useWhisper = false,
    chunkDuration = 6000, // 6 seconds for more complete thoughts
    language = 'en',
    continuous = true,
    pauseDuringAISpeech = true // Default to true to prevent feedback loops
  } = config;

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcriptionChunks, setTranscriptionChunks] = useState<TranscriptionChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // New state for pausing

  // Refs for Web Speech API
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastChunkTimeRef = useRef<number>(0);

  // Function to pause transcription
  const pauseTranscription = useCallback(() => {
    if (pauseDuringAISpeech && !isPaused) {
      console.log('Pausing transcription during AI speech');
      setIsPaused(true);
      
      if (useWhisper && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
    }
  }, [pauseDuringAISpeech, isPaused, useWhisper]);

  // Function to resume transcription
  const resumeTranscription = useCallback(() => {
    if (pauseDuringAISpeech && isPaused) {
      console.log('Resuming transcription after AI speech');
      setIsPaused(false);
      
      if (useWhisper && mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
    }
  }, [pauseDuringAISpeech, isPaused, useWhisper]);

  // Initialize Web Speech API
  const initializeSpeechRecognition = useCallback(() => {
    if (!useWhisper && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript + interimTranscript;
        setCurrentTranscript(fullTranscript);

        if (finalTranscript) {
          const chunk: TranscriptionChunk = {
            text: finalTranscript,
            isFinal: true,
            timestamp: new Date().toISOString(),
            confidence: event.results[event.results.length - 1][0].confidence
          };
          
          setTranscriptionChunks(prev => [...prev, chunk]);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      return true;
    }
    return false;
  }, [useWhisper, continuous, language]);

  // Initialize Whisper-based transcription
  const initializeWhisperTranscription = useCallback(async () => {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Whisper prefers 16kHz
        } 
      });
      
      console.log('Microphone access granted, stream tracks:', stream.getTracks().length);
      streamRef.current = stream;
      
      console.log('Creating MediaRecorder...');
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      console.log('MediaRecorder created successfully');
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('MediaRecorder data available, size:', event.data.size);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped, chunks count:', chunksRef.current.length);
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          console.log('Created audio blob, size:', audioBlob.size);
          await processAudioChunk(audioBlob);
          chunksRef.current = [];
        }
      };
      
      return true;
    } catch (err) {
      console.error('Failed to initialize Whisper transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      return false;
    }
  }, []);

  // Process audio chunk with Whisper
  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    try {
      console.log('Processing audio chunk with Whisper, blob size:', audioBlob.size);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'chunk.webm');
      formData.append('language', language);

      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Whisper transcription result:', result);
      
      if (result.text) {
        const chunk: TranscriptionChunk = {
          text: result.text,
          isFinal: true,
          timestamp: new Date().toISOString(),
          confidence: result.confidence
        };
        
        console.log('Adding transcription chunk:', chunk);
        setTranscriptionChunks(prev => [...prev, chunk]);
        setCurrentTranscript(prev => prev + ' ' + result.text);
      }
    } catch (err) {
      console.error('Whisper transcription error:', err);
      setError(err instanceof Error ? err.message : 'Transcription failed');
    }
  }, [language]);

  // Start transcription
  const startTranscription = useCallback(async () => {
    try {
      console.log('Starting transcription with config:', { useWhisper, chunkDuration, language });
      setError(null);
      setIsTranscribing(true);
      setCurrentTranscript('');
      setTranscriptionChunks([]);

      if (useWhisper) {
        console.log('Starting Whisper transcription with chunk duration:', chunkDuration);
        const success = await initializeWhisperTranscription();
        if (success && mediaRecorderRef.current) {
          console.log('MediaRecorder started successfully');
          mediaRecorderRef.current.start(chunkDuration);
          lastChunkTimeRef.current = Date.now();
          
          // Set up periodic chunking
          chunkTimerRef.current = setInterval(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              console.log('Stopping and restarting MediaRecorder for new chunk');
              mediaRecorderRef.current.stop();
              mediaRecorderRef.current.start(chunkDuration);
            }
          }, chunkDuration);
        } else {
          console.error('Failed to initialize Whisper transcription');
        }
      } else {
        const success = initializeSpeechRecognition();
        if (success && recognitionRef.current) {
          recognitionRef.current.start();
        } else {
          throw new Error('Speech recognition not supported. Please enable Whisper mode.');
        }
      }
    } catch (err) {
      console.error('Failed to start transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to start transcription');
      setIsTranscribing(false);
    }
  }, [useWhisper, chunkDuration, initializeWhisperTranscription, initializeSpeechRecognition]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    setIsTranscribing(false);
    setIsListening(false);

    if (useWhisper) {
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [useWhisper]);

  // Reset transcription
  const resetTranscription = useCallback(() => {
    stopTranscription();
    setCurrentTranscript('');
    setTranscriptionChunks([]);
    setError(null);
  }, [stopTranscription]);

  // Get the latest transcription chunk
  const getLatestChunk = useCallback(() => {
    return transcriptionChunks[transcriptionChunks.length - 1];
  }, [transcriptionChunks]);

  // Get all final chunks
  const getFinalChunks = useCallback(() => {
    return transcriptionChunks.filter(chunk => chunk.isFinal);
  }, [transcriptionChunks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  return {
    // State
    isTranscribing,
    isListening,
    isPaused,
    currentTranscript,
    transcriptionChunks,
    error,
    
    // Actions
    startTranscription,
    stopTranscription,
    resetTranscription,
    pauseTranscription,
    resumeTranscription,
    
    // Utilities
    getLatestChunk,
    getFinalChunks,
  };
} 