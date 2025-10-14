/**
 * Simple in-memory rate limiter utility
 * For production scale, use a shared store like Redis
 */

type AttemptRecord = {
  count: number;
  firstTs: number;
  blockedUntil?: number;
};

export class RateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private windowMs: number;
  private maxAttempts: number;
  private blockMs: number;

  constructor(options: {
    windowMs: number;
    maxAttempts: number;
    blockMs: number;
  }) {
    this.windowMs = options.windowMs;
    this.maxAttempts = options.maxAttempts;
    this.blockMs = options.blockMs;
  }

  private now() {
    return Date.now();
  }

  private isBlocked(record?: AttemptRecord): boolean {
    if (!record) return false;
    if (record.blockedUntil && record.blockedUntil > this.now()) return true;
    return false;
  }

  private registerFailure(key: string): void {
    const ts = this.now();
    const rec = this.attempts.get(key);

    if (!rec) {
      this.attempts.set(key, { count: 1, firstTs: ts });
      return;
    }

    // Reset window if expired
    if (ts - rec.firstTs > this.windowMs) {
      rec.count = 1;
      rec.firstTs = ts;
      rec.blockedUntil = undefined;
      return;
    }

    rec.count++;

    // Block if max attempts exceeded
    if (rec.count >= this.maxAttempts) {
      rec.blockedUntil = ts + this.blockMs;
    }
  }

  checkLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const ts = this.now();
    const rec = this.attempts.get(key);

    if (this.isBlocked(rec)) {
      const blockedUntil = rec!.blockedUntil!;
      return {
        allowed: false,
        remaining: 0,
        resetTime: blockedUntil
      };
    }

    // Reset window if expired
    if (rec && ts - rec.firstTs > this.windowMs) {
      rec.count = 0;
      rec.firstTs = ts;
      rec.blockedUntil = undefined;
    }

    const currentCount = rec?.count || 0;
    const remaining = Math.max(0, this.maxAttempts - currentCount);
    const resetTime = rec ? rec.firstTs + this.windowMs : ts + this.windowMs;

    return {
      allowed: currentCount < this.maxAttempts,
      remaining,
      resetTime
    };
  }

  recordFailure(key: string): void {
    this.registerFailure(key);
  }

  recordSuccess(key: string): void {
    // Reset on success
    this.attempts.delete(key);
  }
}

// Pre-configured rate limiters for different use cases
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5,
  blockMs: 15 * 60 * 1000 // 15 minutes block
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 30, // 30 requests per minute
  blockMs: 5 * 60 * 1000 // 5 minutes block
});

export const strictRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 10, // 10 requests per minute
  blockMs: 10 * 60 * 1000 // 10 minutes block
});