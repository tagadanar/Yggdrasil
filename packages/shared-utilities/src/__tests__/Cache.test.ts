// packages/shared-utilities/src/__tests__/Cache.test.ts
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Cache } from '../cache/cache';

describe('Cache - Phase 4.1 Validation', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache({
      ttl: 1000, // 1 second for testing
      max: 3, // Small capacity for testing
    });
  });

  describe('Basic Cache Operations', () => {
    test('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    test('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    test('should handle different data types', () => {
      const testData = {
        string: 'test',
        number: 42,
        object: { nested: 'value' },
        array: [1, 2, 3],
        boolean: true,
      };

      Object.entries(testData).forEach(([key, value]) => {
        cache.set(key, value);
        expect(cache.get(key)).toEqual(value);
      });
    });

    test('should delete values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      const deleted = cache.delete('key1');
      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    test('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('TTL (Time To Live) Functionality', () => {
    test('should expire values after TTL', async () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cache.get('key1')).toBeNull();
    });

    test('should support custom TTL per item', async () => {
      cache.set('short', 'value1', 500); // 500ms
      cache.set('long', 'value2', 2000); // 2000ms

      // After 600ms, short should expire but long should remain
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(cache.get('short')).toBeNull();
      expect(cache.get('long')).toBe('value2');
    });

    test('should clean up expired entries', async () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.size()).toBe(2);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const cleaned = cache.cleanup();
      expect(cleaned).toBe(2);
      expect(cache.size()).toBe(0);
    });
  });

  describe('Capacity Management', () => {
    test('should respect maximum capacity', () => {
      // Cache has max capacity of 3
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.size()).toBe(3);

      // Adding 4th item should remove the first
      cache.set('key4', 'value4');

      expect(cache.size()).toBe(3);
      expect(cache.get('key1')).toBeNull(); // First item evicted
      expect(cache.get('key4')).toBe('value4'); // New item present
    });

    test('should maintain LRU-like behavior on capacity overflow', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Adding more items should evict in insertion order
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
      expect(cache.get('key5')).toBe('value5');
    });
  });

  describe('Pattern Matching', () => {
    test('should delete entries matching pattern', () => {
      // Create a cache with higher capacity for pattern testing
      const patternCache = new Cache({
        ttl: 60000,
        max: 10, // Higher capacity to avoid LRU eviction
      });

      patternCache.set('user:1', 'data1');
      patternCache.set('user:2', 'data2');
      patternCache.set('course:1', 'data3');
      patternCache.set('course:2', 'data4');

      const deleted = patternCache.deletePattern('user:*');
      expect(deleted).toBe(2);

      expect(patternCache.get('user:1')).toBeNull();
      expect(patternCache.get('user:2')).toBeNull();
      expect(patternCache.get('course:1')).toBe('data3');
      expect(patternCache.get('course:2')).toBe('data4');
    });

    test('should handle complex patterns', () => {
      // Create a cache with higher capacity for pattern testing
      const complexPatternCache = new Cache({
        ttl: 60000,
        max: 10, // Higher capacity to avoid LRU eviction
      });

      complexPatternCache.set('api:v1:users', 'data1');
      complexPatternCache.set('api:v1:courses', 'data2');
      complexPatternCache.set('api:v2:users', 'data3');
      complexPatternCache.set('cache:data', 'data4');

      const deleted = complexPatternCache.deletePattern('api:v1:*');
      expect(deleted).toBe(2);

      expect(complexPatternCache.get('api:v1:users')).toBeNull();
      expect(complexPatternCache.get('api:v1:courses')).toBeNull();
      expect(complexPatternCache.get('api:v2:users')).toBe('data3');
      expect(complexPatternCache.get('cache:data')).toBe('data4');
    });

    test('should return 0 when no patterns match', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const deleted = cache.deletePattern('nonexistent:*');
      expect(deleted).toBe(0);

      expect(cache.size()).toBe(2);
    });
  });

  describe('Cache Clearing', () => {
    test('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.size()).toBe(3);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle large datasets efficiently', () => {
      const largeCache = new Cache({ max: 1000, ttl: 60000 });

      const startTime = Date.now();

      // Insert 1000 items
      for (let i = 0; i < 1000; i++) {
        largeCache.set(`key:${i}`, `value:${i}`);
      }

      const insertTime = Date.now() - startTime;
      expect(insertTime).toBeLessThan(100); // Should be fast

      // Retrieve 1000 items
      const retrieveStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        expect(largeCache.get(`key:${i}`)).toBe(`value:${i}`);
      }

      const retrieveTime = Date.now() - retrieveStartTime;
      expect(retrieveTime).toBeLessThan(50); // Should be very fast

      expect(largeCache.size()).toBe(1000);
    });

    test('should handle rapid set/get operations', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        cache.set(`rapid:${i}`, `value:${i}`);
        expect(cache.get(`rapid:${i}`)).toBe(`value:${i}`);
      }

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(50); // Should complete quickly
    });
  });

  describe('Edge Cases', () => {
    test('should handle null and undefined values', () => {
      cache.set('null', null);
      cache.set('undefined', undefined);

      expect(cache.get('null')).toBeNull();
      expect(cache.get('undefined')).toBeUndefined();
    });

    test('should handle empty strings and zero values', () => {
      cache.set('empty', '');
      cache.set('zero', 0);
      cache.set('false', false);

      expect(cache.get('empty')).toBe('');
      expect(cache.get('zero')).toBe(0);
      expect(cache.get('false')).toBe(false);
    });

    test('should handle very long keys', () => {
      const longKey = 'a'.repeat(1000);
      cache.set(longKey, 'value');

      expect(cache.get(longKey)).toBe('value');
    });

    test('should handle concurrent operations', () => {
      // Simulate concurrent access
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise<void>(resolve => {
            cache.set(`concurrent:${i}`, `value:${i}`);
            expect(cache.get(`concurrent:${i}`)).toBe(`value:${i}`);
            resolve();
          }),
        );
      }

      return Promise.all(promises);
    });
  });

  describe('Custom TTL Scenarios', () => {
    test('should override default TTL correctly', () => {
      const customCache = new Cache({ ttl: 5000 }); // 5 seconds default

      customCache.set('default', 'value1'); // Uses 5000ms
      customCache.set('custom', 'value2', 100); // Uses 100ms

      // Both should be available immediately
      expect(customCache.get('default')).toBe('value1');
      expect(customCache.get('custom')).toBe('value2');
    });

    test('should handle zero TTL (immediate expiration)', () => {
      cache.set('immediate', 'value', 0);

      // Should expire immediately
      expect(cache.get('immediate')).toBeNull();
    });
  });

  describe('Statistical Methods', () => {
    test('should track cache size accurately', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.delete('key1');
      expect(cache.size()).toBe(1);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });
});
