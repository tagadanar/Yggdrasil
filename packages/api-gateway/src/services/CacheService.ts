// Path: packages/api-gateway/src/services/CacheService.ts
import { CacheConfig } from '../types/gateway';

interface CacheEntry {
  data: any;
  timestamp: Date;
  lastAccessed: Date;
  ttl: number;
  hits: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: CacheConfig) {
    this.config = config;
    
    if (config.enabled) {
      this.startCleanupInterval();
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  get(key: string): any | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp.getTime();
    
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and last accessed time
    entry.hits++;
    entry.lastAccessed = new Date(Date.now());
    return entry.data;
  }

  set(key: string, data: any, ttl?: number): void {
    if (!this.config.enabled) return;

    const cacheTtl = ttl !== undefined ? ttl : this.config.ttl;
    
    // Handle zero or negative TTL - don't cache
    if (cacheTtl <= 0) {
      return;
    }
    
    // Check cache size limit (only if we're adding a new key)
    if (!this.cache.has(key) && this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const now = new Date(Date.now());
    const entry: CacheEntry = {
      data,
      timestamp: now,
      lastAccessed: now,
      ttl: cacheTtl,
      hits: 0
    };

    this.cache.set(key, entry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    if (!this.config.enabled) return false;
    
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp.getTime();
    
    if (age > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): any {
    let totalHits = 0;
    let totalEntries = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalEntries++;
      totalSize += JSON.stringify(entry.data).length;
    }

    return {
      entries: totalEntries,
      hits: totalHits,
      size: totalSize,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0
    };
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Number.MAX_VALUE;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      const age = now - entry.timestamp.getTime();
      if (age > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  // Public method for testing
  public forceCleanup(): void {
    this.cleanup();
  }

  generateKey(req: any): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Default key generation
    return `${req.method}:${req.url}:${req.get('user-agent') || ''}`;
  }

  shouldCache(req: any, res: any): boolean {
    if (this.config.shouldCache) {
      return this.config.shouldCache(req, res);
    }

    // Default caching logic
    return req.method === 'GET' && res.statusCode === 200;
  }
}