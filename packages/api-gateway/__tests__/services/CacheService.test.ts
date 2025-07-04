import { CacheService } from '../../src/services/CacheService';
import { CacheConfig } from '../../src/types/gateway';

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockConfig: CacheConfig;
  let createdServices: CacheService[] = [];

  // Helper function to create and track CacheService instances
  const createCacheService = (config: CacheConfig): CacheService => {
    const service = new CacheService(config);
    createdServices.push(service);
    return service;
  };

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      ttl: 60000, // 1 minute
      maxSize: 100,
      keyGenerator: undefined,
      shouldCache: undefined
    };
    cacheService = createCacheService(mockConfig);
  });

  afterEach(() => {
    // Clear any timers and cleanup ALL CacheService instances
    jest.clearAllTimers();
    createdServices.forEach(service => {
      if (service && service.destroy) {
        service.destroy();
      }
    });
    createdServices = [];
  });

  describe('Constructor', () => {
    it('should initialize with provided config', () => {
      const config: CacheConfig = {
        enabled: true,
        ttl: 30000,
        maxSize: 50
      };
      
      const service = createCacheService(config);
      expect(service).toBeInstanceOf(CacheService);
    });

    it('should not start cleanup interval when disabled', () => {
      const spySetInterval = jest.spyOn(global, 'setInterval');
      const config: CacheConfig = {
        enabled: false,
        ttl: 60000,
        maxSize: 100
      };
      
      createCacheService(config);
      expect(spySetInterval).not.toHaveBeenCalled();
      
      spySetInterval.mockRestore();
    });

    it('should start cleanup interval when enabled', () => {
      const spySetInterval = jest.spyOn(global, 'setInterval');
      const config: CacheConfig = {
        enabled: true,
        ttl: 60000,
        maxSize: 100
      };
      
      createCacheService(config);
      expect(spySetInterval).toHaveBeenCalledWith(expect.any(Function), 60000);
      
      spySetInterval.mockRestore();
    });
  });

  describe('Basic Operations', () => {
    describe('set and get', () => {
      it('should store and retrieve data', () => {
        const testData = { message: 'Hello World' };
        cacheService.set('test-key', testData);
        
        const retrieved = cacheService.get('test-key');
        expect(retrieved).toEqual(testData);
      });

      it('should return null for non-existent key', () => {
        const result = cacheService.get('non-existent');
        expect(result).toBeNull();
      });

      it('should not store data when cache is disabled', () => {
        const disabledConfig: CacheConfig = { ...mockConfig, enabled: false };
        const disabledCache = createCacheService(disabledConfig);
        
        disabledCache.set('key', 'value');
        const result = disabledCache.get('key');
        
        expect(result).toBeNull();
      });

      it('should return null when cache is disabled', () => {
        cacheService.set('key', 'value'); // Store when enabled
        
        const disabledConfig: CacheConfig = { ...mockConfig, enabled: false };
        const disabledCache = createCacheService(disabledConfig);
        
        const result = disabledCache.get('key');
        expect(result).toBeNull();
      });
    });

    describe('TTL (Time To Live)', () => {
      it('should respect custom TTL for individual entries', () => {
        const customTtl = 30000; // 30 seconds
        cacheService.set('key1', 'value1', customTtl);
        cacheService.set('key2', 'value2'); // Uses default TTL
        
        // Simulate time passage
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 45000); // 45 seconds later
        
        expect(cacheService.get('key1')).toBeNull(); // Should be expired
        expect(cacheService.get('key2')).toBe('value2'); // Should still be valid
        
        jest.restoreAllMocks();
      });

      it('should expire entries after TTL', () => {
        cacheService.set('test-key', 'test-value');
        
        // Initially should be available
        expect(cacheService.get('test-key')).toBe('test-value');
        
        // Mock time passage beyond TTL
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 70000); // 70 seconds
        
        const result = cacheService.get('test-key');
        expect(result).toBeNull();
        
        jest.restoreAllMocks();
      });

      it('should clean up expired entries on access', () => {
        cacheService.set('test-key', 'test-value');
        expect(cacheService.size()).toBe(1);
        
        // Mock time passage
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 70000);
        
        // Access should trigger cleanup
        cacheService.get('test-key');
        expect(cacheService.size()).toBe(0);
        
        jest.restoreAllMocks();
      });
    });

    describe('delete', () => {
      it('should delete existing entry', () => {
        cacheService.set('key', 'value');
        expect(cacheService.has('key')).toBe(true);
        
        const deleted = cacheService.delete('key');
        expect(deleted).toBe(true);
        expect(cacheService.has('key')).toBe(false);
      });

      it('should return false for non-existent key', () => {
        const deleted = cacheService.delete('non-existent');
        expect(deleted).toBe(false);
      });
    });

    describe('clear', () => {
      it('should clear all entries', () => {
        cacheService.set('key1', 'value1');
        cacheService.set('key2', 'value2');
        cacheService.set('key3', 'value3');
        
        expect(cacheService.size()).toBe(3);
        
        cacheService.clear();
        expect(cacheService.size()).toBe(0);
      });
    });

    describe('has', () => {
      it('should return true for existing non-expired entry', () => {
        cacheService.set('key', 'value');
        expect(cacheService.has('key')).toBe(true);
      });

      it('should return false for non-existent entry', () => {
        expect(cacheService.has('non-existent')).toBe(false);
      });

      it('should return false for expired entry', () => {
        cacheService.set('key', 'value');
        
        // Mock time passage
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 70000);
        
        expect(cacheService.has('key')).toBe(false);
        
        jest.restoreAllMocks();
      });

      it('should return false when cache is disabled', () => {
        const disabledConfig: CacheConfig = { ...mockConfig, enabled: false };
        const disabledCache = createCacheService(disabledConfig);
        
        expect(disabledCache.has('key')).toBe(false);
      });
    });

    describe('size', () => {
      it('should return correct cache size', () => {
        expect(cacheService.size()).toBe(0);
        
        cacheService.set('key1', 'value1');
        expect(cacheService.size()).toBe(1);
        
        cacheService.set('key2', 'value2');
        expect(cacheService.size()).toBe(2);
        
        cacheService.delete('key1');
        expect(cacheService.size()).toBe(1);
      });
    });
  });

  describe('Cache Eviction', () => {
    it('should evict least recently used entry when max size is reached', () => {
      const smallConfig: CacheConfig = { ...mockConfig, maxSize: 3 };
      const smallCache = createCacheService(smallConfig);
      
      // Mock Date.now to have predictable timestamps
      const originalNow = Date.now;
      let timeIncrement = 0;
      Date.now = jest.fn(() => 1000 + timeIncrement);
      
      // Fill cache to capacity with different timestamps
      smallCache.set('key1', 'value1');
      timeIncrement += 100;
      smallCache.set('key2', 'value2');
      timeIncrement += 100;
      smallCache.set('key3', 'value3');
      
      expect(smallCache.size()).toBe(3);
      
      // Access key1 to make it more recently used
      timeIncrement += 100;
      smallCache.get('key1');
      
      // Add another entry, should evict key2 (least recently used)
      timeIncrement += 100;
      smallCache.set('key4', 'value4');
      
      expect(smallCache.size()).toBe(3);
      expect(smallCache.has('key1')).toBe(true);
      expect(smallCache.has('key2')).toBe(false);
      expect(smallCache.has('key4')).toBe(true);
      
      Date.now = originalNow;
    });

    it('should handle eviction when cache is full and no entries accessed', () => {
      const smallConfig: CacheConfig = { ...mockConfig, maxSize: 2 };
      const smallCache = createCacheService(smallConfig);
      
      // Add entries with slight time difference
      const originalNow = Date.now;
      let timeIncrement = 0;
      Date.now = jest.fn(() => originalNow() + timeIncrement);
      
      smallCache.set('key1', 'value1');
      timeIncrement += 1000;
      
      smallCache.set('key2', 'value2');
      timeIncrement += 1000;
      
      // Add third entry, should evict key1 (oldest)
      smallCache.set('key3', 'value3');
      
      expect(smallCache.has('key1')).toBe(false);
      expect(smallCache.has('key2')).toBe(true);
      expect(smallCache.has('key3')).toBe(true);
      
      // Restore original Date
      Date.now = originalNow;
    });
  });

  describe('Hit Tracking', () => {
    it('should track cache hits', () => {
      cacheService.set('key', 'value');
      
      // Access multiple times
      expect(cacheService.get('key')).toBe('value');
      expect(cacheService.get('key')).toBe('value');
      expect(cacheService.get('key')).toBe('value');
      
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(3);
    });

    it('should not count misses in hit tracking', () => {
      cacheService.set('key', 'value');
      
      expect(cacheService.get('key')).toBe('value'); // hit
      expect(cacheService.get('nonexistent')).toBeNull(); // miss
      expect(cacheService.get('key')).toBe('value'); // hit
      
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', { data: 'value2' });
      
      // Access entries to generate hits
      expect(cacheService.get('key1')).toBe('value1');
      expect(cacheService.get('key1')).toBe('value1');
      expect(cacheService.get('key2')).toEqual({ data: 'value2' });
      
      const stats = cacheService.getStats();
      
      expect(stats.entries).toBe(2);
      expect(stats.hits).toBe(3);
      expect(stats.maxSize).toBe(mockConfig.maxSize);
      expect(stats.ttl).toBe(mockConfig.ttl);
      expect(stats.hitRate).toBe(1.5); // 3 hits / 2 entries
      expect(stats.size).toBeGreaterThan(0); // Should have some size
    });

    it('should handle empty cache statistics', () => {
      const stats = cacheService.getStats();
      
      expect(stats.entries).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Key Generation', () => {
    it('should use custom key generator when provided', () => {
      const customKeyGen = jest.fn().mockReturnValue('custom-key');
      const config: CacheConfig = {
        ...mockConfig,
        keyGenerator: customKeyGen
      };
      const customCache = createCacheService(config);
      
      const mockReq = { method: 'GET', url: '/test' };
      const key = customCache.generateKey(mockReq);
      
      expect(customKeyGen).toHaveBeenCalledWith(mockReq);
      expect(key).toBe('custom-key');
    });

    it('should use default key generation when no custom generator', () => {
      const mockReq = {
        method: 'GET',
        url: '/test',
        get: jest.fn().mockReturnValue('test-agent')
      };
      
      const key = cacheService.generateKey(mockReq);
      expect(key).toBe('GET:/test:test-agent');
    });

    it('should handle missing user-agent in default key generation', () => {
      const mockReq = {
        method: 'POST',
        url: '/api/test',
        get: jest.fn().mockReturnValue(undefined)
      };
      
      const key = cacheService.generateKey(mockReq);
      expect(key).toBe('POST:/api/test:');
    });
  });

  describe('Cache Policy', () => {
    it('should use custom shouldCache function when provided', () => {
      const customShouldCache = jest.fn().mockReturnValue(true);
      const config: CacheConfig = {
        ...mockConfig,
        shouldCache: customShouldCache
      };
      const customCache = createCacheService(config);
      
      const mockReq = { method: 'POST' };
      const mockRes = { statusCode: 201 };
      
      const shouldCache = customCache.shouldCache(mockReq, mockRes);
      
      expect(customShouldCache).toHaveBeenCalledWith(mockReq, mockRes);
      expect(shouldCache).toBe(true);
    });

    it('should use default caching logic when no custom function', () => {
      const testCases = [
        { req: { method: 'GET' }, res: { statusCode: 200 }, expected: true },
        { req: { method: 'GET' }, res: { statusCode: 404 }, expected: false },
        { req: { method: 'POST' }, res: { statusCode: 200 }, expected: false },
        { req: { method: 'PUT' }, res: { statusCode: 200 }, expected: false },
      ];
      
      testCases.forEach(({ req, res, expected }) => {
        const result = cacheService.shouldCache(req, res);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Cleanup Process', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should clean up expired entries during periodic cleanup', () => {
      const originalNow = Date.now;
      let currentTime = 1000;
      Date.now = jest.fn(() => currentTime);
      
      // Add entries with different timestamps
      cacheService.set('key1', 'value1');
      
      // Simulate time passage to make first entry expire
      currentTime += 70000; // 70 seconds later (beyond TTL)
      
      cacheService.set('key2', 'value2'); // This should not expire
      
      expect(cacheService.size()).toBe(2);
      
      // Trigger cleanup directly
      cacheService.forceCleanup();
      
      // After cleanup, only non-expired entry should remain
      expect(cacheService.size()).toBe(1);
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(true);
      
      Date.now = originalNow;
    });

    it('should schedule periodic cleanup', () => {
      const spySetInterval = jest.spyOn(global, 'setInterval');
      
      createCacheService(mockConfig);
      
      expect(spySetInterval).toHaveBeenCalledWith(expect.any(Function), 60000);
      
      spySetInterval.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined values', () => {
      cacheService.set('null-key', null);
      cacheService.set('undefined-key', undefined);
      
      expect(cacheService.get('null-key')).toBeNull();
      expect(cacheService.get('undefined-key')).toBeUndefined();
    });

    it('should handle complex objects', () => {
      const complexObject = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        },
        date: new Date('2024-01-01'),
        string: 'test string'
      };
      
      cacheService.set('complex', complexObject);
      const retrieved = cacheService.get('complex');
      
      expect(retrieved).toEqual(complexObject);
    });

    it('should handle zero TTL', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1000);
      
      cacheService.set('key', 'value', 0);
      
      // With zero TTL, entry should expire immediately
      expect(cacheService.get('key')).toBeNull();
      
      Date.now = originalNow;
    });

    it('should handle negative TTL', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1000);
      
      cacheService.set('key', 'value', -1000);
      
      // Negative TTL should make entry immediately expired
      expect(cacheService.get('key')).toBeNull();
      
      Date.now = originalNow;
    });

    it('should handle empty cache eviction', () => {
      const smallConfig: CacheConfig = { ...mockConfig, maxSize: 1 };
      const smallCache = createCacheService(smallConfig);
      
      // Try to trigger eviction on empty cache
      expect(() => smallCache.set('key', 'value')).not.toThrow();
      expect(smallCache.size()).toBe(1);
    });
  });

  describe('Memory Management', () => {
    it('should calculate memory usage approximately', () => {
      const largeData = 'x'.repeat(1000); // 1KB string
      cacheService.set('large', largeData);
      
      const stats = cacheService.getStats();
      expect(stats.size).toBeGreaterThan(1000);
    });

    it('should handle very large cache sizes', () => {
      const largeConfig: CacheConfig = { ...mockConfig, maxSize: 10000 };
      const largeCache = createCacheService(largeConfig);
      
      // Add many entries
      for (let i = 0; i < 1000; i++) {
        largeCache.set(`key${i}`, `value${i}`);
      }
      
      expect(largeCache.size()).toBe(1000);
      
      const stats = largeCache.getStats();
      expect(stats.entries).toBe(1000);
    });
  });
});