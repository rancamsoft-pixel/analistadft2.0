"use strict";
/**
 * Tipos canónicos para el Análisis de Contexto por Gemini.
 *
 * CONTRATO FUNDAMENTAL:
 * - Gemini NO inventa cuotas, lesiones, estadísticas, resultados ni probabilidades.
 * - Gemini SOLO analiza información suministrada por nuestro backend.
 * - Gemini SOLO puede devolver un confidenceAdjustment dentro de {-2, -1, 0, 1, 2}.
 * - Gemini NO cambia directamente la probabilidad del motor estadístico.
 *
 * FLUJO:
 * PredictionEngine (probabilidad estadística)
 *   ↓
 * ContextAnalysisService (Gemini analiza contexto)
 *   ↓
 * confidenceAdjustment = señal de riesgo/confianza contextual
 *   ↓
 * El SISTEMA interpreta el ajuste (no Gemini)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_INJURIES_CONTEXT = exports.MAX_NEWS_CONTEXT = exports.PROHIBITED_LANGUAGE = exports.VALID_CONFIDENCE_ADJUSTMENTS = void 0;
// ---------------------------------------------------------------------------
// Constantes de validación
// ---------------------------------------------------------------------------
/** Valores permitidos de confidenceAdjustment */
exports.VALID_CONFIDENCE_ADJUSTMENTS = [-2, -1, 0, 1, 2];
/** Lenguaje prohibido (Gemini no debe usar estas expresiones) */
exports.PROHIBITED_LANGUAGE = [
    'apuesta segura',
    '100% seguro',
    'garantizado',
    'certeza',
    'infalible',
    'seguro que',
    'definitivamente ganará',
    'no puede perder'
];
/** Máximo de noticias que se pueden pasar como contexto */
exports.MAX_NEWS_CONTEXT = 5;
/** Máximo de lesiones por equipo en el contexto */
exports.MAX_INJURIES_CONTEXT = 8;
//# sourceMappingURL=context.interface.js.map