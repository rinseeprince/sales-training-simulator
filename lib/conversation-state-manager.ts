// Conversation State Manager
// Manages AI Prospect Engine states for push-to-talk conversations
// Uses in-memory storage with database persistence fallback

import { AIProspectEngine } from '@/lib/ai-engine/core/prospect-engine';
import { AIProspectConfig } from '@/lib/ai-engine/types/prospect-types';
import { TranscriptEntry } from '@/lib/types';

export interface ConversationStateData {
  callId: string;
  userId: string;
  engineState: string; // Serialized AI engine state
  lastActivity: number;
  conversationHistory: TranscriptEntry[];
  scenarioConfig: Record<string, unknown>;
  createdAt: number;
}

class ConversationStateManager {
  private conversations = new Map<string, AIProspectEngine>();
  private stateData = new Map<string, ConversationStateData>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  // Get or create AI Prospect Engine for a conversation
  async getOrCreateEngine(
    callId: string, 
    userId: string, 
    config: AIProspectConfig,
    conversationHistory: TranscriptEntry[] = []
  ): Promise<AIProspectEngine> {
    
    // Check if engine exists in memory
    if (this.conversations.has(callId)) {
      console.log('Retrieved existing AIProspectEngine from memory:', callId);
      this.updateActivity(callId);
      return this.conversations.get(callId)!;
    }

    // Try to restore from persisted state
    const restoredEngine = await this.restoreFromPersistence(callId, userId);
    if (restoredEngine) {
      console.log('Restored AIProspectEngine from persistence:', callId);
      this.conversations.set(callId, restoredEngine);
      this.updateActivity(callId);
      return restoredEngine;
    }

    // Create new engine
    console.log('Creating new AIProspectEngine:', callId);
    const engine = new AIProspectEngine(config);
    
    // Store in memory
    this.conversations.set(callId, engine);
    
    // Store state data
    this.stateData.set(callId, {
      callId,
      userId,
      engineState: JSON.stringify(this.serializeEngine(engine)),
      lastActivity: Date.now(),
      conversationHistory,
      scenarioConfig: config,
      createdAt: Date.now()
    });

    console.log('New AIProspectEngine created and stored:', callId);
    return engine;
  }

  // Update engine state after each interaction
  updateEngineState(callId: string, engine: AIProspectEngine): void {
    if (!this.stateData.has(callId)) {
      console.warn('Attempted to update non-existent conversation state:', callId);
      return;
    }

    const stateData = this.stateData.get(callId)!;
    stateData.engineState = JSON.stringify(this.serializeEngine(engine));
    stateData.lastActivity = Date.now();
    
    this.stateData.set(callId, stateData);
    
    // Persist to database periodically (every few updates)
    if (Math.random() < 0.2) { // 20% chance to persist
      this.persistToDatabase(callId).catch(error => 
        console.error('Failed to persist conversation state:', error)
      );
    }
  }

  // Update last activity timestamp
  private updateActivity(callId: string): void {
    const stateData = this.stateData.get(callId);
    if (stateData) {
      stateData.lastActivity = Date.now();
      this.stateData.set(callId, stateData);
    }
  }

  // Serialize engine state for storage
  private serializeEngine(engine: AIProspectEngine): Record<string, unknown> {
    const conversationState = engine.getConversationState();
    const memory = engine.getMemory();
    
    return {
      conversationState,
      memory,
      timestamp: Date.now()
    };
  }

  // Deserialize engine state from storage
  private deserializeEngine(
    config: AIProspectConfig, 
    serializedState: Record<string, unknown>
  ): AIProspectEngine {
    const engine = new AIProspectEngine(config);
    
    // Restore state (this would require modifications to AIProspectEngine)
    // For now, we'll create a new engine and rely on conversation history
    // In a full implementation, AIProspectEngine would need restore methods
    
    console.log('Deserialized engine state (partial restoration):', {
      phase: serializedState.conversationState?.currentPhase,
      rapportLevel: serializedState.conversationState?.rapportLevel,
      memoryItems: serializedState.memory?.conversationHistory?.length || 0
    });
    
    return engine;
  }

  // Try to restore engine from database persistence
  private async restoreFromPersistence(callId: string, _userId: string): Promise<AIProspectEngine | null> {
    try {
      // In a real implementation, this would query your database
      // For now, we'll simulate with local storage fallback
      
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(`conversation_state_${callId}`);
        if (stored) {
          const data = JSON.parse(stored) as ConversationStateData;
          
          // Check if state is not too old (1 hour max)
          if (Date.now() - data.lastActivity < 60 * 60 * 1000) {
            const engineState = JSON.parse(data.engineState);
            const restoredEngine = this.deserializeEngine(data.scenarioConfig, engineState);
            
            // Restore state data to memory
            this.stateData.set(callId, data);
            
            return restoredEngine;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to restore from persistence:', error);
      return null;
    }
  }

  // Persist conversation state to database
  private async persistToDatabase(callId: string): Promise<void> {
    const stateData = this.stateData.get(callId);
    if (!stateData) return;

    try {
      // In a real implementation, this would save to your database
      // For now, we'll use session storage as fallback
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`conversation_state_${callId}`, JSON.stringify(stateData));
        console.log('Persisted conversation state to session storage:', callId);
      }
      
      // Could also make API call to save to database
      // await fetch('/api/save-conversation-state', { method: 'POST', body: JSON.stringify(stateData) });
      
    } catch (error) {
      console.error('Failed to persist to database:', error);
    }
  }

  // Clean up old conversation states
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    let cleanedCount = 0;
    
    for (const [callId, stateData] of this.stateData.entries()) {
      if (now - stateData.lastActivity > maxAge) {
        // Persist before cleanup
        this.persistToDatabase(callId).catch(console.error);
        
        // Remove from memory
        this.conversations.delete(callId);
        this.stateData.delete(callId);
        cleanedCount++;
        
        console.log('Cleaned up old conversation state:', callId);
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old conversation states`);
    }
  }

  // Start periodic cleanup
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clean up every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30 * 60 * 1000);
  }

  // Stop cleanup (for testing or shutdown)
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Force cleanup of specific conversation
  forceCleanup(callId: string): void {
    this.persistToDatabase(callId).catch(console.error);
    this.conversations.delete(callId);
    this.stateData.delete(callId);
    console.log('Force cleaned conversation:', callId);
  }

  // Get statistics
  getStats(): { active: number; totalMemory: number } {
    return {
      active: this.conversations.size,
      totalMemory: this.stateData.size
    };
  }
}

// Singleton instance
let conversationStateManager: ConversationStateManager | null = null;

export function getConversationStateManager(): ConversationStateManager {
  if (!conversationStateManager) {
    conversationStateManager = new ConversationStateManager();
  }
  return conversationStateManager;
}