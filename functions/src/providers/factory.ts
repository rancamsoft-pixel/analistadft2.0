import { config } from '../config/index.js';
import { SportsDataProvider } from './sports/sports.interface.js';
import { MockSportsProvider } from './sports/mockSports.provider.js';
import { ApiFootballProvider } from './sports/apiFootball.provider.js';

import { OddsProvider } from './odds/odds.interface.js';
import { MockOddsProvider } from './odds/mockOdds.provider.js';
import { TheOddsApiProvider } from './odds/theOddsApi.provider.js';

import { NewsProvider } from './news/news.interface.js';
import { MockNewsProvider } from './news/mockNews.provider.js';
import { NewsApiProvider } from './news/newsApi.provider.js';

import { AIProvider } from './ai/ai.interface.js';
import { MockAIProvider } from './ai/mockAi.provider.js';
import { GeminiProvider } from './ai/gemini.provider.js';

import { ContextAnalysisProvider } from './ai/context.interface.js';
import { GeminiContextProvider } from './ai/gemini.context.provider.js';
import { MockContextProvider } from './ai/mock.context.provider.js';

export class ProviderFactory {
  static getSportsProvider(): SportsDataProvider {
    if (config.isMockMode || !config.apiKeys.apiFootball) {
      return new MockSportsProvider();
    }
    return new ApiFootballProvider(config.apiKeys.apiFootball);
  }

  static getOddsProvider(): OddsProvider {
    if (config.isMockMode || !config.apiKeys.theOddsApi) {
      return new MockOddsProvider();
    }
    return new TheOddsApiProvider(config.apiKeys.theOddsApi);
  }

  static getNewsProvider(): NewsProvider {
    if (config.isMockMode || !config.apiKeys.newsApi) {
      return new MockNewsProvider();
    }
    return new NewsApiProvider(config.apiKeys.newsApi);
  }

  static getAIProvider(): AIProvider {
    if (config.isMockMode || !config.apiKeys.gemini) {
      return new MockAIProvider();
    }
    return new GeminiProvider(config.apiKeys.gemini);
  }

  /**
   * Proveedor de análisis de contexto (Gemini como analista de contexto).
   * Retorna mock si isMockMode o si no hay GEMINI_API_KEY.
   */
  static getContextAnalysisProvider(): ContextAnalysisProvider {
    if (config.isMockMode || !config.apiKeys.gemini) {
      return new MockContextProvider();
    }
    return new GeminiContextProvider(config.apiKeys.gemini, config.geminiModel);
  }
}
