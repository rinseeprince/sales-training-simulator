import { useState, useRef, useCallback, useEffect } from 'react';

export type StreamingState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'waiting-for-rep';

export interface VoiceChunk {
  type: 'text_chunk' | 'audio_chunk' | 'completion' | 'error' | 'voice_error' | 'speech_synthesis_fallback' | 'text' | 'audio' | 'done';
  content?: string;
  audioUrl?: string;
  chunkId?: number;
  chunkIndex?: number;
  isComplete?: boolean;
  isPartial?: boolean;
  text?: string;
  error?: string;
  fullResponse?: string;
  totalChunks?: number;
  timestamp?: string;
  useSpeechSynthesis?: boolean;
  fallbackReason?: 'credits_exhausted' | 'api_error' | 'no_api_key';
  fallbackToSpeechSynthesis?: boolean;
  reason?: 'credits_exhausted' | 'api_error' | 'no_api_key';
  message?: string;
}

export interface StreamingConfig {
  scenarioPrompt: string;
  persona?: string;
  voiceSettings?: {
    voiceId?: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
}

export interface ConversationMessage {
  role: 'rep' | 'ai';
  content: string;
  timestamp: string;
}

export function useVoiceStreaming() {
  const [streamingState, setStreamingState] = useState<StreamingState>('idle');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentAIText, setCurrentAIText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio playback management
  const audioQueue = useRef<HTMLAudioElement[]>([]);
  const isPlayingAudio = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Audio chunking for large base64 data
  const audioChunks = useRef<string[]>([]);
  
  // SSE connection
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Stop all audio playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    audioQueue.current.forEach(audio => {
      audio.pause();
    });
    audioQueue.current = [];
    isPlayingAudio.current = false;
    
    // Reset audio chunks
    audioChunks.current = [];
    
    // Stop speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    setIsStreaming(false);
    setError(null);
  }, []);

  // Audio playback queue management
  const playNextAudio = useCallback(() => {
    if (audioQueue.current.length === 0) {
      console.log('Audio queue empty, stopping playback');
      isPlayingAudio.current = false;
      setStreamingState('waiting-for-rep');
      // Clear the currentAIText only when audio playback is completely finished
      setCurrentAIText('');
      console.log('Audio playback finished, cleared currentAIText for next conversation');
      return;
    }

    const audio = audioQueue.current.shift()!;
    currentAudioRef.current = audio;
    isPlayingAudio.current = true;

    console.log('Playing audio chunk, queue length remaining:', audioQueue.current.length);

    audio.onended = () => {
      console.log('Audio chunk finished playing');
      playNextAudio();
    };

    audio.onerror = (err) => {
      console.error('Audio playback error:', err);
      playNextAudio();
    };

    audio.play().catch((err) => {
      console.error('Failed to play audio:', err);
      playNextAudio();
    });
  }, []);

  // Add audio to queue and start playback if not already playing
  const queueAudio = useCallback((audioUrl: string) => {
    console.log('Queueing audio for playback:', audioUrl.substring(0, 50) + '...');
    const audio = new Audio(audioUrl);
    audioQueue.current.push(audio);

    if (!isPlayingAudio.current) {
      console.log('Starting audio playback queue');
      playNextAudio();
    }
  }, [playNextAudio]);

  // Process incoming voice chunks
  const processVoiceChunk = useCallback((chunk: VoiceChunk) => {
    console.log('Processing voice chunk:', chunk.type, chunk);
    
    switch (chunk.type) {
      case 'text_chunk':
        if (chunk.content) {
          console.log('Adding text chunk to AI response:', chunk.content);
          setCurrentAIText(prev => prev + chunk.content);
        }
        break;
        
      case 'audio_chunk':
        if (chunk.audioUrl) {
          // Handle chunked audio data for legacy format
          if (chunk.isPartial !== undefined && chunk.chunkIndex !== undefined && chunk.totalChunks !== undefined) {
            // This is a chunked audio message
            if (!audioChunks.current) {
              audioChunks.current = [];
            }
            
            audioChunks.current[chunk.chunkIndex] = chunk.audioUrl.replace('data:audio/mpeg;base64,', '');
            
            // Check if we have all chunks
            if (audioChunks.current.length === chunk.totalChunks) {
              const fullAudioData = audioChunks.current.join('');
              const audioUrl = `data:audio/mpeg;base64,${fullAudioData}`;
              console.log('Received all audio chunks for legacy format, queueing for playback');
              queueAudio(audioUrl);
              audioChunks.current = []; // Reset for next audio
            } else {
              console.log(`Received legacy audio chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks}`);
            }
          } else {
            // Single audio chunk (legacy format)
            console.log('Received ElevenLabs audio chunk, queueing for playback');
            queueAudio(chunk.audioUrl);
          }
        } else if (chunk.text) {
          // Check if we should use speech synthesis (either explicitly flagged or no streaming enabled)
          const shouldUseSpeechSynthesis = chunk.useSpeechSynthesis || 
                                          chunk.fallbackReason === 'credits_exhausted' ||
                                          chunk.fallbackReason === 'api_error';
          
          if (shouldUseSpeechSynthesis) {
            console.log('Using browser speech synthesis as fallback for:', chunk.text);
            if (chunk.fallbackReason === 'credits_exhausted') {
              console.log('Fallback reason: ElevenLabs credits exhausted');
            } else if (chunk.fallbackReason === 'api_error') {
              console.log('Fallback reason: ElevenLabs API error');
            }
            
            // Use browser's speech synthesis as fallback
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(chunk.text);
              utterance.rate = 0.9; // Slightly slower for clarity
              utterance.pitch = 1.0;
              utterance.volume = 0.8;
              speechSynthesis.speak(utterance);
            } else {
              console.warn('Speech synthesis not supported in this browser');
            }
          } else {
            console.log('Audio chunk received but no audioUrl provided and no fallback requested');
          }
        } else {
          console.warn('Audio chunk received but no audioUrl or text provided');
        }
        break;
        
      case 'completion':
        if (chunk.fullResponse) {
          const aiMessage: ConversationMessage = {
            role: 'ai',
            content: chunk.fullResponse,
            timestamp: chunk.timestamp || new Date().toISOString()
          };
          setConversationHistory(prev => [...prev, aiMessage]);
          // Don't clear currentAIText here - keep it for display during audio playback
          console.log('Completion received, keeping currentAIText for display:', chunk.fullResponse);
        }
        setStreamingState('speaking');
        break;
        
      case 'error':
        setError(chunk.error || 'An error occurred during streaming');
        setStreamingState('waiting-for-rep');
        break;
        
      case 'voice_error':
        console.log('Voice error received:', chunk.error);
        
        // Check if we should use speech synthesis fallback
        if (chunk.fallbackToSpeechSynthesis && chunk.text) {
          console.log('Using speech synthesis fallback for:', chunk.text);
          
          // Use browser's speech synthesis as fallback
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(chunk.text);
            utterance.rate = 0.9; // Slightly slower for clarity
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            utterance.onend = () => {
              console.log('Speech synthesis finished');
              setStreamingState('waiting-for-rep');
            };
            
            utterance.onerror = (error) => {
              console.error('Speech synthesis error:', error);
              setStreamingState('waiting-for-rep');
            };
            
            speechSynthesis.speak(utterance);
            setStreamingState('speaking');
            
                    // Add AI message to conversation history
        const aiMessage: ConversationMessage = {
          role: 'ai',
          content: chunk.text,
          timestamp: new Date().toISOString()
        };
        setConversationHistory(prev => [...prev, aiMessage]);
        // Don't clear currentAIText here - keep it for display
        console.log('Voice error fallback, keeping currentAIText for display:', chunk.text);
          } else {
            console.warn('Speech synthesis not supported in this browser');
            setError('Voice generation failed and speech synthesis not available');
            setStreamingState('waiting-for-rep');
          }
        } else {
          setError(chunk.error || 'Voice generation failed');
          setStreamingState('waiting-for-rep');
        }
        break;
        
      case 'speech_synthesis_fallback':
        console.log('Speech synthesis fallback triggered:', chunk.reason, chunk.message);
        
        if (chunk.text && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(chunk.text);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;
          
          utterance.onend = () => {
            console.log('Speech synthesis finished');
            setStreamingState('waiting-for-rep');
          };
          
          utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            setStreamingState('waiting-for-rep');
          };
          
          speechSynthesis.speak(utterance);
          setStreamingState('speaking');
          
          // Add AI message to conversation history
          const aiMessage: ConversationMessage = {
            role: 'ai',
            content: chunk.text,
            timestamp: new Date().toISOString()
          };
          setConversationHistory(prev => [...prev, aiMessage]);
          // Don't clear currentAIText here - keep it for display
          console.log('Speech synthesis fallback, keeping currentAIText for display:', chunk.text);
          
          // Show notification about fallback if credits exhausted
          if (chunk.reason === 'credits_exhausted') {
            console.info('Using speech synthesis: ElevenLabs credits exhausted');
          }
        } else if (!('speechSynthesis' in window)) {
          console.error('Speech synthesis not supported in this browser');
          setError('Voice generation failed and speech synthesis not available');
          setStreamingState('waiting-for-rep');
        }
        break;
        
      case 'text':
        // Handle new compiled-prompt engine text chunks
        if (chunk.content) {
          console.log('Adding text chunk to AI response:', chunk.content);
          setCurrentAIText(prev => prev + chunk.content);
        }
        break;
        
      case 'audio':
        // Handle new compiled-prompt engine audio chunks
        if (chunk.content) {
          // Handle chunked audio data
          if (chunk.isPartial !== undefined && chunk.chunkIndex !== undefined && chunk.totalChunks !== undefined) {
            // This is a chunked audio message
            if (!audioChunks.current) {
              audioChunks.current = [];
            }
            
            audioChunks.current[chunk.chunkIndex] = chunk.content;
            
            // Check if we have all chunks
            if (audioChunks.current.length === chunk.totalChunks) {
              const fullAudioData = audioChunks.current.join('');
              const audioUrl = `data:audio/mpeg;base64,${fullAudioData}`;
              console.log('Received all audio chunks, queueing for playback');
              queueAudio(audioUrl);
              audioChunks.current = []; // Reset for next audio
            } else {
              console.log(`Received audio chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks}`);
            }
          } else {
            // Single audio chunk (legacy format)
            const audioUrl = `data:audio/mpeg;base64,${chunk.content}`;
            console.log('Received single audio chunk, queueing for playback');
            queueAudio(audioUrl);
          }
        }
        break;
        
      case 'done':
        // Handle new compiled-prompt engine completion
        console.log('Stream completed');
        if (currentAIText) {
          const aiMessage: ConversationMessage = {
            role: 'ai',
            content: currentAIText,
            timestamp: new Date().toISOString()
          };
          setConversationHistory(prev => [...prev, aiMessage]);
          // Don't clear currentAIText here - keep it for display during audio playback
          console.log('Done received, keeping currentAIText for display:', currentAIText);
        }
        setStreamingState('speaking');
        break;
    }
  }, [queueAudio, currentAIText]);

  // Start streaming conversation
  const startStreaming = useCallback(async (transcript: string, config: StreamingConfig) => {
    try {
      setError(null);
      setStreamingState('transcribing');
      setIsStreaming(true);
      
      // Clear previous AI text when starting new conversation
      setCurrentAIText('');
      console.log('Starting new conversation, cleared currentAIText');

      // Prepare the updated conversation history with the new message
      const newMessage: ConversationMessage = {
        role: 'rep' as const, // Use 'rep' for consistency with our interface
        content: transcript,
        timestamp: new Date().toISOString()
      };
      
      const updatedHistory = [...conversationHistory, newMessage];
      
      // Update conversation history state
      setConversationHistory(updatedHistory);

      // Prepare request body with the UPDATED conversation history
      const requestBody = {
        transcript,
        scenarioPrompt: config.scenarioPrompt,
        persona: config.persona,
        voiceSettings: config.voiceSettings,
        conversationHistory: updatedHistory.slice(-10) // Keep last 10 messages for context INCLUDING the current one
      };

      console.log('Starting streaming with request:', requestBody);
      console.log('Updated conversation history:', updatedHistory);

      // Create EventSource for SSE - using updated API that prioritizes user prompts
      const response = await fetch('/api/stream-gpt-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Streaming response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Streaming API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      // Set up SSE reader
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      setStreamingState('thinking');
      console.log('Starting to read streaming response...');

      // Buffer for incomplete SSE data
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Streaming completed');
          break;
        }

        const chunk = decoder.decode(value);
        buffer += chunk;
        
        // Split by lines and process complete lines
        const lines = buffer.split('\n');
        
        // Keep the last line in buffer if it's incomplete
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = line.slice(6);
              const data = JSON.parse(jsonData);
              console.log('Processing voice chunk:', data);
              processVoiceChunk(data);
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
              console.error('Problematic line:', line);
              console.error('JSON data length:', line.slice(6).length);
              
              // Try to log a truncated version for debugging
              const jsonData = line.slice(6);
              if (jsonData.length > 100) {
                console.error('JSON data (first 100 chars):', jsonData.substring(0, 100));
                console.error('JSON data (last 100 chars):', jsonData.substring(jsonData.length - 100));
              } else {
                console.error('JSON data:', jsonData);
              }
            }
          }
        }
      }

    } catch (err) {
      console.error('Streaming error:', err);
      setError(err instanceof Error ? err.message : 'Streaming failed');
      setStreamingState('waiting-for-rep');
    } finally {
      setIsStreaming(false);
    }
  }, [conversationHistory, processVoiceChunk]);

  // Stop streaming and cleanup
  const stopStreaming = useCallback(() => {
    cleanup();
    setStreamingState('idle');
    setCurrentAIText('');
    
    // Ensure speech synthesis is stopped
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }, [cleanup]);

  // Check if AI is currently speaking
  const isAISpeaking = streamingState === 'speaking' || isPlayingAudio.current;

  // Check if rep can speak (not during AI speech)
  const canRepSpeak = streamingState === 'waiting-for-rep' || streamingState === 'idle';

  // Reset conversation
  const resetConversation = useCallback(() => {
    cleanup();
    setConversationHistory([]);
    setCurrentAIText('');
    setStreamingState('idle');
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    streamingState,
    conversationHistory,
    currentAIText,
    isStreaming,
    error,
    isAISpeaking,
    canRepSpeak,
    
    // Actions
    startStreaming,
    stopStreaming,
    resetConversation,
    
    // Utility
    cleanup
  };
} 