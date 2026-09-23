"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const factory_js_1 = require("../providers/factory.js");
const cache_service_js_1 = require("./cache.service.js");
class NewsService {
    provider;
    constructor(provider) {
        this.provider = provider || factory_js_1.ProviderFactory.getNewsProvider();
    }
    async getMatchNews(homeTeam, awayTeam) {
        const cacheKey = `news:${homeTeam}:${awayTeam}`;
        const cached = cache_service_js_1.globalCache.get(cacheKey);
        if (cached)
            return cached;
        const articles = await this.provider.getMatchNews(homeTeam, awayTeam);
        cache_service_js_1.globalCache.set(cacheKey, articles, 1800); // 30 minutos
        return articles;
    }
}
exports.NewsService = NewsService;
//# sourceMappingURL=news.service.js.map