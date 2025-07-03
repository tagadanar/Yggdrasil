// Path: packages/api-gateway/src/services/CacheService.ts
import { CacheConfig } from '../types/gateway';

interface CacheEntry {
  data: any;
  timestamp: Date;
  ttl: number;
  hits: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    
    if (config.enabled) {
      this.startCleanupInterval();
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

    // Update hit count
    entry.hits++;
    return entry.data;
  }

  set(key: string, data: any, ttl?: number): void {
    if (!this.config.enabled) return;

    const cacheTtl = ttl || this.config.ttl;
    
    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      data,
      timestamp: new Date(),
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
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp.getTime() < oldestTime) {
        oldestTime = entry.timestamp.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
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