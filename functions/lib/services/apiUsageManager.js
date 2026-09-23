"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiUsageManager = exports.ApiUsageManager = void 0;
const logger_js_1 = require("../utils/logger.js");
class ApiUsageManager {
    static instance;
    logger = new logger_js_1.StructuredLogger('ApiUsageManager');
    DAILY_BUDGET_LIMIT = 80; // Presupuesto diario máximo de seguridad
    WARNING_THRESHOLD = 64; // 80% del presupuesto
    TOTAL_PLAN_LIMIT = 100; // Límite total del plan gratuito (20 de reserva)
    // En memoria con sincronización periódica
    dailyCounts = new Map();
    requestLogs = new Map();
    constructor() { }
    static getInstance() {
        if (!ApiUsageManager.instance) {
            ApiUsageManager.instance = new ApiUsageManager();
        }
        return ApiUsageManager.instance;
    }
    getTodayString() {
        return new Date().toISOString().split('T')[0];
    }
    /**
     * Comprueba si el presupuesto permite realizar una nueva petición externa
     */
    canMakeRequest(_provider = 'api-football', isCritical = false) {
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
        const status = currentUsed >= this.WARNING_THRESHOLD ? 'WARNING' : 'OK';
        if (status === 'WARNING') {
            this.logger.warn(`Alerta de cuota: Se ha alcanzado el 80% del presupuesto diario (${currentUsed}/${this.DAILY_BUDGET_LIMIT})`);
        }
        return { allowed: true, remaining, status, currentUsed };
    }
    /**
     * Registra los detalles estructurados de la llamada en provider_usage/{date}/requests/{requestId}
     */
    async recordRequest(params) {
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
    getDailyStats(date) {
        const targetDate = date || this.getTodayString();
        const used = this.dailyCounts.get(targetDate) || 0;
        const remaining = Math.max(0, this.DAILY_BUDGET_LIMIT - used);
        const status = used >= this.DAILY_BUDGET_LIMIT ? 'EXHAUSTED' : used >= this.WARNING_THRESHOLD ? 'WARNING' : 'OK';
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
    resetCounts() {
        this.dailyCounts.clear();
        this.requestLogs.clear();
    }
}
exports.ApiUsageManager = ApiUsageManager;
exports.apiUsageManager = ApiUsageManager.getInstance();
//# sourceMappingURL=apiUsageManager.js.map