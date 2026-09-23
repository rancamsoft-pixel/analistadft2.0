"use strict";
/**
 * Modelo de Forma (Form Model).
 *
 * Convierte la serie de resultados recientes (W/D/L) y métricas de goles
 * en un factor de momentum relativo que ajusta el λ del modelo Poisson.
 *
 * DISEÑO:
 * - Ventana primaria: últimos 5 partidos (forma corta)
 * - Ventana secundaria: últimos 10 partidos (forma larga)
 * - Decaimiento exponencial: partido más reciente tiene mayor peso
 * - El factor de forma produce un MULTIPLICADOR sobre λ base (no sustituye al λ)
 * - Neutral = 1.0 (sin impacto), > 1.0 = equipo en buena forma, < 1.0 = mala forma
 *
 * REGLA: un dato inexistente NO produce penalización extrema.
 * Si no hay datos, el multiplicador es 1.0 (neutral).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFormScore = calculateFormScore;
exports.calculateFormAdjustment = calculateFormAdjustment;
// Puntos asignados a cada resultado (para normalización)
const POINTS = { W: 3, D: 1, L: 0 };
const MAX_POINTS = 3;
// Factores de decaimiento exponencial para ventanas de 5 y 10
// Más reciente = mayor peso. Suma de pesos = 1.
const DECAY_WEIGHTS_5 = generateDecayWeights(5, 0.8);
const DECAY_WEIGHTS_10 = generateDecayWeights(10, 0.85);
function generateDecayWeights(n, decayRate) {
    const raw = Array.from({ length: n }, (_, i) => Math.pow(decayRate, i));
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map(w => w / sum);
}
/**
 * Calcula la puntuación de forma normalizada [0, 1] con decaimiento exponencial.
 * 0 = toda pérdidas, 1 = todas victorias.
 */
function calculateFormScore(results, windowSize) {
    const window = results.slice(0, windowSize);
    if (window.length === 0)
        return { score: 0.5, matchesUsed: 0 }; // Neutral si no hay datos
    const weights = windowSize === 5 ? DECAY_WEIGHTS_5 : DECAY_WEIGHTS_10;
    let weightedScore = 0;
    let totalWeight = 0;
    for (let i = 0; i < window.length; i++) {
        const w = weights[i] ?? weights[weights.length - 1];
        weightedScore += (POINTS[window[i]] / MAX_POINTS) * w;
        totalWeight += w;
    }
    const score = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
    return { score, matchesUsed: window.length };
}
/**
 * Calcula los multiplicadores de forma para aplicar sobre los λ del modelo Poisson.
 *
 * El multiplicador se calcula como:
 *   score relativo = formScore_equipo / (formScore_home + formScore_away)
 *   multiplier = 0.85 + (relativeScore * 0.30)   → rango [0.85, 1.15]
 *
 * Esto produce variaciones máximas de ±15% sobre el λ base, evitando extremos.
 */
function calculateFormAdjustment(homeForm, awayForm) {
    const factors = [];
    // ---- Forma corta (últimos 5) ------------------------------------------
    const homeShort = homeForm
        ? calculateFormScore(homeForm.results, 5)
        : { score: 0.5, matchesUsed: 0 };
    const awayShort = awayForm
        ? calculateFormScore(awayForm.results, 5)
        : { score: 0.5, matchesUsed: 0 };
    factors.push({
        name: 'home_form_short_5',
        value: homeShort.score,
        weight: 0.35,
        source: homeForm ? 'api-football' : 'derived',
        quality: homeShort.matchesUsed >= 5 ? 'HIGH' : homeShort.matchesUsed >= 3 ? 'MEDIUM' : 'LOW',
        available: homeShort.matchesUsed > 0,
        note: homeShort.matchesUsed === 0 ? 'Sin datos de forma (neutral aplicado)' : undefined
    });
    factors.push({
        name: 'away_form_short_5',
        value: awayShort.score,
        weight: 0.35,
        source: awayForm ? 'api-football' : 'derived',
        quality: awayShort.matchesUsed >= 5 ? 'HIGH' : awayShort.matchesUsed >= 3 ? 'MEDIUM' : 'LOW',
        available: awayShort.matchesUsed > 0,
        note: awayShort.matchesUsed === 0 ? 'Sin datos de forma (neutral aplicado)' : undefined
    });
    // ---- Forma larga (últimos 10) -----------------------------------------
    const homeLong = homeForm
        ? calculateFormScore(homeForm.results, 10)
        : { score: 0.5, matchesUsed: 0 };
    const awayLong = awayForm
        ? calculateFormScore(awayForm.results, 10)
        : { score: 0.5, matchesUsed: 0 };
    factors.push({
        name: 'home_form_long_10',
        value: homeLong.score,
        weight: 0.15,
        source: homeForm ? 'api-football' : 'derived',
        quality: homeLong.matchesUsed >= 10 ? 'HIGH' : homeLong.matchesUsed >= 5 ? 'MEDIUM' : 'LOW',
        available: homeLong.matchesUsed > 0
    });
    factors.push({
        name: 'away_form_long_10',
        value: awayLong.score,
        weight: 0.15,
        source: awayForm ? 'api-football' : 'derived',
        quality: awayLong.matchesUsed >= 10 ? 'HIGH' : awayLong.matchesUsed >= 5 ? 'MEDIUM' : 'LOW',
        available: awayLong.matchesUsed > 0
    });
    // ---- Puntuación combinada (70% forma corta, 30% forma larga) ----------
    const homeFormScore = 0.70 * homeShort.score + 0.30 * homeLong.score;
    const awayFormScore = 0.70 * awayShort.score + 0.30 * awayLong.score;
    // ---- Goles marcados por unidad de forma --------------------------------
    // Añade un factor de eficiencia goleadora relativa a los resultados
    let homeGoalFactor = 1.0;
    let awayGoalFactor = 1.0;
    if (homeForm && homeForm.goalsScored.length >= 3) {
        const avgScored = homeForm.goalsScored.slice(0, 5).reduce((a, b) => a + b, 0) /
            Math.min(homeForm.goalsScored.length, 5);
        const LEAGUE_AVG = 1.35;
        homeGoalFactor = Math.max(0.7, Math.min(1.3, avgScored / LEAGUE_AVG));
        factors.push({
            name: 'home_goal_efficiency',
            value: homeGoalFactor,
            weight: 0.20,
            source: 'api-football',
            quality: 'MEDIUM',
            available: true
        });
    }
    if (awayForm && awayForm.goalsScored.length >= 3) {
        const avgScored = awayForm.goalsScored.slice(0, 5).reduce((a, b) => a + b, 0) /
            Math.min(awayForm.goalsScored.length, 5);
        const LEAGUE_AVG = 1.10;
        awayGoalFactor = Math.max(0.7, Math.min(1.3, avgScored / LEAGUE_AVG));
        factors.push({
            name: 'away_goal_efficiency',
            value: awayGoalFactor,
            weight: 0.20,
            source: 'api-football',
            quality: 'MEDIUM',
            available: true
        });
    }
    // ---- Multiplicadores ---------------------------------------------------
    // Rango restringido [0.82, 1.18] para evitar distorsiones extremas
    const homeLambdaMultiplier = Math.max(0.82, Math.min(1.18, (0.85 + homeFormScore * 0.30) * homeGoalFactor));
    const awayLambdaMultiplier = Math.max(0.82, Math.min(1.18, (0.85 + awayFormScore * 0.30) * awayGoalFactor));
    return { homeLambdaMultiplier, awayLambdaMultiplier, factors };
}
//# sourceMappingURL=form.model.js.map