"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiFootballProvider = void 0;
const apiFootball_normalizer_js_1 = require("./apiFootball.normalizer.js");
const apiUsageManager_js_1 = require("../../services/apiUsageManager.js");
const sportsCache_service_js_1 = require("../../services/sportsCache.service.js");
const concurrencyQueue_js_1 = require("../../utils/concurrencyQueue.js");
const retry_js_1 = require("../../utils/retry.js");
const circuitBreaker_js_1 = require("../../utils/circuitBreaker.js");
const logger_js_1 = require("../../utils/logger.js");
class ApiFootballProvider {
    providerName = 'ApiFootballProvider';
    apiKey;
    baseUrl = 'https://v3.football.api-sports.io';
    queue = new concurrencyQueue_js_1.ConcurrencyQueue(2); // Máximo 2 llamadas simultáneas
    circuitBreaker;
    logger = new logger_js_1.StructuredLogger('ApiFootballProvider');
    constructor(apiKey) {
        if (!apiKey || apiKey.trim().length === 0) {
            throw new Error('[ApiFootballProvider] Configuración inválida: API_FOOTBALL_KEY es requerida y no puede estar vacía.');
        }
        this.apiKey = apiKey.trim();
        this.circuitBreaker = new circuitBreaker_js_1.CircuitBreaker({
            serviceName: 'ApiFootballProvider',
            failureThreshold: 4,
            recoveryTimeMs: 45000 // 45 segundos si el proveedor está caído
        });
    }
    /**
     * Ejecuta peticiones HTTP a API-Football pasando por:
     * 1. Presupuesto (ApiUsageManager <= 80 req/día)
     * 2. Cola de concurrencia (máx 2)
     * 3. Circuit breaker
     * 4. Reintentos exponenciales
     * 5. Timeout con AbortController (8 segundos)
     */
    async executeFetch(endpoint, caller = 'system') {
        // 1. Verificación de Presupuesto Diario (Límite 80 requests/día)
        const budgetCheck = apiUsageManager_js_1.apiUsageManager.canMakeRequest(this.providerName);
        if (!budgetCheck.allowed) {
            throw new Error(`[ApiUsageManager] Presupuesto diario agotado (${budgetCheck.currentUsed}/80 requests utilizadas). Solicitud a '${endpoint}' bloqueada para proteger la cuota.`);
        }
        // 2. Ejecución dentro de la cola de concurrencia
        return this.queue.run(async () => {
            this.logger.debug(`Iniciando solicitud a ${endpoint}`);
            return this.circuitBreaker.execute(async () => {
                const startTime = Date.now();
                let requestError = null;
                let remainingApiHeader = null;
                try {
                    const result = await (0, retry_js_1.withRetry)(async () => {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout
                        try {
                            const url = `${this.baseUrl}${endpoint}`;
                            const response = await fetch(url, {
                                headers: {
                                    'x-apisports-key': this.apiKey
                                },
                                signal: controller.signal
                            });
                            // Header de peticiones restantes reportado por API-Football
                            const remH = response.headers.get('x-ratelimit-requests-remaining');
                            if (remH)
                                remainingApiHeader = parseInt(remH, 10);
                            if (!response.ok) {
                                if (response.status === 401 || response.status === 403) {
                                    throw new Error(`[ApiFootballProvider] Error de autenticación HTTP ${response.status}: API Key inválida o no autorizada.`);
                                }
                                throw new Error(`[ApiFootballProvider] Error HTTP ${response.status}: ${response.statusText}`);
                            }
                            const json = await response.json();
                            if (json.errors && Object.keys(json.errors).length > 0) {
                                const errStr = JSON.stringify(json.errors);
                                throw new Error(`[ApiFootballProvider] Error en respuesta de API: ${errStr}`);
                            }
                            return json.response;
                        }
                        finally {
                            clearTimeout(timeoutId);
                        }
                    }, {
                        maxRetries: 2,
                        initialDelayMs: 800,
                        shouldRetry: (err) => {
                            const msg = err.message || '';
                            // No reintentar si la clave es inválida
                            return !msg.includes('401') && !msg.includes('403') && !msg.includes('inválida');
                        }
                    });
                    return result;
                }
                catch (err) {
                    requestError = err.message;
                    throw err;
                }
                finally {
                    const durationMs = Date.now() - startTime;
                    // Registrar uso en ApiUsageManager
                    await apiUsageManager_js_1.apiUsageManager.recordRequest({
                        provider: this.providerName,
                        endpoint,
                        durationMs,
                        error: requestError,
                        caller,
                        requestsRemainingHeader: remainingApiHeader
                    });
                }
            });
        });
    }
    // 1. Obtener competiciones
    async getCompetitions() {
        const cacheKey = 'apifootball:competitions';
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch('/leagues?current=true', 'getCompetitions');
        const normalized = apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeCompetitions(raw.slice(0, 15));
        sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.COMPETITIONS);
        return normalized;
    }
    // 2. Obtener temporadas
    async getSeasons(competitionId) {
        const cacheKey = `apifootball:seasons:${competitionId}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/leagues/seasons?league=${competitionId}`, 'getSeasons');
        const normalized = apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeSeasons(raw);
        sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.COMPETITIONS);
        return normalized;
    }
    // 3. Obtener próximos partidos
    async getUpcomingMatches(competitionId, date) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const compParam = competitionId ? `&league=${competitionId}` : '';
        const cacheKey = `apifootball:fixtures:upcoming:${competitionId || 'all'}:${targetDate}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/fixtures?date=${targetDate}&status=NS${compParam}`, 'getUpcomingMatches');
        const normalized = (raw || []).map(r => apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeMatch(r));
        // Cache con TTL de 6 horas
        sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.FIXTURES);
        return normalized;
    }
    // 4. Obtener resultados
    async getResults(competitionId, lastN = 10) {
        const compParam = competitionId ? `&league=${competitionId}` : '';
        const cacheKey = `apifootball:fixtures:results:${competitionId || 'all'}:${lastN}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/fixtures?last=${lastN}&status=FT${compParam}`, 'getResults');
        const normalized = (raw || []).map(r => apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeMatch(r));
        sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.RESULTS);
        return normalized;
    }
    // 5. Obtener standings
    async getStandings(competitionId, season) {
        const targetSeason = season || '2024';
        const cacheKey = `apifootball:standings:${competitionId}:${targetSeason}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/standings?league=${competitionId}&season=${targetSeason}`, 'getStandings');
        const normalized = apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeStandings(competitionId, targetSeason, raw);
        sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.STANDINGS);
        return normalized;
    }
    // 6. Obtener estadísticas
    async getStatistics(matchId) {
        const cleanId = matchId.replace('apifootball_', '');
        const cacheKey = `apifootball:stats:${cleanId}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/fixtures/statistics?fixture=${cleanId}`, 'getStatistics');
        const normalized = apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeStatistics(raw);
        sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.STATISTICS);
        return normalized;
    }
    // 7. Obtener enfrentamientos H2H
    async getH2H(teamAId, teamBId) {
        const cacheKey = `apifootball:h2h:${teamAId}-${teamBId}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/fixtures/headtohead?h2h=${teamAId}-${teamBId}`, 'getH2H');
        const normalized = apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeH2H(raw);
        sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.H2H);
        return normalized;
    }
    // 8. Obtener lesiones
    async getInjuries(matchId) {
        const cleanId = matchId.replace('apifootball_', '');
        const cacheKey = `apifootball:injuries:${cleanId}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/injuries?fixture=${cleanId}`, 'getInjuries');
        const normalized = apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeInjuries(raw);
        sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.INJURIES);
        return normalized;
    }
    // 9. Obtener jugadores disponibles (Squad)
    async getSquad(teamId) {
        const cacheKey = `apifootball:squad:${teamId}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/players/squads?team=${teamId}`, 'getSquad');
        const normalized = apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeSquad(raw);
        sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.COMPETITIONS);
        return normalized;
    }
    // 10. Obtener alineaciones
    async getLineups(matchId) {
        const cleanId = matchId.replace('apifootball_', '');
        const cacheKey = `apifootball:lineups:${cleanId}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/fixtures/lineups?fixture=${cleanId}`, 'getLineups');
        const normalized = apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeLineups(raw);
        if (normalized) {
            sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.LINEUPS);
        }
        return normalized;
    }
    // 11. Obtener predicciones
    async getPredictions(matchId) {
        const cleanId = matchId.replace('apifootball_', '');
        const cacheKey = `apifootball:predictions:${cleanId}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/predictions?fixture=${cleanId}`, 'getPredictions');
        const normalized = apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizePredictions(raw?.[0]);
        if (normalized) {
            sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, sportsCache_service_js_1.SPORTS_CACHE_TTL.FIXTURES);
        }
        return normalized;
    }
    // Partidos en vivo
    async getLiveMatches(competitionId) {
        const compParam = competitionId ? `&league=${competitionId}` : '';
        const cacheKey = `apifootball:live:${competitionId || 'all'}`;
        // TTL corto de 45 segundos para partidos en vivo
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/fixtures?live=all${compParam}`, 'getLiveMatches');
        const normalized = (raw || []).map(r => apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeMatch(r));
        sportsCache_service_js_1.sportsCache.set(cacheKey, normalized, 45);
        return normalized;
    }
    // Detalle unificado de partido
    async getMatchDetails(matchId) {
        const cleanId = matchId.replace('apifootball_', '');
        const cacheKey = `apifootball:details:${cleanId}`;
        const cached = sportsCache_service_js_1.sportsCache.get(cacheKey);
        if (cached)
            return cached;
        const raw = await this.executeFetch(`/fixtures?id=${cleanId}`, 'getMatchDetails');
        const baseMatch = apiFootball_normalizer_js_1.ApiFootballNormalizer.normalizeMatch(raw?.[0]);
        // Consultar stats opcionales con tolerancia a fallos
        let statistics;
        try {
            statistics = await this.getStatistics(matchId);
        }
        catch { /* continuar si no hay stats */ }
        const fullDetails = {
            ...baseMatch,
            statistics
        };
        sportsCache_service_js_1.sportsCache.set(cacheKey, fullDetails, sportsCache_service_js_1.SPORTS_CACHE_TTL.FIXTURES);
        return fullDetails;
    }
}
exports.ApiFootballProvider = ApiFootballProvider;
//# sourceMappingURL=apiFootball.provider.js.map