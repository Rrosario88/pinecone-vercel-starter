/**
 * Token bucket rate limiter for API endpoints.
 *
 * Uses in-memory storage - suitable for single-instance deployments.
 * For multi-instance production, replace with Redis-based storage.
 *
 * Usage in API routes:
 *   const rateLimitResult = rateLimit.check(identifier);
 *   if (!rateLimitResult.allowed) {
 *     return Response.json({ error: 'Rate limit exceeded' }, {
 *       status: 429,
 *       headers: rateLimitResult.headers
 *     });
 *   }
 */

type RateLimitConfig = {
  /** Maximum tokens in bucket */
  maxTokens: number;
  /** Tokens added per interval */
  refillRate: number;
  /** Refill interval in milliseconds */
  refillInterval: number;
};

type BucketState = {
  tokens: number;
  lastRefill: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  maxTokens: 60,        // 60 requests
  refillRate: 60,       // Refill to full
  refillInterval: 60000 // Per minute
};

/**
 * In-memory rate limiter using token bucket algorithm.
 */
class RateLimiter {
  private buckets: Map<string, BucketState> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Check if request is allowed and consume a token if so.
   */
  check(identifier: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = {
        tokens: this.config.maxTokens,
        lastRefill: now
      };
      this.buckets.set(identifier, bucket);
    }

    // Refill tokens based on time elapsed
    const timeSinceRefill = now - bucket.lastRefill;
    const intervalsElapsed = Math.floor(timeSinceRefill / this.config.refillInterval);

    if (intervalsElapsed > 0) {
      bucket.tokens = Math.min(
        this.config.maxTokens,
        bucket.tokens + intervalsElapsed * this.config.refillRate
      );
      bucket.lastRefill = now;
    }

    // Calculate reset time
    const resetAt = bucket.lastRefill + this.config.refillInterval;

    // Check if request is allowed
    const allowed = bucket.tokens > 0;
    if (allowed) {
      bucket.tokens -= 1;
    }

    const remaining = Math.max(0, bucket.tokens);
    const retryAfter = allowed ? 0 : Math.ceil((resetAt - now) / 1000);

    return {
      allowed,
      remaining,
      resetAt,
      headers: {
        'X-RateLimit-Limit': String(this.config.maxTokens),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        ...(allowed ? {} : { 'Retry-After': String(retryAfter) })
      }
    };
  }

  /**
   * Get current state for an identifier without consuming a token.
   */
  peek(identifier: string): RateLimitResult {
    const bucket = this.buckets.get(identifier);
    const now = Date.now();

    if (!bucket) {
      return {
        allowed: true,
        remaining: this.config.maxTokens,
        resetAt: now + this.config.refillInterval,
        headers: {
          'X-RateLimit-Limit': String(this.config.maxTokens),
          'X-RateLimit-Remaining': String(this.config.maxTokens),
          'X-RateLimit-Reset': String(Math.ceil((now + this.config.refillInterval) / 1000))
        }
      };
    }

    return {
      allowed: bucket.tokens > 0,
      remaining: Math.max(0, bucket.tokens),
      resetAt: bucket.lastRefill + this.config.refillInterval,
      headers: {
        'X-RateLimit-Limit': String(this.config.maxTokens),
        'X-RateLimit-Remaining': String(Math.max(0, bucket.tokens)),
        'X-RateLimit-Reset': String(Math.ceil((bucket.lastRefill + this.config.refillInterval) / 1000))
      }
    };
  }

  /**
   * Reset rate limit for an identifier.
   */
  reset(identifier: string): void {
    this.buckets.delete(identifier);
  }

  /**
   * Clean up stale buckets to prevent memory leaks.
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = this.config.refillInterval * 10; // 10 intervals of inactivity

      const keysToDelete: string[] = [];
      this.buckets.forEach((bucket, identifier) => {
        if (now - bucket.lastRefill > staleThreshold) {
          keysToDelete.push(identifier);
        }
      });
      keysToDelete.forEach(key => this.buckets.delete(key));
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval (for testing/shutdown).
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.buckets.clear();
  }
}

// Pre-configured rate limiters for different endpoint types
export const rateLimiters = {
  /** Standard API rate limit: 60 requests per minute */
  standard: new RateLimiter({
    maxTokens: 60,
    refillRate: 60,
    refillInterval: 60000
  }),

  /** Chat endpoint rate limit: 20 requests per minute (more expensive) */
  chat: new RateLimiter({
    maxTokens: 20,
    refillRate: 20,
    refillInterval: 60000
  }),

  /** Upload endpoint rate limit: 10 uploads per minute */
  upload: new RateLimiter({
    maxTokens: 10,
    refillRate: 10,
    refillInterval: 60000
  }),

  /** Heavy operations rate limit: 5 per minute */
  heavy: new RateLimiter({
    maxTokens: 5,
    refillRate: 5,
    refillInterval: 60000
  })
};

/**
 * Extract identifier from request (IP address or API key).
 */
export function getRequestIdentifier(request: Request): string {
  // Prefer API key if present (for authenticated rate limiting)
  const apiKey = request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (apiKey) {
    // Use hash of API key to avoid storing actual keys
    return `key:${simpleHash(apiKey)}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Simple string hash for identifier generation.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Convenience function to check rate limit and return error response if exceeded.
 * Returns null if allowed, or a Response if rate limited.
 */
export function checkRateLimit(
  request: Request,
  limiter: RateLimiter = rateLimiters.standard
): Response | null {
  const identifier = getRequestIdentifier(request);
  const result = limiter.check(identifier);

  if (!result.allowed) {
    return Response.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: result.headers['Retry-After']
      },
      {
        status: 429,
        headers: result.headers
      }
    );
  }

  return null;
}

export { RateLimiter };
export type { RateLimitConfig, RateLimitResult };
