"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlidingWindowRateLimiter = void 0;
class SlidingWindowRateLimiter {
    windowMs;
    maxRequests;
    requests;
    constructor(options = { windowMs: 60000, maxRequests: 60 }) {
        this.windowMs = options.windowMs;
        this.maxRequests = options.maxRequests;
        this.requests = new Map();
    }
    isAllowed(key) {
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
    clear() {
        this.requests.clear();
    }
}
exports.SlidingWindowRateLimiter = SlidingWindowRateLimiter;
//# sourceMappingURL=rateLimiter.js.map