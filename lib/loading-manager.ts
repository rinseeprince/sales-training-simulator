/**
 * Loading state manager to prevent race conditions and duplicate requests
 */
class LoadingManager {
  private loadingStates: Map<string, boolean> = new Map();
  private pendingPromises: Map<string, Promise<any>> = new Map();

  /**
   * Check if a request is currently loading
   */
  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  /**
   * Execute a function with loading state management
   * If the same key is already loading, return the existing promise
   */
  async withLoading<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // If already loading, return the existing promise
    if (this.isLoading(key)) {
      const existingPromise = this.pendingPromises.get(key);
      if (existingPromise) {
        console.log(`⏳ Request "${key}" already in progress, waiting for existing request...`);
        return existingPromise;
      }
    }

    // Set loading state
    this.loadingStates.set(key, true);
    
    // Create and store the promise
    const promise = fn().finally(() => {
      this.loadingStates.set(key, false);
      this.pendingPromises.delete(key);
    });
    
    this.pendingPromises.set(key, promise);
    
    try {
      const result = await promise;
      console.log(`✅ Request "${key}" completed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Request "${key}" failed:`, error);
      throw error;
    }
  }

  /**
   * Clear loading state for a specific key
   */
  clearLoading(key: string): void {
    this.loadingStates.delete(key);
    this.pendingPromises.delete(key);
  }

  /**
   * Clear all loading states
   */
  clearAll(): void {
    this.loadingStates.clear();
    this.pendingPromises.clear();
  }
}

// Global instance
export const loadingManager = new LoadingManager();

/**
 * Hook for using loading manager in React components
 */
export function useLoadingManager() {
  return loadingManager;
} 