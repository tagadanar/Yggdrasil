import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { RateLimitError } from '../errors/AppError';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  handler?: (req: Request, res: Response) => void;
}

export class RateLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  create(options: RateLimiterOptions) {
    const {
      windowMs,
      max,
      message = 'Too many requests',
      keyGenerator = this.defaultKeyGenerator,
      skipSuccessfulRequests = false,
      standardHeaders = true,
      legacyHeaders = false,
      handler,
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = keyGenerator(req);
        const windowStart = Date.now() - windowMs;

        // Clean old entries
        await this.redis.zremrangebyscore(key, '-inf', windowStart);

        // Count requests in window
        const requests = await this.redis.zcard(key);

        // Check if limit exceeded
        if (requests >= max) {
          const oldestRequest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
          const resetTime =
            oldestRequest.length > 0
              ? parseInt(oldestRequest[1] || '0') + windowMs
              : Date.now() + windowMs;

          // Set rate limit headers
          if (standardHeaders) {
            res.setHeader('RateLimit-Limit', max);
            res.setHeader('RateLimit-Remaining', 0);
            res.setHeader('RateLimit-Reset', new Date(resetTime).toISOString());
            res.setHeader('RateLimit-Policy', `${max};w=${windowMs / 1000}`);
          }

          if (legacyHeaders) {
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('X-RateLimit-Reset', resetTime);
          }

          // Handle rate limit exceeded
          if (handler) {
            return handler(req, res);
          }

          throw new RateLimitError(Math.ceil((resetTime - Date.now()) / 1000), message);
        }

        // Add current request
        const added = await this.addRequest(key, windowMs, res, skipSuccessfulRequests);

        // Set headers for successful requests
        if (standardHeaders) {
          res.setHeader('RateLimit-Limit', max);
          res.setHeader('RateLimit-Remaining', Math.max(0, max - requests - (added ? 1 : 0)));
          res.setHeader('RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
        }

        if (legacyHeaders) {
          res.setHeader('X-RateLimit-Limit', max);
          res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requests - (added ? 1 : 0)));
          res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);
        }

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          next(error);
        } else {
          // Redis error - fail open
          console.error('Rate limiter error:', error);
          next();
        }
      }
    };
  }

  private async addRequest(
    key: string,
    windowMs: number,
    res: Response,
    skipSuccessful: boolean,
  ): Promise<boolean> {
    if (skipSuccessful) {
      // Wait for response to finish
      const originalSend = res.send;
      const redis = this.redis;
      res.send = function (data: any) {
        res.send = originalSend;

        if (res.statusCode < 400) {
          // Don't count successful requests
          return originalSend.call(this, data);
        }

        // Count failed requests
        redis.zadd(key, Date.now(), `${Date.now()}-${Math.random()}`);
        redis.expire(key, Math.ceil(windowMs / 1000));

        return originalSend.call(this, data);
      };

      return false;
    } else {
      // Add request immediately
      await this.redis.zadd(key, Date.now(), `${Date.now()}-${Math.random()}`);
      await this.redis.expire(key, Math.ceil(windowMs / 1000));
      return true;
    }
  }

  private defaultKeyGenerator(req: Request): string {
    const user = (req as any).user;
    if (user?.id) {
      return `rate_limit:user:${user.id}`;
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `rate_limit:ip:${ip}`;
  }

  // Specialized rate limiters
  static authLimiter(redis: Redis) {
    return new RateLimiter(redis).create({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      message: 'Too many authentication attempts',
      skipSuccessfulRequests: true,
      keyGenerator: req => {
        const email = req.body?.email || 'unknown';
        const ip = req.ip || 'unknown';
        return `rate_limit:auth:${email}:${ip}`;
      },
    });
  }

  static apiLimiter(redis: Redis) {
    return new RateLimiter(redis).create({
      windowMs: 60 * 1000, // 1 minute
      max: 100,
      message: 'API rate limit exceeded',
    });
  }

  static strictLimiter(redis: Redis) {
    return new RateLimiter(redis).create({
      windowMs: 60 * 1000, // 1 minute
      max: 10,
      message: 'Rate limit exceeded for sensitive operation',
    });
  }
}

// Distributed rate limiter for multiple instances
export class DistributedRateLimiter extends RateLimiter {
  constructor(redis: Redis, _instanceId: string) {
    super(redis);
    // instanceId could be used for future distributed coordination
  }

  async syncLimits() {
    // Implement distributed rate limit synchronization
    const script = `
      local key = KEYS[1]
      local window_ms = tonumber(ARGV[1])
      local max_requests = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local window_start = now - window_ms
      
      -- Remove old entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
      
      -- Count current requests
      local current = redis.call('ZCARD', key)
      
      if current < max_requests then
        -- Add request
        redis.call('ZADD', key, now, now .. ':' .. math.random())
        redis.call('EXPIRE', key, math.ceil(window_ms / 1000))
        return {1, max_requests - current - 1}
      else
        -- Get reset time
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local reset = oldest[2] and (tonumber(oldest[2]) + window_ms) or (now + window_ms)
        return {0, 0, reset}
      end
    `;

    // Use Lua script for atomic operations - access redis through protected method
    return (this as any).redis.eval(script, 1, 'key', 'windowMs', 'max', Date.now());
  }
}
