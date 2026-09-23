"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OddsService = void 0;
const factory_js_1 = require("../providers/factory.js");
const cache_service_js_1 = require("./cache.service.js");
const circuitBreaker_js_1 = require("../utils/circuitBreaker.js");
const logger_js_1 = require("../utils/logger.js");
const index_js_1 = require("../config/index.js");
const odds_normalizer_js_1 = require("../providers/odds/odds.normalizer.js");
const oddsSnapshot_service_js_1 = require("./oddsSnapshot.service.js");
class OddsService {
    provider;
    circuitBreaker;
    logger = new logger_js_1.StructuredLogger('OddsService');
    // Almacén de respaldo para servir último dato válido cuando la API esté caída
    static staleFallbacks = new Map();
    constructor(provider) {
        this.provider = provider || factory_js_1.ProviderFactory.getOddsProvider();
        this.circuitBreaker = new circuitBreaker_js_1.CircuitBreaker({
            serviceName: this.provider.providerName,
            failureThreshold: index_js_1.config.circuitBreaker.failureThreshold,
            recoveryTimeMs: index_js_1.config.circuitBreaker.recoveryTimeMs
        });
    }
    /**
     * Consulta global de cuotas para un deporte/liga con caché compartida (anti-N-consultas)
     */
    async getUpcomingOdds(sportKey) {
        this.logger.debug(`Consultando cuotas globales para ${sportKey}`);
        const cacheKey = `odds:global:upcoming:${sportKey}`;
        const cached = cache_service_js_1.globalCache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const data = await this.circuitBreaker.execute(() => this.provider.getUpcomingOdds(sportKey));
            cache_service_js_1.globalCache.set(cacheKey, data, 600); // 10 minutos de caché compartida
            // Guardar respaldo para fallback
            OddsService.staleFallbacks.set(cacheKey, {
                data,
                timestamp: new Date().toISOString()
            });
            return data;
        }
        catch (error) {
            this.logger.error(`Error consultando The Odds API para ${sportKey}. Verificando fallback stale...`, error);
            const fallback = OddsService.staleFallbacks.get(cacheKey);
            if (fallback) {
                this.logger.warn(`Serviendo datos stale de respaldo para ${sportKey} capturados en ${fallback.timestamp}`);
                return fallback.data.map(e => ({
                    ...e,
                    isStale: true,
                    fetchedAt: fallback.timestamp
                }));
            }
            throw error;
        }
    }
    /**
     * Obtiene cuotas para un partido específico con fallback a stale
     */
    async getMatchOdds(sportKey, eventId) {
        const cacheKey = `odds:global:match:${sportKey}:${eventId}`;
        const cached = cache_service_js_1.globalCache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const allUpcoming = await this.getUpcomingOdds(sportKey);
            const found = allUpcoming.find(e => e.id === eventId);
            if (found) {
                cache_service_js_1.globalCache.set(cacheKey, found, 300); // 5 minutos
                OddsService.staleFallbacks.set(cacheKey, { data: found, timestamp: found.fetchedAt || new Date().toISOString() });
                return found;
            }
            const direct = await this.circuitBreaker.execute(() => this.provider.getMatchOdds(sportKey, eventId));
            cache_service_js_1.globalCache.set(cacheKey, direct, 300);
            OddsService.staleFallbacks.set(cacheKey, { data: direct, timestamp: direct.fetchedAt || new Date().toISOString() });
            return direct;
        }
        catch (error) {
            const fallback = OddsService.staleFallbacks.get(cacheKey);
            if (fallback) {
                this.logger.warn(`Serviendo cuotas stale para evento ${eventId} capturadas en ${fallback.timestamp}`);
                return {
                    ...fallback.data,
                    isStale: true,
                    fetchedAt: fallback.timestamp
                };
            }
            throw error;
        }
    }
    /**
     * Genera la comparación estadística de cuotas entre casas para un partido
     */
    async getMatchOddsComparison(sportKey, eventId, requestedBookmakerIds) {
        const targetBookmakers = requestedBookmakerIds && requestedBookmakerIds.length > 0
            ? requestedBookmakerIds
            : ['pinnacle', 'bet365', 'betfair', '1xbet', 'betplay', 'wplay'];
        const cacheKey = `odds:comparison:${sportKey}:${eventId}:${[...targetBookmakers].sort().join('_')}`;
        const cached = cache_service_js_1.globalCache.get(cacheKey);
        if (cached)
            return cached;
        const event = await this.getMatchOdds(sportKey, eventId);
        const comparison = odds_normalizer_js_1.OddsNormalizer.buildOddsComparison(event, targetBookmakers);
        // Guardar snapshots históricos en Firestore para las mejores cuotas encontradas
        for (const sel of Object.values(comparison.selections)) {
            if (sel.bestOdds) {
                oddsSnapshot_service_js_1.oddsSnapshotService.recordSnapshot({
                    matchId: eventId,
                    bookmaker: sel.bestOdds.bookmakerName,
                    market: sel.market,
                    selection: sel.selection,
                    line: sel.line,
                    odds: sel.bestOdds.price,
                    trigger: 'on_demand'
                });
            }
        }
        cache_service_js_1.globalCache.set(cacheKey, comparison, 180); // 3 minutos
        return comparison;
    }
    async getSupportedSports() {
        const cacheKey = 'odds:supportedSports';
        const cached = cache_service_js_1.globalCache.get(cacheKey);
        if (cached)
            return cached;
        const sports = await this.circuitBreaker.execute(() => this.provider.getSupportedSports());
        cache_service_js_1.globalCache.set(cacheKey, sports, 86400); // 24 horas
        return sports;
    }
}
exports.OddsService = OddsService;
//# sourceMappingURL=odds.service.js.map