// packages/shared-utilities/src/cache/cache.ts
export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  max?: number; // Maximum number of entries
}

export class Cache {
  private data = new Map<string, { value: any; expiry: number }>();
  private readonly ttl: number;
  private readonly max: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 60000; // Default 1 minute
    this.max = options.max || 1000; // Default 1000 entries
  }

  get<T>(key: string): T | null {
    const item = this.data.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.data.delete(key);
      return null;
    }

    return item.value;
  }

  set<T>(key: string, value: T, customTTL?: number): void {
    const ttl = customTTL !== undefined ? customTTL : this.ttl;

    // Handle zero TTL as immediate expiration
    if (ttl === 0) {
      return; // Don't store items with zero TTL
    }

    const expiry = Date.now() + ttl;

    // Remove oldest entry if at capacity
    if (this.data.size >= this.max) {
      const firstKey = this.data.keys().next().value;
      if (firstKey) {
        this.data.delete(firstKey);
      }
    }

    this.data.set(key, { value, expiry });
  }

  delete(key: string): boolean {
    return this.data.delete(key);
  }

  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    // Collect matching keys first to avoid iterator issues
    const keysToDelete: string[] = [];
    for (const key of this.data.keys()) {
      if (key && regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    // Delete the collected keys
    for (const key of keysToDelete) {
      if (this.data.delete(key)) {
        deleted++;
      }
    }

    return deleted;
  }

  clear(): void {
    this.data.clear();
  }

  size(): number {
    return this.data.size;
  }

  // Clean up expired entries
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, item] of this.data.entries()) {
      if (now > item.expiry) {
        this.data.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}
