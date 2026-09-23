import { globalCache } from './cache.service.js';
import { StructuredLogger } from '../utils/logger.js';

export const SPORTS_CACHE_TTL = {
  FIXTURES: 6 * 3600,     // 6 horas
  STANDINGS: 12 * 3600,   // 12 horas
  STATISTICS: 12 * 3600,  // 12 horas
  H2H: 24 * 3600,         // 24 horas
  INJURIES: 6 * 3600,     // 6 horas
  LINEUPS: 45 * 60,       // 45 minutos (30-90m antes del partido)
  RESULTS: 2 * 3600,      // 2 horas mientras haya partidos activos
  COMPETITIONS: 24 * 3600 // 24 horas
} as const;

export class SportsCacheService {
  private static instance: SportsCacheService;
  private logger = new StructuredLogger('SportsCacheService');

  private constructor() {}

  public static getInstance(): SportsCacheService {
    if (!SportsCacheService.instance) {
      SportsCacheService.instance = new SportsCacheService();
    }
    return SportsCacheService.instance;
  }

  public get<T>(key: string): T | null {
    const data = globalCache.get<T>(key);
    if (data) {
      this.logger.debug(`Cache HIT para clave '${key}'`);
      return data;
    }
    this.logger.debug(`Cache MISS para clave '${key}'`);
    return null;
  }

  public set<T>(key: string, value: T, ttlSeconds: number): void {
    globalCache.set(key, value, ttlSeconds);
    this.logger.debug(`Cache SET para clave '${key}' con TTL ${ttlSeconds}s`);
  }

  public invalidate(key: string): void {
    globalCache.delete(key);
  }

  public clear(): void {
    globalCache.clear();
  }
}

export const sportsCache = SportsCacheService.getInstance();
