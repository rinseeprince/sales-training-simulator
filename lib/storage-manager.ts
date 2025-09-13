/**
 * Storage manager to prevent localStorage/sessionStorage conflicts and race conditions
 */
class StorageManager {
  private locks: Set<string> = new Set();

  /**
   * Safely get item from localStorage with error handling
   */
  getItem(key: string, storage: Storage = localStorage): string | null {
    try {
      return storage.getItem(key);
    } catch (error) {
      console.error(`Failed to get item "${key}" from storage:`, error);
      return null;
    }
  }

  /**
   * Safely set item in localStorage with error handling and locking
   */
  async setItem(key: string, value: string, storage: Storage = localStorage): Promise<boolean> {
    // Wait for any existing operations on this key to complete
    while (this.locks.has(key)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.locks.add(key);
    
    try {
      storage.setItem(key, value);
      console.log(`✅ Storage: Successfully set "${key}"`);
      return true;
    } catch (error) {
      console.error(`❌ Storage: Failed to set "${key}":`, error);
      return false;
    } finally {
      this.locks.delete(key);
    }
  }

  /**
   * Safely remove item from localStorage with error handling and locking
   */
  async removeItem(key: string, storage: Storage = localStorage): Promise<boolean> {
    // Wait for any existing operations on this key to complete
    while (this.locks.has(key)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.locks.add(key);
    
    try {
      storage.removeItem(key);
      console.log(`✅ Storage: Successfully removed "${key}"`);
      return true;
    } catch (error) {
      console.error(`❌ Storage: Failed to remove "${key}":`, error);
      return false;
    } finally {
      this.locks.delete(key);
    }
  }

  /**
   * Get and parse JSON from storage
   */
  getJSON<T>(key: string, storage: Storage = localStorage): T | null {
    const item = this.getItem(key, storage);
    if (!item) return null;
    
    try {
      return JSON.parse(item);
    } catch (error) {
      console.error(`Failed to parse JSON for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set JSON in storage
   */
  async setJSON<T>(key: string, value: T, storage: Storage = localStorage): Promise<boolean> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.setItem(key, jsonString, storage);
    } catch (error) {
      console.error(`Failed to stringify value for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Check if a key exists in storage
   */
  hasItem(key: string, storage: Storage = localStorage): boolean {
    return this.getItem(key, storage) !== null;
  }

  /**
   * Clear all locks (useful for cleanup)
   */
  clearLocks(): void {
    this.locks.clear();
  }
}

// Global instance
export const storageManager = new StorageManager();

/**
 * Hook for using storage manager in React components
 */
export function useStorageManager() {
  return storageManager;
} 