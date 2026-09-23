import { EventOdds, MatchOddsComparison, OddsProvider } from './odds.interface.js';
import { withRetry } from '../../utils/retry.js';
import { oddsUsageManager } from '../../services/oddsUsageManager.js';
import { OddsNormalizer } from './odds.normalizer.js';

export class TheOddsApiProvider implements OddsProvider {
  readonly providerName = 'TheOddsApiProvider';
  private apiKey: string;
  private baseUrl = 'https://api.the-odds-api.com/v4';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('[TheOddsApiProvider] THE_ODDS_API_KEY es requerida para el proveedor real.');
    }
    this.apiKey = apiKey;
  }

  private async fetchApi<T>(endpoint: string): Promise<T> {
    const budget = oddsUsageManager.canMakeRequest();
    if (!budget.allowed) {
      throw new Error('[TheOddsApiProvider] Presupuesto de créditos agotado para The Odds API. Servir desde caché.');
    }

    const startTime = Date.now();
    let responseHeaders: Headers | undefined;

    return withRetry(async () => {
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${this.baseUrl}${endpoint}${separator}apiKey=${this.apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        responseHeaders = response.headers;

        const durationMs = Date.now() - startTime;
        oddsUsageManager.recordCall({
          endpoint,
          durationMs,
          headers: response.headers
        });

        if (!response.ok) {
          const errStatus = response.status;
          const statusText = response.statusText;
          if (errStatus === 401 || errStatus === 403) {
            const err = new Error(`[TheOddsApiProvider] Error de autenticación (${errStatus}). Verifique THE_ODDS_API_KEY.`);
            (err as any).status = errStatus;
            throw err;
          }
          const err = new Error(`[TheOddsApiProvider] Error HTTP ${errStatus}: ${statusText}`);
          (err as any).status = errStatus;
          throw err;
        }

        return await response.json() as T;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`[TheOddsApiProvider] Timeout (8s) al consultar ${endpoint}`);
        }
        oddsUsageManager.recordCall({
          endpoint,
          durationMs: Date.now() - startTime,
          headers: responseHeaders,
          error: error.message
        });
        throw error;
      }
    }, { maxRetries: 2, initialDelayMs: 500 });
  }

  async getSupportedSports(): Promise<Array<{ key: string; title: string }>> {
    interface SportResponse {
      key: string;
      title: string;
      active: boolean;
    }
    const sports = await this.fetchApi<SportResponse[]>('/sports');
    return sports.filter(s => s.active).map(s => ({ key: s.key, title: s.title }));
  }

  async getUpcomingOdds(sportKey: string): Promise<EventOdds[]> {
    interface RawEventOdds {
      id: string;
      sport_key: string;
      sport_title: string;
      commence_time: string;
      home_team: string;
      away_team: string;
      bookmakers: Array<{
        key: string;
        title: string;
        last_update: string;
        markets: Array<{
          key: string;
          last_update: string;
          outcomes: Array<{ name: string; price: number; point?: number }>;
        }>;
      }>;
    }

    const data = await this.fetchApi<RawEventOdds[]>(
      `/sports/${sportKey}/odds/?regions=eu,us&markets=h2h,totals&oddsFormat=decimal`
    );

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
          key: m.key as 'h2h' | 'totals',
          lastUpdate: m.last_update,
          outcomes: m.outcomes
            .filter(o => OddsNormalizer.isValidOdds(o.price))
            .map(o => ({
              name: o.name,
              price: o.price,
              point: o.point
            }))
        }))
      }))
    }));
  }

  async getMatchOdds(sportKey: string, eventId: string): Promise<EventOdds> {
    const all = await this.getUpcomingOdds(sportKey);
    const found = all.find(e => e.id === eventId);
    if (!found) {
      throw new Error(`[TheOddsApiProvider] Evento ${eventId} no encontrado en ${sportKey}`);
    }
    return found;
  }

  async getMatchOddsComparison(
    sportKey: string,
    eventId: string,
    requestedBookmakers?: string[]
  ): Promise<MatchOddsComparison> {
    const event = await this.getMatchOdds(sportKey, eventId);
    return OddsNormalizer.buildOddsComparison(event, requestedBookmakers);
  }
}
