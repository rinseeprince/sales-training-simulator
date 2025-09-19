/**
 * Utility functions for managing Supabase connections
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Creates a fresh Supabase client instance
 * Useful when the existing connection might be stale
 */
export function createFreshSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  })
}

/**
 * Executes a Supabase query with timeout and retry logic
 * @param queryFn Function that returns a Supabase query
 * @param timeoutMs Timeout in milliseconds (default 5000)
 * @param retries Number of retries (default 1)
 */
export async function executeWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 5000,
  retries: number = 1
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
      })
      
      const result = await Promise.race([
        queryFn(),
        timeoutPromise
      ])
      
      return result
    } catch (error) {
      console.log(`[SupabaseUtils] Attempt ${attempt + 1} failed:`, error)
      
      if (attempt === retries) {
        throw error
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  throw new Error('All retries exhausted')
} 