// src/lib/rateLimiter.ts
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 20, windowMs = 60000) { // 20 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.requests.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const entry = this.requests.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.windowMs;
    }
    return entry.resetTime;
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.requests.entries());
    for (const [key, entry] of entries) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

export const chatRateLimiter = new RateLimiter(50, 60000); // 50 requests per minute for 40 resume batches

// Clean up every 5 minutes - only in Node.js environment
if (typeof window === 'undefined') {
  const cleanupInterval = setInterval(() => {
    chatRateLimiter.cleanup();
  }, 5 * 60 * 1000);
  
  // Ensure cleanup on process termination
  if (process && process.on) {
    process.on('SIGTERM', () => {
      clearInterval(cleanupInterval);
    });
    process.on('SIGINT', () => {
      clearInterval(cleanupInterval);
    });
  }
}
