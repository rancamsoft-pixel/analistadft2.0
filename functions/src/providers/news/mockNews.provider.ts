import { NewsProvider, SportNewsArticle } from './news.interface.js';

export const MOCK_NEWS_ARTICLES: SportNewsArticle[] = [
  {
    id: 'news-1',
    title: 'Informe de Lesiones: El delantero estrella listo para el derbi',
    description: 'Completó los entrenamientos sin molestias y estará en la alineación titular este fin de semana.',
    source: 'Sports Intelligence News',
    url: 'https://example.com/sports-news/1',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    sentiment: 'POSITIVE',
    impact: 'HIGH',
    isMock: true
  },
  {
    id: 'news-2',
    title: 'Cambio táctico confirmado para la zaga defensiva',
    description: 'El cuerpo técnico optará por una formación 4-3-3 más compacta para frenar las transiciones rápidas.',
    source: 'Tactical Review',
    url: 'https://example.com/sports-news/2',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    sentiment: 'NEUTRAL',
    impact: 'MEDIUM',
    isMock: true
  }
];

export class MockNewsProvider implements NewsProvider {
  readonly providerName = 'MockNewsProvider';

  async getTeamNews(_teamName: string): Promise<SportNewsArticle[]> {
    return Promise.resolve(MOCK_NEWS_ARTICLES);
  }

  async getMatchNews(_homeTeam: string, _awayTeam: string): Promise<SportNewsArticle[]> {
    return Promise.resolve(MOCK_NEWS_ARTICLES);
  }
}
