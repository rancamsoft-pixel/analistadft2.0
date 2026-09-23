import { StructuredLogger } from '../utils/logger.js';

export interface OddsUsageStats {
  provider: 'the-odds-api';
  monthlyLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  lastQuery: string | null;
  lastError: string | null;
  status: 'OK' | 'WARNING' | 'EXHAUSTED';
  warningAlert: boolean;
  estimatedCostPerQuery: number; // en créditos
  lastUpdated: string;
}

export class OddsUsageManager {
  private logger = new StructuredLogger('OddsUsageManager');
  private monthlyLimit = 500; // Plan base de The Odds API
  private creditsUsed = 0;
  private creditsRemaining = 500;
  private lastQuery: string | null = null;
  private lastError: string | null = null;
  private readonly WARNING_THRESHOLD_PERCENT = 0.8; // 80% (400 créditos)

  constructor(customLimit?: number) {
    if (customLimit) {
      this.monthlyLimit = customLimit;
      this.creditsRemaining = customLimit;
    }
  }

  /**
   * Registra los detalles de una llamada consumida a The Odds API
   * Leyendo las cabeceras estándar x-requests-remaining y x-requests-used
   */
  public recordCall(params: {
    endpoint: string;
    durationMs: number;
    headers?: Record<string, string | null | undefined> | Headers;
    error?: string;
  }): void {
    this.lastQuery = new Date().toISOString();
    this.lastError = params.error || null;

    if (params.headers) {
      let remainingHeader: string | null = null;
      let usedHeader: string | null = null;

      if (typeof (params.headers as any).get === 'function') {
        // Objeto Headers de fetch
        const h = params.headers as Headers;
        remainingHeader = h.get('x-requests-remaining');
        usedHeader = h.get('x-requests-used');
      } else {
        // Objeto plano Record
        const h = params.headers as Record<string, string | null | undefined>;
        remainingHeader = h['x-requests-remaining'] || h['X-Requests-Remaining'] || null;
        usedHeader = h['x-requests-used'] || h['X-Requests-Used'] || null;
      }

      if (remainingHeader !== null && !isNaN(Number(remainingHeader))) {
        this.creditsRemaining = Number(remainingHeader);
      } else {
        this.creditsRemaining = Math.max(0, this.creditsRemaining - 1);
      }

      if (usedHeader !== null && !isNaN(Number(usedHeader))) {
        this.creditsUsed = Number(usedHeader);
      } else {
        this.creditsUsed++;
      }
    } else {
      this.creditsUsed++;
      this.creditsRemaining = Math.max(0, this.monthlyLimit - this.creditsUsed);
    }

    const currentStatus = this.getStatus();

    this.logger.info(`Llamada registrada a ${params.endpoint} [Créditos restantes: ${this.creditsRemaining}/${this.monthlyLimit}]`, {
      creditsUsed: this.creditsUsed,
      creditsRemaining: this.creditsRemaining,
      status: currentStatus,
      durationMs: params.durationMs,
      error: params.error
    });

    if (currentStatus === 'WARNING') {
      this.logger.warn(`Alerta de cuota The Odds API: 80% alcanzado (${this.creditsUsed}/${this.monthlyLimit})`);
    } else if (currentStatus === 'EXHAUSTED') {
      this.logger.error(`Cuota de The Odds API agotada (${this.creditsUsed}/${this.monthlyLimit}). Activando fallback de caché.`);
    }
  }

  /**
   * Determina el estado actual del presupuesto
   */
  public getStatus(): 'OK' | 'WARNING' | 'EXHAUSTED' {
    if (this.creditsRemaining <= 0 || this.creditsUsed >= this.monthlyLimit) {
      return 'EXHAUSTED';
    }
    if (this.creditsUsed >= this.monthlyLimit * this.WARNING_THRESHOLD_PERCENT) {
      return 'WARNING';
    }
    return 'OK';
  }

  /**
   * Valida si el presupuesto permite realizar una nueva consulta
   */
  public canMakeRequest(): { allowed: boolean; remaining: number; status: 'OK' | 'WARNING' | 'EXHAUSTED' } {
    const status = this.getStatus();
    return {
      allowed: status !== 'EXHAUSTED',
      remaining: this.creditsRemaining,
      status
    };
  }

  /**
   * Retorna las estadísticas consolidadas de uso de The Odds API
   */
  public getUsageStats(): OddsUsageStats {
    const status = this.getStatus();
    return {
      provider: 'the-odds-api',
      monthlyLimit: this.monthlyLimit,
      creditsUsed: this.creditsUsed,
      creditsRemaining: this.creditsRemaining,
      lastQuery: this.lastQuery,
      lastError: this.lastError,
      status,
      warningAlert: status === 'WARNING' || status === 'EXHAUSTED',
      estimatedCostPerQuery: 1, // 1 crédito por llamada en cuotas simples
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Método para pruebas y reinicio
   */
  public reset(limit?: number): void {
    if (limit) this.monthlyLimit = limit;
    this.creditsUsed = 0;
    this.creditsRemaining = this.monthlyLimit;
    this.lastQuery = null;
    this.lastError = null;
  }
}

export const oddsUsageManager = new OddsUsageManager();
