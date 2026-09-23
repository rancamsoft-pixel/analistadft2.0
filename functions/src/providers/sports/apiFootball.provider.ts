import {
  Competition,
  HeadToHead,
  InjuryReport,
  MatchLineup,
  MatchPrediction,
  MatchStatistics,
  Season,
  SportMatch,
  SportMatchDetails,
  SportsDataProvider,
  SquadPlayer,
  StandingsTable
} from './sports.interface.js';
import { ApiFootballNormalizer } from './apiFootball.normalizer.js';
import { apiUsageManager } from '../../services/apiUsageManager.js';
import { sportsCache, SPORTS_CACHE_TTL } from '../../services/sportsCache.service.js';
import { ConcurrencyQueue } from '../../utils/concurrencyQueue.js';
import { withRetry } from '../../utils/retry.js';
import { CircuitBreaker } from '../../utils/circuitBreaker.js';
import { StructuredLogger } from '../../utils/logger.js';

export class ApiFootballProvider implements SportsDataProvider {
  readonly providerName = 'ApiFootballProvider';
  private apiKey: string;
  private baseUrl = 'https://v3.football.api-sports.io';
  private queue = new ConcurrencyQueue(2); // Máximo 2 llamadas simultáneas
  private circuitBreaker: CircuitBreaker;
  private logger = new StructuredLogger('ApiFootballProvider');

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('[ApiFootballProvider] Configuración inválida: API_FOOTBALL_KEY es requerida y no puede estar vacía.');
    }
    this.apiKey = apiKey.trim();
    this.circuitBreaker = new CircuitBreaker({
      serviceName: 'ApiFootballProvider',
      failureThreshold: 4,
      recoveryTimeMs: 45000 // 45 segundos si el proveedor está caído
    });
  }

  /**
   * Ejecuta peticiones HTTP a API-Football pasando por:
   * 1. Presupuesto (ApiUsageManager <= 80 req/día)
   * 2. Cola de concurrencia (máx 2)
   * 3. Circuit breaker
   * 4. Reintentos exponenciales
   * 5. Timeout con AbortController (8 segundos)
   */
  private async executeFetch<T>(endpoint: string, caller: string = 'system'): Promise<T> {
    // 1. Verificación de Presupuesto Diario (Límite 80 requests/día)
    const budgetCheck = apiUsageManager.canMakeRequest(this.providerName);
    if (!budgetCheck.allowed) {
      throw new Error(
        `[ApiUsageManager] Presupuesto diario agotado (${budgetCheck.currentUsed}/80 requests utilizadas). Solicitud a '${endpoint}' bloqueada para proteger la cuota.`
      );
    }

    // 2. Ejecución dentro de la cola de concurrencia
    return this.queue.run(async () => {
      this.logger.debug(`Iniciando solicitud a ${endpoint}`);
      return this.circuitBreaker.execute(async () => {
        const startTime = Date.now();
        let requestError: string | null = null;
        let remainingApiHeader: number | null = null;

        try {
          const result = await withRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout

            try {
              const url = `${this.baseUrl}${endpoint}`;
              const response = await fetch(url, {
                headers: {
                  'x-apisports-key': this.apiKey
                },
                signal: controller.signal
              });

              // Header de peticiones restantes reportado por API-Football
              const remH = response.headers.get('x-ratelimit-requests-remaining');
              if (remH) remainingApiHeader = parseInt(remH, 10);

              if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                  throw new Error(`[ApiFootballProvider] Error de autenticación HTTP ${response.status}: API Key inválida o no autorizada.`);
                }
                throw new Error(`[ApiFootballProvider] Error HTTP ${response.status}: ${response.statusText}`);
              }

              const json = await response.json() as { response: T; errors?: Record<string, string> };

              if (json.errors && Object.keys(json.errors).length > 0) {
                const errStr = JSON.stringify(json.errors);
                throw new Error(`[ApiFootballProvider] Error en respuesta de API: ${errStr}`);
              }

              return json.response;
            } finally {
              clearTimeout(timeoutId);
            }
          }, {
            maxRetries: 2,
            initialDelayMs: 800,
            shouldRetry: (err) => {
              const msg = (err as Error).message || '';
              // No reintentar si la clave es inválida
              return !msg.includes('401') && !msg.includes('403') && !msg.includes('inválida');
            }
          });

          return result;
        } catch (err) {
          requestError = (err as Error).message;
          throw err;
        } finally {
          const durationMs = Date.now() - startTime;
          // Registrar uso en ApiUsageManager
          await apiUsageManager.recordRequest({
            provider: this.providerName,
            endpoint,
            durationMs,
            error: requestError,
            caller,
            requestsRemainingHeader: remainingApiHeader
          });
        }
      });
    });
  }

  // 1. Obtener competiciones
  async getCompetitions(): Promise<Competition[]> {
    const cacheKey = 'apifootball:competitions';
    const cached = sportsCache.get<Competition[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>('/leagues?current=true', 'getCompetitions');
    const normalized = ApiFootballNormalizer.normalizeCompetitions(raw.slice(0, 15));
    sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.COMPETITIONS);
    return normalized;
  }

  // 2. Obtener temporadas
  async getSeasons(competitionId: string): Promise<Season[]> {
    const cacheKey = `apifootball:seasons:${competitionId}`;
    const cached = sportsCache.get<Season[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(`/leagues/seasons?league=${competitionId}`, 'getSeasons');
    const normalized = ApiFootballNormalizer.normalizeSeasons(raw);
    sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.COMPETITIONS);
    return normalized;
  }

  // 3. Obtener próximos partidos
  async getUpcomingMatches(competitionId?: string, date?: string): Promise<SportMatch[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const compParam = competitionId ? `&league=${competitionId}` : '';
    const cacheKey = `apifootball:fixtures:upcoming:${competitionId || 'all'}:${targetDate}`;

    const cached = sportsCache.get<SportMatch[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(
      `/fixtures?date=${targetDate}&status=NS${compParam}`,
      'getUpcomingMatches'
    );
    const normalized = (raw || []).map(r => ApiFootballNormalizer.normalizeMatch(r));

    // Cache con TTL de 6 horas
    sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.FIXTURES);
    return normalized;
  }

  // 4. Obtener resultados
  async getResults(competitionId?: string, lastN: number = 10): Promise<SportMatch[]> {
    const compParam = competitionId ? `&league=${competitionId}` : '';
    const cacheKey = `apifootball:fixtures:results:${competitionId || 'all'}:${lastN}`;

    const cached = sportsCache.get<SportMatch[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(
      `/fixtures?last=${lastN}&status=FT${compParam}`,
      'getResults'
    );
    const normalized = (raw || []).map(r => ApiFootballNormalizer.normalizeMatch(r));

    sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.RESULTS);
    return normalized;
  }

  // 5. Obtener standings
  async getStandings(competitionId: string, season?: string): Promise<StandingsTable> {
    const targetSeason = season || '2024';
    const cacheKey = `apifootball:standings:${competitionId}:${targetSeason}`;

    const cached = sportsCache.get<StandingsTable>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(
      `/standings?league=${competitionId}&season=${targetSeason}`,
      'getStandings'
    );
    const normalized = ApiFootballNormalizer.normalizeStandings(competitionId, targetSeason, raw);

    sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.STANDINGS);
    return normalized;
  }

  // 6. Obtener estadísticas
  async getStatistics(matchId: string): Promise<MatchStatistics> {
    const cleanId = matchId.replace('apifootball_', '');
    const cacheKey = `apifootball:stats:${cleanId}`;

    const cached = sportsCache.get<MatchStatistics>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(
      `/fixtures/statistics?fixture=${cleanId}`,
      'getStatistics'
    );
    const normalized = ApiFootballNormalizer.normalizeStatistics(raw);

    sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.STATISTICS);
    return normalized;
  }

  // 7. Obtener enfrentamientos H2H
  async getH2H(teamAId: string, teamBId: string): Promise<HeadToHead> {
    const cacheKey = `apifootball:h2h:${teamAId}-${teamBId}`;
    const cached = sportsCache.get<HeadToHead>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(
      `/fixtures/headtohead?h2h=${teamAId}-${teamBId}`,
      'getH2H'
    );
    const normalized = ApiFootballNormalizer.normalizeH2H(raw);

    sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.H2H);
    return normalized;
  }

  // 8. Obtener lesiones
  async getInjuries(matchId: string): Promise<InjuryReport[]> {
    const cleanId = matchId.replace('apifootball_', '');
    const cacheKey = `apifootball:injuries:${cleanId}`;

    const cached = sportsCache.get<InjuryReport[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(
      `/injuries?fixture=${cleanId}`,
      'getInjuries'
    );
    const normalized = ApiFootballNormalizer.normalizeInjuries(raw);

    sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.INJURIES);
    return normalized;
  }

  // 9. Obtener jugadores disponibles (Squad)
  async getSquad(teamId: string): Promise<SquadPlayer[]> {
    const cacheKey = `apifootball:squad:${teamId}`;
    const cached = sportsCache.get<SquadPlayer[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(
      `/players/squads?team=${teamId}`,
      'getSquad'
    );
    const normalized = ApiFootballNormalizer.normalizeSquad(raw);

    sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.COMPETITIONS);
    return normalized;
  }

  // 10. Obtener alineaciones
  async getLineups(matchId: string): Promise<{ home: MatchLineup; away: MatchLineup } | null> {
    const cleanId = matchId.replace('apifootball_', '');
    const cacheKey = `apifootball:lineups:${cleanId}`;

    const cached = sportsCache.get<{ home: MatchLineup; away: MatchLineup } | null>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(
      `/fixtures/lineups?fixture=${cleanId}`,
      'getLineups'
    );
    const normalized = ApiFootballNormalizer.normalizeLineups(raw);

    if (normalized) {
      sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.LINEUPS);
    }
    return normalized;
  }

  // 11. Obtener predicciones
  async getPredictions(matchId: string): Promise<MatchPrediction | null> {
    const cleanId = matchId.replace('apifootball_', '');
    const cacheKey = `apifootball:predictions:${cleanId}`;

    const cached = sportsCache.get<MatchPrediction | null>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(
      `/predictions?fixture=${cleanId}`,
      'getPredictions'
    );
    const normalized = ApiFootballNormalizer.normalizePredictions(raw?.[0]);

    if (normalized) {
      sportsCache.set(cacheKey, normalized, SPORTS_CACHE_TTL.FIXTURES);
    }
    return normalized;
  }

  // Partidos en vivo
  async getLiveMatches(competitionId?: string): Promise<SportMatch[]> {
    const compParam = competitionId ? `&league=${competitionId}` : '';
    const cacheKey = `apifootball:live:${competitionId || 'all'}`;

    // TTL corto de 45 segundos para partidos en vivo
    const cached = sportsCache.get<SportMatch[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(
      `/fixtures?live=all${compParam}`,
      'getLiveMatches'
    );
    const normalized = (raw || []).map(r => ApiFootballNormalizer.normalizeMatch(r));

    sportsCache.set(cacheKey, normalized, 45);
    return normalized;
  }

  // Detalle unificado de partido
  async getMatchDetails(matchId: string): Promise<SportMatchDetails> {
    const cleanId = matchId.replace('apifootball_', '');
    const cacheKey = `apifootball:details:${cleanId}`;

    const cached = sportsCache.get<SportMatchDetails>(cacheKey);
    if (cached) return cached;

    const raw = await this.executeFetch<any[]>(`/fixtures?id=${cleanId}`, 'getMatchDetails');
    const baseMatch = ApiFootballNormalizer.normalizeMatch(raw?.[0]);

    // Consultar stats opcionales con tolerancia a fallos
    let statistics: MatchStatistics | undefined;
    try {
      statistics = await this.getStatistics(matchId);
    } catch { /* continuar si no hay stats */ }

    const fullDetails: SportMatchDetails = {
      ...baseMatch,
      statistics
    };

    sportsCache.set(cacheKey, fullDetails, SPORTS_CACHE_TTL.FIXTURES);
    return fullDetails;
  }
}
