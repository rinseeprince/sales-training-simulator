/**
 * Loading state manager to prevent race conditions and duplicate requests
 */
class LoadingManager {
  private loadingStates = new Map<string, boolean>()
  private listeners = new Map<string, Set<(loading: boolean) => void>>()
  private lastRequestTimes = new Map<string, number>()
  private CACHE_DURATION = 1000 // Reduced to 1 second to prevent stale data

  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false
  }

  isRecentlyCompleted(key: string): boolean {
    const lastTime = this.lastRequestTimes.get(key)
    if (!lastTime) return false
    
    const timeSinceLastRequest = Date.now() - lastTime
    return timeSinceLastRequest < this.CACHE_DURATION
  }

  setLoading(key: string, loading: boolean) {
    // console.log(`LoadingManager: ${key} = ${loading}`)
    this.loadingStates.set(key, loading)
    
    if (!loading) {
      // Mark completion time
      this.lastRequestTimes.set(key, Date.now())
    }
    
    const listeners = this.listeners.get(key)
    if (listeners) {
      listeners.forEach(listener => listener(loading))
    }
  }

  subscribe(key: string, listener: (loading: boolean) => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(listener)
    
    // Immediately call with current state
    listener(this.isLoading(key))
  }

  unsubscribe(key: string, listener: (loading: boolean) => void) {
    this.listeners.get(key)?.delete(listener)
  }

  async withLoading<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if we recently completed this request (within 1 second)
    if (this.isRecentlyCompleted(key)) {
      console.log(`LoadingManager: Skipping ${key} (recently completed)`)
      return Promise.resolve({} as T)
    }
    
    // Check if already loading
    if (this.isLoading(key)) {
      console.log(`LoadingManager: Already loading ${key}`)
      return Promise.resolve({} as T)
    }
    
    this.setLoading(key, true)
    try {
      const result = await fn()
      return result
    } finally {
      this.setLoading(key, false)
    }
  }

  reset() {
    this.loadingStates.clear()
    this.listeners.clear()
    this.lastRequestTimes.clear()
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