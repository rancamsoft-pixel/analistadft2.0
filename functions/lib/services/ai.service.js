"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const factory_js_1 = require("../providers/factory.js");
const cache_service_js_1 = require("./cache.service.js");
const index_js_1 = require("../config/index.js");
const rateLimiter_js_1 = require("../utils/rateLimiter.js");
class AIService {
    provider;
    rateLimiter;
    constructor(provider) {
        this.provider = provider || factory_js_1.ProviderFactory.getAIProvider();
        this.rateLimiter = new rateLimiter_js_1.SlidingWindowRateLimiter({
            windowMs: 60000,
            maxRequests: index_js_1.config.rateLimit.maxRequestsPerMinute
        });
    }
    async getMatchAnalysis(prompt) {
        const cacheKey = `ai:analysis:${prompt.matchId}`;
        const cached = cache_service_js_1.globalCache.get(cacheKey);
        if (cached)
            return cached;
        const rateCheck = this.rateLimiter.isAllowed('ai-analysis');
        if (!rateCheck.allowed) {
            throw new Error(`[AIService] Límite de tasa excedido. Intente nuevamente en ${Math.ceil(rateCheck.resetMs / 1000)}s.`);
        }
        const result = await this.provider.generateMatchAnalysis(prompt);
        cache_service_js_1.globalCache.set(cacheKey, result, index_js_1.config.cache.analysisTtlSeconds);
        return result;
    }
    async evaluateBetValue(selection, market, currentOdds, estimatedProbability) {
        return this.provider.evaluateBetValue(selection, market, currentOdds, estimatedProbability);
    }
}
exports.AIService = AIService;
//# sourceMappingURL=ai.service.js.map