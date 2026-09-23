"use strict";
/**
 * Contratos y tipos canónicos del Motor de Parlays.
 *
 * El motor combina automáticamente selecciones previas del motor estadístico,
 * evalúa correlaciones (intra-partido y entre mercados), calcula métricas matemáticas,
 * aplica ranking multicriterio y produce candidatos finalistas para cada usuario.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARLAY_LIMITS = void 0;
/**
 * Parámetros máximos iniciales por tipo de parlay
 */
exports.PARLAY_LIMITS = {
    HIGH_PROBABILITY_PARLAY: { minSelections: 2, maxSelections: 3 },
    VALUE_PARLAY: { minSelections: 2, maxSelections: 4 },
    BALANCED_PARLAY: { minSelections: 2, maxSelections: 3 }
};
//# sourceMappingURL=parlay.interface.js.map