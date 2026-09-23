import { NewsProvider, SportNewsArticle } from './news.interface.js';
import { withRetry } from '../../utils/retry.js';

export class NewsApiProvider implements NewsProvider {
  readonly providerName = 'NewsApiProvider';
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('[NewsApiProvider] NEWS_API_KEY es requerida para el proveedor real.');
    }
    this.apiKey = apiKey;
  }

  async getTeamNews(teamName: string): Promise<SportNewsArticle[]> {
    return withRetry(async () => {
      const url = `${this.baseUrl}/everything?q=${encodeURIComponent(teamName)}&language=es&sortBy=publishedAt&pageSize=5&apiKey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`[NewsApiProvider] Error HTTP ${response.status}: ${response.statusText}`);
      }
      interface NewsApiResponse {
        articles: Array<{
          title: string;
          description: string;
          source: { name: string };
          url: string;
          publishedAt: string;
          urlToImage?: string;
        }>;
      }
      const data = await response.json() as NewsApiResponse;
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

  async getMatchNews(homeTeam: string, awayTeam: string): Promise<SportNewsArticle[]> {
    const query = `${homeTeam} ${awayTeam}`;
    return this.getTeamNews(query);
  }
}
