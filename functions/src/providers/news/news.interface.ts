export interface SportNewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  imageUrl?: string;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
  isMock?: boolean;
}

export interface NewsProvider {
  readonly providerName: string;
  getTeamNews(teamName: string): Promise<SportNewsArticle[]>;
  getMatchNews(homeTeam: string, awayTeam: string): Promise<SportNewsArticle[]>;
}
