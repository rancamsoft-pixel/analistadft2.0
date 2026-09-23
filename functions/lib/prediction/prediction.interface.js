"use strict";
/**
 * Motor Estadístico — Tipos Canónicos
 *
 * Las probabilidades emergen de modelos matemáticos reproducibles.
 * Gemini NO determina probabilidades; solo interpreta contexto
 * textual posterior a que el motor produzca sus cifras.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_VERSION = exports.WEIGHTS_MINIMAL = exports.WEIGHTS_NO_XG = exports.DEFAULT_MODEL_WEIGHTS = exports.DISCARD_REASONS = void 0;
// ---------------------------------------------------------------------------
// Razones de descarte
// ---------------------------------------------------------------------------
exports.DISCARD_REASONS = {
    CANCELLED_MATCH: 'Partido cancelado o aplazado',
    INSUFFICIENT_DATA: 'Datos insuficientes para generar una estimación confiable',
    STALE_ODDS: 'Cuotas de mercado desactualizadas (> 12h antes del partido)',
    UNSUPPORTED_MARKET: 'Mercado no soportado',
    INCONSISTENT_SOURCES: 'Fuentes de datos inconsistentes (diferencia entre modelos > 35%)',
    EXTREME_PROBABILITY: 'Probabilidad fuera de rango confiable (< 3% o > 97%) con calidad baja',
    NO_MATCH_DATA: 'No se encontraron datos del partido'
};
exports.DEFAULT_MODEL_WEIGHTS = {
    poisson: 0.50,
    xg: 0.30,
    form: 0.15,
    homeAway: 0.05
};
/** Pesos cuando xG NO está disponible */
exports.WEIGHTS_NO_XG = {
    poisson: 0.65,
    xg: 0.00,
    form: 0.25,
    homeAway: 0.10
};
/** Pesos cuando xG Y forma histórica son limitados */
exports.WEIGHTS_MINIMAL = {
    poisson: 0.80,
    xg: 0.00,
    form: 0.10,
    homeAway: 0.10
};
exports.MODEL_VERSION = 'v1.0.0';
//# sourceMappingURL=prediction.interface.js.map