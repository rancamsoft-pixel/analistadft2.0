"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheOddsApiProvider = void 0;
const retry_js_1 = require("../../utils/retry.js");
const oddsUsageManager_js_1 = require("../../services/oddsUsageManager.js");
const odds_normalizer_js_1 = require("./odds.normalizer.js");
class TheOddsApiProvider {
    providerName = 'TheOddsApiProvider';
    apiKey;
    baseUrl = 'https://api.the-odds-api.com/v4';
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('[TheOddsApiProvider] THE_ODDS_API_KEY es requerida para el proveedor real.');
        }
        this.apiKey = apiKey;
    }
    async fetchApi(endpoint) {
        const budget = oddsUsageManager_js_1.oddsUsageManager.canMakeRequest();
        if (!budget.allowed) {
            throw new Error('[TheOddsApiProvider] Presupuesto de créditos agotado para The Odds API. Servir desde caché.');
        }
        const startTime = Date.now();
        let responseHeaders;
        return (0, retry_js_1.withRetry)(async () => {
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${this.baseUrl}${endpoint}${separator}apiKey=${this.apiKey}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                responseHeaders = response.headers;
                const durationMs = Date.now() - startTime;
                oddsUsageManager_js_1.oddsUsageManager.recordCall({
                    endpoint,
                    durationMs,
                    headers: response.headers
                });
                if (!response.ok) {
                    const errStatus = response.status;
                    const statusText = response.statusText;
                    if (errStatus === 401 || errStatus === 403) {
                        const err = new Error(`[TheOddsApiProvider] Error de autenticación (${errStatus}). Verifique THE_ODDS_API_KEY.`);
                        err.status = errStatus;
                        throw err;
                    }
                    const err = new Error(`[TheOddsApiProvider] Error HTTP ${errStatus}: ${statusText}`);
                    err.status = errStatus;
                    throw err;
                }
                return await response.json();
            }
            catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error(`[TheOddsApiProvider] Timeout (8s) al consultar ${endpoint}`);
                }
                oddsUsageManager_js_1.oddsUsageManager.recordCall({
                    endpoint,
                    durationMs: Date.now() - startTime,
                    headers: responseHeaders,
                    error: error.message
                });
                throw error;
            }
        }, { maxRetries: 2, initialDelayMs: 500 });
    }
    async getSupportedSports() {
        const sports = await this.fetchApi('/sports');
        return sports.filter(s => s.active).map(s => ({ key: s.key, title: s.title }));
    }
    async getUpcomingOdds(sportKey) {
        const data = await this.fetchApi(`/sports/${sportKey}/odds/?regions=eu,us&markets=h2h,totals&oddsFormat=decimal`);
        const fetchedAt = new Date().toISOString();
        return data.map(item => ({
            id: item.id,
            sportKey: item.sport_key,
            sportTitle: item.sport_title,
            commenceTime: item.commence_time,
            homeTeam: item.home_team,
            awayTeam: item.away_team,
            isMock: false,
            isStale: false,
            fetchedAt,
            bookmakers: item.bookmakers.map(b => ({
                key: b.key,
                title: b.title,
                lastUpdate: b.last_update,
                markets: b.markets.map(m => ({
                    key: m.key,
                    lastUpdate: m.last_update,
                    outcomes: m.outcomes
                        .filter(o => odds_normalizer_js_1.OddsNormalizer.isValidOdds(o.price))
                        .map(o => ({
                        name: o.name,
                        price: o.price,
                        point: o.point
                    }))
                }))
            }))
        }));
    }
    async getMatchOdds(sportKey, eventId) {
        const all = await this.getUpcomingOdds(sportKey);
        const found = all.find(e => e.id === eventId);
        if (!found) {
            throw new Error(`[TheOddsApiProvider] Evento ${eventId} no encontrado en ${sportKey}`);
        }
        return found;
    }
    async getMatchOddsComparison(sportKey, eventId, requestedBookmakers) {
        const event = await this.getMatchOdds(sportKey, eventId);
        return odds_normalizer_js_1.OddsNormalizer.buildOddsComparison(event, requestedBookmakers);
    }
}
exports.TheOddsApiProvider = TheOddsApiProvider;
//# sourceMappingURL=theOddsApi.provider.js.map