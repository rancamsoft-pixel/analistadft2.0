"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsApiProvider = void 0;
const retry_js_1 = require("../../utils/retry.js");
class NewsApiProvider {
    providerName = 'NewsApiProvider';
    apiKey;
    baseUrl = 'https://newsapi.org/v2';
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('[NewsApiProvider] NEWS_API_KEY es requerida para el proveedor real.');
        }
        this.apiKey = apiKey;
    }
    async getTeamNews(teamName) {
        return (0, retry_js_1.withRetry)(async () => {
            const url = `${this.baseUrl}/everything?q=${encodeURIComponent(teamName)}&language=es&sortBy=publishedAt&pageSize=5&apiKey=${this.apiKey}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`[NewsApiProvider] Error HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return (data.articles || []).map((art, idx) => ({
                id: `news-${idx}-${Date.now()}`,
                title: art.title,
                description: art.description || '',
                source: art.source?.name || 'NewsAPI',
                url: art.url,
                publishedAt: art.publishedAt,
                imageUrl: art.urlToImage,
                sentiment: 'NEUTRAL',
                impact: 'MEDIUM',
                isMock: false
            }));
        });
    }
    async getMatchNews(homeTeam, awayTeam) {
        const query = `${homeTeam} ${awayTeam}`;
        return this.getTeamNews(query);
    }
}
exports.NewsApiProvider = NewsApiProvider;
//# sourceMappingURL=newsApi.provider.js.map