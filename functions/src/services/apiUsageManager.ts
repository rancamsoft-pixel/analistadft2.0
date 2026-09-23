import { StructuredLogger } from '../utils/logger.js';

export interface RequestLogParams {
  provider: string;
  endpoint: string;
  durationMs: number;
  error?: string | null;
  caller: string;
  requestsRemainingHeader?: number | null;
}

export type BudgetStatus = 'OK' | 'WARNING' | 'EXHAUSTED';

export interface DailyUsageStats {
  date: string;
  provider: string;
  requestsUsed: number;
  dailyBudgetLimit: number;
  requestsRemainingInBudget: number;
  status: BudgetStatus;
  warningAlert: boolean;
  lastUpdated: string;
}

export class ApiUsageManager {
  private static instance: ApiUsageManager;
  private logger = new StructuredLogger('ApiUsageManager');

  public readonly DAILY_BUDGET_LIMIT = 80; // Presupuesto diario máximo de seguridad
  public readonly WARNING_THRESHOLD = 64;   // 80% del presupuesto
  public readonly TOTAL_PLAN_LIMIT = 100;   // Límite total del plan gratuito (20 de reserva)

  // En memoria con sincronización periódica
  private dailyCounts: Map<string, number> = new Map();
  private requestLogs: Map<string, Array<Record<string, unknown>>> = new Map();

  private constructor() {}

  public static getInstance(): ApiUsageManager {
    if (!ApiUsageManager.instance) {
      ApiUsageManager.instance = new ApiUsageManager();
    }
    return ApiUsageManager.instance;
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0]!;
  }

  /**
   * Comprueba si el presupuesto permite realizar una nueva petición externa
   */
  public canMakeRequest(
    _provider: string = 'api-football',
    isCritical: boolean = false
  ): { allowed: boolean; remaining: number; status: BudgetStatus; currentUsed: number } {
    const today = this.getTodayString();
    const currentUsed = this.dailyCounts.get(today) || 0;
    const remaining = Math.max(0, this.DAILY_BUDGET_LIMIT - currentUsed);

    if (currentUsed >= this.DAILY_BUDGET_LIMIT) {
      if (isCritical && currentUsed < this.TOTAL_PLAN_LIMIT) {
        // Permitir uso de reserva solo para peticiones marcadas explícitamente como críticas
        this.logger.warn(`Uso de cuota de reserva para petición crítica (${currentUsed}/${this.TOTAL_PLAN_LIMIT})`);
        return { allowed: true, remaining: 0, status: 'EXHAUSTED', currentUsed };
      }

      this.logger.error(`Presupuesto diario excedido (${currentUsed}/${this.DAILY_BUDGET_LIMIT}). Petición externa bloqueada.`);
      return { allowed: false, remaining: 0, status: 'EXHAUSTED', currentUsed };
    }

    const status: BudgetStatus = currentUsed >= this.WARNING_THRESHOLD ? 'WARNING' : 'OK';

    if (status === 'WARNING') {
      this.logger.warn(`Alerta de cuota: Se ha alcanzado el 80% del presupuesto diario (${currentUsed}/${this.DAILY_BUDGET_LIMIT})`);
    }

    return { allowed: true, remaining, status, currentUsed };
  }

  /**
   * Registra los detalles estructurados de la llamada en provider_usage/{date}/requests/{requestId}
   */
  public async recordRequest(params: RequestLogParams): Promise<void> {
    const today = this.getTodayString();
    const currentCount = (this.dailyCounts.get(today) || 0) + 1;
    this.dailyCounts.set(today, currentCount);

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logEntry = {
      requestId,
      date: today,
      provider: params.provider,
      endpoint: params.endpoint,
      requestsUsed: currentCount,
      requestsRemainingInBudget: Math.max(0, this.DAILY_BUDGET_LIMIT - currentCount),
      requestsRemainingApiHeader: params.requestsRemainingHeader ?? null,
      error: params.error || null,
      durationMs: params.durationMs,
      caller: params.caller,
      timestamp: new Date().toISOString()
    };

    const logsForToday = this.requestLogs.get(today) || [];
    logsForToday.push(logEntry);
    this.requestLogs.set(today, logsForToday);

    this.logger.info(`Llamada a ${params.endpoint} registrada [${currentCount}/${this.DAILY_BUDGET_LIMIT}]`, {
      requestId,
      durationMs: params.durationMs,
      error: params.error
    });

    // En producción con Firestore conectado se puede persistir en db.collection('provider_usage').doc(today)...
  }

  /**
   * Consulta las estadísticas actuales para dashboards y paneles administrativos
   */
  public getDailyStats(date?: string): DailyUsageStats {
    const targetDate = date || this.getTodayString();
    const used = this.dailyCounts.get(targetDate) || 0;
    const remaining = Math.max(0, this.DAILY_BUDGET_LIMIT - used);
    const status: BudgetStatus =
      used >= this.DAILY_BUDGET_LIMIT ? 'EXHAUSTED' : used >= this.WARNING_THRESHOLD ? 'WARNING' : 'OK';

    return {
      date: targetDate,
      provider: 'api-football',
      requestsUsed: used,
      dailyBudgetLimit: this.DAILY_BUDGET_LIMIT,
      requestsRemainingInBudget: remaining,
      status,
      warningAlert: status === 'WARNING' || status === 'EXHAUSTED',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Para testing y reinicio
   */
  public resetCounts(): void {
    this.dailyCounts.clear();
    this.requestLogs.clear();
  }
}

export const apiUsageManager = ApiUsageManager.getInstance();
