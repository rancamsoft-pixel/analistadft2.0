"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderFactory = void 0;
const index_js_1 = require("../config/index.js");
const mockSports_provider_js_1 = require("./sports/mockSports.provider.js");
const apiFootball_provider_js_1 = require("./sports/apiFootball.provider.js");
const mockOdds_provider_js_1 = require("./odds/mockOdds.provider.js");
const theOddsApi_provider_js_1 = require("./odds/theOddsApi.provider.js");
const mockNews_provider_js_1 = require("./news/mockNews.provider.js");
const newsApi_provider_js_1 = require("./news/newsApi.provider.js");
const mockAi_provider_js_1 = require("./ai/mockAi.provider.js");
const gemini_provider_js_1 = require("./ai/gemini.provider.js");
const gemini_context_provider_js_1 = require("./ai/gemini.context.provider.js");
const mock_context_provider_js_1 = require("./ai/mock.context.provider.js");
class ProviderFactory {
    static getSportsProvider() {
        if (index_js_1.config.isMockMode || !index_js_1.config.apiKeys.apiFootball) {
            return new mockSports_provider_js_1.MockSportsProvider();
        }
        return new apiFootball_provider_js_1.ApiFootballProvider(index_js_1.config.apiKeys.apiFootball);
    }
    static getOddsProvider() {
        if (index_js_1.config.isMockMode || !index_js_1.config.apiKeys.theOddsApi) {
            return new mockOdds_provider_js_1.MockOddsProvider();
        }
        return new theOddsApi_provider_js_1.TheOddsApiProvider(index_js_1.config.apiKeys.theOddsApi);
    }
    static getNewsProvider() {
        if (index_js_1.config.isMockMode || !index_js_1.config.apiKeys.newsApi) {
            return new mockNews_provider_js_1.MockNewsProvider();
        }
        return new newsApi_provider_js_1.NewsApiProvider(index_js_1.config.apiKeys.newsApi);
    }
    static getAIProvider() {
        if (index_js_1.config.isMockMode || !index_js_1.config.apiKeys.gemini) {
            return new mockAi_provider_js_1.MockAIProvider();
        }
        return new gemini_provider_js_1.GeminiProvider(index_js_1.config.apiKeys.gemini);
    }
    /**
     * Proveedor de análisis de contexto (Gemini como analista de contexto).
     * Retorna mock si isMockMode o si no hay GEMINI_API_KEY.
     */
    static getContextAnalysisProvider() {
        if (index_js_1.config.isMockMode || !index_js_1.config.apiKeys.gemini) {
            return new mock_context_provider_js_1.MockContextProvider();
        }
        return new gemini_context_provider_js_1.GeminiContextProvider(index_js_1.config.apiKeys.gemini, index_js_1.config.geminiModel);
    }
}
exports.ProviderFactory = ProviderFactory;
//# sourceMappingURL=factory.js.map