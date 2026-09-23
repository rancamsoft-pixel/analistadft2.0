import { OddsSnapshot } from '../providers/odds/odds.interface.js';
import { StructuredLogger } from '../utils/logger.js';

export class OddsSnapshotService {
  private logger = new StructuredLogger('OddsSnapshotService');
  // Memoria local de último snapshot por clave para evitar escritura redundante
  private lastSnapshots = new Map<string, { odds: number; timestamp: number }>();
  private snapshotsHistory: OddsSnapshot[] = [];

  // Umbral mínimo de variación porcentual para justificar un snapshot intermedio (1.5%)
  private readonly SIGNIFICANT_CHANGE_THRESHOLD = 0.015;
  // Intervalo mínimo entre snapshots para una misma selección salvo cambio drástico (30 minutos)
  private readonly MIN_INTERVAL_MS = 30 * 60 * 1000;

  /**
   * Genera clave única para identificar una cuota particular
   */
  private buildKey(matchId: string, bookmaker: string, market: string, selection?: string, line?: number): string {
    return `${matchId}_${bookmaker}_${market}_${selection || 'any'}${line ? `_${line}` : ''}`;
  }

  /**
   * Evalúa si amerita guardar un snapshot histórico
   */
  public shouldCaptureSnapshot(
    matchId: string,
    bookmaker: string,
    market: string,
    newOdds: number,
    selection?: string,
    line?: number,
    forceTrigger?: 'daily' | 'pre_match' | 'on_demand'
  ): boolean {
    // Si es un trigger programado clave (análisis diario o pre-partido), siempre se toma
    if (forceTrigger === 'daily' || forceTrigger === 'pre_match') {
      return true;
    }

    const key = this.buildKey(matchId, bookmaker, market, selection, line);
    const last = this.lastSnapshots.get(key);

    if (!last) return true;

    const timeDiff = Date.now() - last.timestamp;
    const priceChange = Math.abs(newOdds - last.odds) / last.odds;

    // Solo capturar si hubo un cambio significativo de cuota (> 1.5%) o pasó el intervalo mínimo
    return priceChange >= this.SIGNIFICANT_CHANGE_THRESHOLD || timeDiff >= this.MIN_INTERVAL_MS;
  }

  /**
   * Captura y almacena un snapshot
   */
  public recordSnapshot(params: {
    matchId: string;
    bookmaker: string;
    market: string;
    odds: number;
    selection?: string;
    line?: number;
    trigger?: 'daily' | 'pre_match' | 'on_demand';
  }): OddsSnapshot | null {
    const trigger = params.trigger || 'on_demand';
    const shouldSave = this.shouldCaptureSnapshot(
      params.matchId,
      params.bookmaker,
      params.market,
      params.odds,
      params.selection,
      params.line,
      trigger
    );

    if (!shouldSave) {
      return null;
    }

    const key = this.buildKey(params.matchId, params.bookmaker, params.market, params.selection, params.line);
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const capturedAt = new Date().toISOString();

    const snapshot: OddsSnapshot = {
      snapshotId,
      matchId: params.matchId,
      bookmaker: params.bookmaker,
      market: params.market,
      selection: params.selection,
      line: params.line,
      odds: params.odds,
      capturedAt,
      trigger
    };

    this.lastSnapshots.set(key, { odds: params.odds, timestamp: Date.now() });
    this.snapshotsHistory.push(snapshot);

    this.logger.info(`Snapshot histórico capturado [${snapshot.bookmaker} - ${snapshot.market}: ${snapshot.odds}]`, {
      snapshotId,
      matchId: snapshot.matchId,
      trigger
    });

    return snapshot;
  }

  /**
   * Obtiene todos los snapshots para un partido específico ordenados por fecha
   */
  public getSnapshotsForMatch(matchId: string): OddsSnapshot[] {
    return this.snapshotsHistory.filter(s => s.matchId === matchId);
  }

  /**
   * Para testing
   */
  public reset(): void {
    this.lastSnapshots.clear();
    this.snapshotsHistory = [];
  }
}

export const oddsSnapshotService = new OddsSnapshotService();
