import { RateLimitInfo } from "./types";

interface RateLimitWindow {
  count: number;
  windowStart: number;
}

class RateLimiter {
  private windows: Map<string, RateLimitWindow> = new Map();
  private readonly windowSizeMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowSizeMs: number) {
    this.maxRequests = maxRequests;
    this.windowSizeMs = windowSizeMs;
  }

  checkLimit(key: string): RateLimitInfo {
    const now = Date.now();
    const window = this.windows.get(key);

    if (!window || now - window.windowStart >= this.windowSizeMs) {
      // New window or expired window
      this.windows.set(key, {
        count: 0,
        windowStart: now,
      });
      
      return {
        remaining: this.maxRequests,
        resetTime: now + this.windowSizeMs,
        limit: this.maxRequests,
        windowStart: now,
      };
    }

    const remaining = Math.max(0, this.maxRequests - window.count);
    
    return {
      remaining,
      resetTime: window.windowStart + this.windowSizeMs,
      limit: this.maxRequests,
      windowStart: window.windowStart,
    };
  }

  consume(key: string): boolean {
    const limitInfo = this.checkLimit(key);
    
    if (limitInfo.remaining <= 0) {
      return false; // Rate limit exceeded
    }

    const window = this.windows.get(key)!;
    window.count += 1;
    this.windows.set(key, window);
    
    return true;
  }

  getRemainingTime(key: string): number {
    const window = this.windows.get(key);
    if (!window) return 0;
    
    const now = Date.now();
    return Math.max(0, (window.windowStart + this.windowSizeMs) - now);
  }

  // Cleanup expired windows
  cleanup(): void {
    const now = Date.now();
    for (const [key, window] of this.windows.entries()) {
      if (now - window.windowStart >= this.windowSizeMs) {
        this.windows.delete(key);
      }
    }
  }
}

// Global rate limiters
export const minuteRateLimiter = new RateLimiter(60, 60 * 1000); // 60 requests per minute
export const hourRateLimiter = new RateLimiter(1000, 60 * 60 * 1000); // 1000 requests per hour

// Cleanup expired windows every 5 minutes
setInterval(() => {
  minuteRateLimiter.cleanup();
  hourRateLimiter.cleanup();
}, 5 * 60 * 1000);

export function checkRateLimit(userId: string): { allowed: boolean; info: RateLimitInfo } {
  const minuteCheck = minuteRateLimiter.checkLimit(userId);
  const hourCheck = hourRateLimiter.checkLimit(userId);

  // Use the more restrictive limit
  const allowed = minuteCheck.remaining > 0 && hourCheck.remaining > 0;
  const info = minuteCheck.remaining < hourCheck.remaining ? minuteCheck : hourCheck;

  return { allowed, info };
}

export function consumeRateLimit(userId: string): boolean {
  const minuteAllowed = minuteRateLimiter.consume(userId);
  const hourAllowed = hourRateLimiter.consume(userId);
  
  return minuteAllowed && hourAllowed;
}
