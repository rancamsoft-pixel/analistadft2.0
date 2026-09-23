"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oddsSnapshotService = exports.OddsSnapshotService = void 0;
const logger_js_1 = require("../utils/logger.js");
class OddsSnapshotService {
    logger = new logger_js_1.StructuredLogger('OddsSnapshotService');
    // Memoria local de último snapshot por clave para evitar escritura redundante
    lastSnapshots = new Map();
    snapshotsHistory = [];
    // Umbral mínimo de variación porcentual para justificar un snapshot intermedio (1.5%)
    SIGNIFICANT_CHANGE_THRESHOLD = 0.015;
    // Intervalo mínimo entre snapshots para una misma selección salvo cambio drástico (30 minutos)
    MIN_INTERVAL_MS = 30 * 60 * 1000;
    /**
     * Genera clave única para identificar una cuota particular
     */
    buildKey(matchId, bookmaker, market, selection, line) {
        return `${matchId}_${bookmaker}_${market}_${selection || 'any'}${line ? `_${line}` : ''}`;
    }
    /**
     * Evalúa si amerita guardar un snapshot histórico
     */
    shouldCaptureSnapshot(matchId, bookmaker, market, newOdds, selection, line, forceTrigger) {
        // Si es un trigger programado clave (análisis diario o pre-partido), siempre se toma
        if (forceTrigger === 'daily' || forceTrigger === 'pre_match') {
            return true;
        }
        const key = this.buildKey(matchId, bookmaker, market, selection, line);
        const last = this.lastSnapshots.get(key);
        if (!last)
            return true;
        const timeDiff = Date.now() - last.timestamp;
        const priceChange = Math.abs(newOdds - last.odds) / last.odds;
        // Solo capturar si hubo un cambio significativo de cuota (> 1.5%) o pasó el intervalo mínimo
        return priceChange >= this.SIGNIFICANT_CHANGE_THRESHOLD || timeDiff >= this.MIN_INTERVAL_MS;
    }
    /**
     * Captura y almacena un snapshot
     */
    recordSnapshot(params) {
        const trigger = params.trigger || 'on_demand';
        const shouldSave = this.shouldCaptureSnapshot(params.matchId, params.bookmaker, params.market, params.odds, params.selection, params.line, trigger);
        if (!shouldSave) {
            return null;
        }
        const key = this.buildKey(params.matchId, params.bookmaker, params.market, params.selection, params.line);
        const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const capturedAt = new Date().toISOString();
        const snapshot = {
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
    getSnapshotsForMatch(matchId) {
        return this.snapshotsHistory.filter(s => s.matchId === matchId);
    }
    /**
     * Para testing
     */
    reset() {
        this.lastSnapshots.clear();
        this.snapshotsHistory = [];
    }
}
exports.OddsSnapshotService = OddsSnapshotService;
exports.oddsSnapshotService = new OddsSnapshotService();
//# sourceMappingURL=oddsSnapshot.service.js.map