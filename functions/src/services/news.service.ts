import { ProviderFactory } from '../providers/factory.js';
import { NewsProvider, SportNewsArticle } from '../providers/news/news.interface.js';
import { globalCache } from './cache.service.js';

export class NewsService {
  private provider: NewsProvider;

  constructor(provider?: NewsProvider) {
    this.provider = provider || ProviderFactory.getNewsProvider();
  }

  async getMatchNews(homeTeam: string, awayTeam: string): Promise<SportNewsArticle[]> {
    const cacheKey = `news:${homeTeam}:${awayTeam}`;
    const cached = globalCache.get<SportNewsArticle[]>(cacheKey);
    if (cached) return cached;

    const articles = await this.provider.getMatchNews(homeTeam, awayTeam);
    globalCache.set(cacheKey, articles, 1800); // 30 minutos
    return articles;
  }
}
