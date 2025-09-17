import { useEffect, useRef } from 'react'
import { focusManager } from '@/lib/focus-manager'

export function useFocusRefresh(key: string, callback: () => Promise<void> | void, enabled: boolean = true) {
  const callbackRef = useRef(callback)
  
  // Update the ref when callback changes, but don't trigger useEffect
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    // Initialize focus manager
    focusManager.init()
    
    // Create a stable wrapper function
    const wrappedCallback = () => callbackRef.current()
    
    // Subscribe to focus events
    focusManager.subscribe(key, wrappedCallback)
    
    return () => {
      focusManager.unsubscribe(key)
    }
  }, [key, enabled]) // Remove callback from dependencies
} 