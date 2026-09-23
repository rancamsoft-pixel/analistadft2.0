export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

export class SlidingWindowRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private requests: Map<string, number[]>;

  constructor(options: RateLimiterOptions = { windowMs: 60000, maxRequests: 60 }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.requests = new Map();
  }

  public isAllowed(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const windowStart = now - this.windowMs;

    // Filtrar solicitudes fuera de la ventana
    const validTimestamps = timestamps.filter(ts => ts > windowStart);

    if (validTimestamps.length >= this.maxRequests) {
      const oldestValid = validTimestamps[0] ?? now;
      const resetMs = Math.max(0, oldestValid + this.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs
      };
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - validTimestamps.length,
      resetMs: this.windowMs
    };
  }

  public clear(): void {
    this.requests.clear();
  }
}
