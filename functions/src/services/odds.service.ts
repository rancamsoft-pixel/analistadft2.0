import { ProviderFactory } from '../providers/factory.js';
import { EventOdds, MatchOddsComparison, OddsProvider } from '../providers/odds/odds.interface.js';
import { globalCache } from './cache.service.js';
import { CircuitBreaker } from '../utils/circuitBreaker.js';
import { StructuredLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { OddsNormalizer } from '../providers/odds/odds.normalizer.js';
import { oddsSnapshotService } from './oddsSnapshot.service.js';

export class OddsService {
  private provider: OddsProvider;
  private circuitBreaker: CircuitBreaker;
  private logger = new StructuredLogger('OddsService');

  // Almacén de respaldo para servir último dato válido cuando la API esté caída
  private static staleFallbacks = new Map<string, { data: any; timestamp: string }>();

  constructor(provider?: OddsProvider) {
    this.provider = provider || ProviderFactory.getOddsProvider();
    this.circuitBreaker = new CircuitBreaker({
      serviceName: this.provider.providerName,
      failureThreshold: config.circuitBreaker.failureThreshold,
      recoveryTimeMs: config.circuitBreaker.recoveryTimeMs
    });
  }

  /**
   * Consulta global de cuotas para un deporte/liga con caché compartida (anti-N-consultas)
   */
  async getUpcomingOdds(sportKey: string): Promise<EventOdds[]> {
    this.logger.debug(`Consultando cuotas globales para ${sportKey}`);
    const cacheKey = `odds:global:upcoming:${sportKey}`;
    const cached = globalCache.get<EventOdds[]>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.circuitBreaker.execute(() => this.provider.getUpcomingOdds(sportKey));
      globalCache.set(cacheKey, data, 600); // 10 minutos de caché compartida

      // Guardar respaldo para fallback
      OddsService.staleFallbacks.set(cacheKey, {
        data,
        timestamp: new Date().toISOString()
      });

      return data;
    } catch (error) {
      this.logger.error(`Error consultando The Odds API para ${sportKey}. Verificando fallback stale...`, error as Error);
      const fallback = OddsService.staleFallbacks.get(cacheKey);

      if (fallback) {
        this.logger.warn(`Serviendo datos stale de respaldo para ${sportKey} capturados en ${fallback.timestamp}`);
        return (fallback.data as EventOdds[]).map(e => ({
          ...e,
          isStale: true,
          fetchedAt: fallback.timestamp
        }));
      }

      throw error;
    }
  }

  /**
   * Obtiene cuotas para un partido específico con fallback a stale
   */
  async getMatchOdds(sportKey: string, eventId: string): Promise<EventOdds> {
    const cacheKey = `odds:global:match:${sportKey}:${eventId}`;
    const cached = globalCache.get<EventOdds>(cacheKey);
    if (cached) return cached;

    try {
      const allUpcoming = await this.getUpcomingOdds(sportKey);
      const found = allUpcoming.find(e => e.id === eventId);

      if (found) {
        globalCache.set(cacheKey, found, 300); // 5 minutos
        OddsService.staleFallbacks.set(cacheKey, { data: found, timestamp: found.fetchedAt || new Date().toISOString() });
        return found;
      }

      const direct = await this.circuitBreaker.execute(() => this.provider.getMatchOdds(sportKey, eventId));
      globalCache.set(cacheKey, direct, 300);
      OddsService.staleFallbacks.set(cacheKey, { data: direct, timestamp: direct.fetchedAt || new Date().toISOString() });
      return direct;
    } catch (error) {
      const fallback = OddsService.staleFallbacks.get(cacheKey);
      if (fallback) {
        this.logger.warn(`Serviendo cuotas stale para evento ${eventId} capturadas en ${fallback.timestamp}`);
        return {
          ...(fallback.data as EventOdds),
          isStale: true,
          fetchedAt: fallback.timestamp
        };
      }
      throw error;
    }
  }

  /**
   * Genera la comparación estadística de cuotas entre casas para un partido
   */
  async getMatchOddsComparison(
    sportKey: string,
    eventId: string,
    requestedBookmakerIds?: string[]
  ): Promise<MatchOddsComparison> {
    const targetBookmakers = requestedBookmakerIds && requestedBookmakerIds.length > 0
      ? requestedBookmakerIds
      : ['pinnacle', 'bet365', 'betfair', '1xbet', 'betplay', 'wplay'];

    const cacheKey = `odds:comparison:${sportKey}:${eventId}:${[...targetBookmakers].sort().join('_')}`;
    const cached = globalCache.get<MatchOddsComparison>(cacheKey);
    if (cached) return cached;

    const event = await this.getMatchOdds(sportKey, eventId);
    const comparison = OddsNormalizer.buildOddsComparison(event, targetBookmakers);

    // Guardar snapshots históricos en Firestore para las mejores cuotas encontradas
    for (const sel of Object.values(comparison.selections)) {
      if (sel.bestOdds) {
        oddsSnapshotService.recordSnapshot({
          matchId: eventId,
          bookmaker: sel.bestOdds.bookmakerName,
          market: sel.market,
          selection: sel.selection,
          line: sel.line,
          odds: sel.bestOdds.price,
          trigger: 'on_demand'
        });
      }
    }

    globalCache.set(cacheKey, comparison, 180); // 3 minutos
    return comparison;
  }

  async getSupportedSports(): Promise<Array<{ key: string; title: string }>> {
    const cacheKey = 'odds:supportedSports';
    const cached = globalCache.get<Array<{ key: string; title: string }>>(cacheKey);
    if (cached) return cached;

    const sports = await this.circuitBreaker.execute(() => this.provider.getSupportedSports());
    globalCache.set(cacheKey, sports, 86400); // 24 horas
    return sports;
  }
}
