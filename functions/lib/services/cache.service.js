"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalCache = exports.CacheService = void 0;
class CacheService {
    static instance;
    cache = new Map();
    hits = 0;
    misses = 0;
    constructor() {
        // Limpieza periódica cada 5 minutos
        setInterval(() => this.cleanup(), 5 * 60 * 1000).unref?.();
    }
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        this.hits++;
        return entry.value;
    }
    set(key, value, ttlSeconds) {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { value, expiresAt });
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    getStats() {
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) * 100 : 0
        };
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}
exports.CacheService = CacheService;
exports.globalCache = CacheService.getInstance();
//# sourceMappingURL=cache.service.js.map