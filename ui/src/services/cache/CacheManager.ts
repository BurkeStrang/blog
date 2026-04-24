/**
 * Advanced Client-Side Cache Manager
 * Supports multiple cache layers with different TTLs and strategies
 */

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  size?: number;
}

export interface CacheStats {
  totalEntries: number;
  memoryUsage: number; // Approximate bytes
  hitRate: number;
  totalHits: number;
  totalMisses: number;
}

export interface CacheConfig {
  maxSize?: number; // Max entries
  maxMemory?: number; // Max memory in bytes (approximate)
  defaultTTL?: number; // Default TTL in ms
  enableCompression?: boolean;
  persistToLocalStorage?: boolean;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  
  private readonly config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: 100,
      maxMemory: 50 * 1024 * 1024, // 50MB
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      enableCompression: false,
      persistToLocalStorage: false,
      ...config
    };

    // Load from localStorage if enabled
    if (this.config.persistToLocalStorage) {
      this.loadFromStorage();
    }

    // Start cleanup interval
    this.startCleanup();
  }

  // Get item from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  // Set item in cache
  set<T>(key: string, data: T, ttl?: number, etag?: string): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      etag,
      size: this.estimateSize(data)
    };

    // Check memory limits before adding
    if (this.shouldEvict(entry)) {
      this.evictLRU();
    }

    this.cache.set(key, entry);

    // Persist to localStorage if enabled
    if (this.config.persistToLocalStorage) {
      this.saveToStorage(key, entry);
    }
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Delete specific key
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    
    if (this.config.persistToLocalStorage) {
      this.removeFromStorage(key);
    }
    
    return result;
  }

  // Clear all cache
  clear(): void {
    try {
      this.cache.clear();
      this.stats = { hits: 0, misses: 0, evictions: 0 };
      
      if (this.config.persistToLocalStorage) {
        this.clearStorage();
      }
    } catch (error) {
      console.error('Error in cache clear:', error);
      throw error;
    }
  }

  // Invalidate by pattern (supports wildcards)
  invalidate(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }
    
    return count;
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    return {
      totalEntries: this.cache.size,
      memoryUsage: this.getMemoryUsage(),
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses
    };
  }

  // Estimate memory usage
  private getMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size || 0;
    }
    return total;
  }

  // Estimate size of data
  private estimateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 1024; // Default 1KB if estimation fails
    }
  }

  // Check if we should evict items
  private shouldEvict(newEntry: CacheEntry): boolean {
    return (
      this.cache.size >= this.config.maxSize ||
      this.getMemoryUsage() + (newEntry.size || 0) > this.config.maxMemory
    );
  }

  // Evict least recently used items
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  // Start cleanup interval
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
    }, 60000); // Cleanup every minute
  }

  // localStorage persistence methods
  private getStorageKey(key: string): string {
    return `cache:${key}`;
  }

  private saveToStorage(key: string, entry: CacheEntry): void {
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  private removeFromStorage(key: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(key));
    } catch (error) {
      console.warn('Failed to remove cache from localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache:')) {
          const cacheKey = key.replace('cache:', '');
          const data = localStorage.getItem(key);
          if (data) {
            const entry = JSON.parse(data) as CacheEntry;
            // Only load if not expired
            if (Date.now() - entry.timestamp <= entry.ttl) {
              this.cache.set(cacheKey, entry);
            } else {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  private clearStorage(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache:')) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Failed to clear cache from localStorage:', error);
    }
  }
}

// Specialized cache managers for different data types
export const postsCache = new CacheManager({
  maxSize: 50,
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  persistToLocalStorage: true
});

export const analyticsCache = new CacheManager({
  maxSize: 20,
  defaultTTL: 2 * 60 * 1000, // 2 minutes
  persistToLocalStorage: false
});

export const assetsCache = new CacheManager({
  maxSize: 100,
  defaultTTL: 60 * 60 * 1000, // 1 hour
  maxMemory: 100 * 1024 * 1024, // 100MB
  persistToLocalStorage: true
});

// Non-React cache operations to avoid hook conflicts
const clearAnalyticsCache = () => analyticsCache.clear();
const clearPostsCache = () => postsCache.clear();
const clearAssetsCache = () => assetsCache.clear();
const invalidatePostsPattern = (pattern: string) => postsCache.invalidate(pattern);

// Simple deferred execution to avoid React hook conflicts
const deferExecution = (fn: () => void) => {
  // Use multiple setTimeout calls to ensure execution is completely async
  setTimeout(() => {
    setTimeout(() => {
      try {
        fn();
      } catch (error) {
        console.error('Cache operation error:', error);
      }
    }, 0);
  }, 0);
};

// Cache invalidation strategies
export const cacheInvalidation = {
  // Invalidate post-related caches when posts are modified
  invalidatePostCaches: () => {
    deferExecution(() => {
      invalidatePostsPattern('posts*');
      clearAnalyticsCache();
    });
  },

  // Invalidate analytics when view counts change
  invalidateAnalytics: () => {
    deferExecution(clearAnalyticsCache);
  },

  // Smart invalidation based on data type
  invalidateByType: (type: 'posts' | 'analytics' | 'assets') => {
    deferExecution(() => {
      switch (type) {
        case 'posts':
          clearPostsCache();
          break;
        case 'analytics':
          clearAnalyticsCache();
          break;
        case 'assets':
          clearAssetsCache();
          break;
      }
    });
  }
};