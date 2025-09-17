class FocusManager {
  private subscribers = new Map<string, () => Promise<void> | void>()
  private lastFocusTime = 0
  private debounceTimer: NodeJS.Timeout | null = null
  private isInitialized = false
  private isExecuting = false
  private MIN_FOCUS_INTERVAL = 5000 // 5 seconds minimum between focus refreshes

  init() {
    if (this.isInitialized || typeof window === 'undefined') return
    
    window.addEventListener('focus', this.handleFocus.bind(this))
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    this.isInitialized = true
    
    console.log('🎯 FocusManager: Initialized global focus management')
  }

  private handleFocus() {
    const now = Date.now()
    
    // Prevent rapid-fire focus events (5 second cooldown)
    if (now - this.lastFocusTime < this.MIN_FOCUS_INTERVAL) {
      console.log('🎯 FocusManager: Focus event ignored (too recent)')
      return
    }
    
    this.lastFocusTime = now
    console.log('🎯 FocusManager: Focus event triggered, debouncing...')
    this.debouncedRefresh()
  }

  private handleVisibilityChange() {
    if (!document.hidden) {
      const now = Date.now()
      
      // Check cooldown for visibility change too
      if (now - this.lastFocusTime < this.MIN_FOCUS_INTERVAL) {
        console.log('🎯 FocusManager: Visibility change ignored (too recent)')
        return
      }
      
      this.lastFocusTime = now
      console.log('🎯 FocusManager: Visibility change event triggered, debouncing...')
      this.debouncedRefresh()
    }
  }

  private debouncedRefresh() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Shorter debounce since we have cooldown protection
    this.debounceTimer = setTimeout(() => {
      this.executeSubscribersSequentially()
    }, 100)
  }

  private async executeSubscribersSequentially() {
    if (this.isExecuting) {
      console.log('🎯 FocusManager: Already executing, skipping...')
      return
    }

    if (this.subscribers.size === 0) {
      console.log('🎯 FocusManager: No subscribers to execute')
      return
    }

    this.isExecuting = true
    console.log(`🎯 FocusManager: Executing ${this.subscribers.size} subscribers...`)

    for (const [key, callback] of this.subscribers) {
      try {
        console.log(`🎯 FocusManager: Executing ${key}...`)
        await callback()
        // Small delay between each callback to prevent cascade
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`🎯 FocusManager: Error in callback ${key}:`, error)
      }
    }

    this.isExecuting = false
    console.log('🎯 FocusManager: All subscribers executed')
  }

  subscribe(key: string, callback: () => Promise<void> | void) {
    this.subscribers.set(key, callback)
    console.log(`🎯 FocusManager: Subscribed ${key} (${this.subscribers.size} total)`)
  }

  unsubscribe(key: string) {
    const removed = this.subscribers.delete(key)
    if (removed) {
      console.log(`🎯 FocusManager: Unsubscribed ${key} (${this.subscribers.size} remaining)`)
    }
  }

  cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.handleFocus.bind(this))
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
    this.subscribers.clear()
    this.isInitialized = false
    console.log('🎯 FocusManager: Cleaned up')
  }
}

export const focusManager = new FocusManager() 