"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sportsCache = exports.SportsCacheService = exports.SPORTS_CACHE_TTL = void 0;
const cache_service_js_1 = require("./cache.service.js");
const logger_js_1 = require("../utils/logger.js");
exports.SPORTS_CACHE_TTL = {
    FIXTURES: 6 * 3600, // 6 horas
    STANDINGS: 12 * 3600, // 12 horas
    STATISTICS: 12 * 3600, // 12 horas
    H2H: 24 * 3600, // 24 horas
    INJURIES: 6 * 3600, // 6 horas
    LINEUPS: 45 * 60, // 45 minutos (30-90m antes del partido)
    RESULTS: 2 * 3600, // 2 horas mientras haya partidos activos
    COMPETITIONS: 24 * 3600 // 24 horas
};
class SportsCacheService {
    static instance;
    logger = new logger_js_1.StructuredLogger('SportsCacheService');
    constructor() { }
    static getInstance() {
        if (!SportsCacheService.instance) {
            SportsCacheService.instance = new SportsCacheService();
        }
        return SportsCacheService.instance;
    }
    get(key) {
        const data = cache_service_js_1.globalCache.get(key);
        if (data) {
            this.logger.debug(`Cache HIT para clave '${key}'`);
            return data;
        }
        this.logger.debug(`Cache MISS para clave '${key}'`);
        return null;
    }
    set(key, value, ttlSeconds) {
        cache_service_js_1.globalCache.set(key, value, ttlSeconds);
        this.logger.debug(`Cache SET para clave '${key}' con TTL ${ttlSeconds}s`);
    }
    invalidate(key) {
        cache_service_js_1.globalCache.delete(key);
    }
    clear() {
        cache_service_js_1.globalCache.clear();
    }
}
exports.SportsCacheService = SportsCacheService;
exports.sportsCache = SportsCacheService.getInstance();
//# sourceMappingURL=sportsCache.service.js.map