"use strict";
/**
 * Calculadora de Edge y Expected Value.
 *
 * CONCEPTOS CLAVE:
 *
 * 1. Probabilidad implícita SIMPLE:
 *    impliedProb = 1 / marketOdds
 *    Problema: la suma de las probs implícitas simples > 1 (overround del bookmaker).
 *
 * 2. Probabilidad implícita AJUSTADA POR MARGEN (método Jullien-Pastine):
 *    overround = Σ(1 / odds_i)  para cada outcome del mismo mercado
 *    impliedProbAdj = (1/odds_i) / overround
 *    Suma de impliedProbAdj = 1 (mercado justo)
 *    Más honesta para comparar contra el modelo.
 *
 * 3. Edge:
 *    edge = modelProbability - impliedProbAdj
 *    > 0 → el modelo cree que el bookmaker subestima la probabilidad real → posible valor.
 *    < 0 → el modelo cree que el bookmaker sobreestima la probabilidad real.
 *
 * 4. Expected Value (EV):
 *    EV = modelProbability * marketOdds - 1
 *    > 0 → apuesta con valor esperado positivo según el modelo.
 *    Un EV > 0 no garantiza ganancia en una sola apuesta; solo en la larga.
 *
 * DOCUMENTACIÓN DE DIFERENCIAS:
 * La probabilidad implícita simple siempre sobreestima la probabilidad real del bookmaker.
 * En un mercado 1X2 típico con overround de 1.05, la distorsión puede ser 4-5%.
 * Usar la simple como baseline llevaría a detectar "valor" donde no lo hay.
 * Por eso se usa SIEMPRE la ajustada por margen para el edge.
 * Ambas se exponen en PredictionResult para transparencia.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEdge = calculateEdge;
exports.areOddsStale = areOddsStale;
exports.areModelsInconsistent = areModelsInconsistent;
/**
 * Calcula edge y EV para una selección dado su contexto de cuotas.
 *
 * @param modelProbability  Probabilidad del modelo estadístico [0, 1]
 * @param oddsContext       Cuota de la selección + todas las cuotas del mismo mercado
 */
function calculateEdge(modelProbability, oddsContext) {
    const { selectionOdds, allOutcomeOdds } = oddsContext;
    // Validaciones básicas
    const safeOdds = Math.max(1.01, selectionOdds);
    const safeModelProb = Math.max(0.001, Math.min(0.999, modelProbability));
    // 1. Probabilidad implícita simple
    const impliedProbabilityRaw = 1 / safeOdds;
    // 2. Overround del mercado
    const validOdds = allOutcomeOdds.filter(o => o >= 1.01);
    const overround = validOdds.length > 0
        ? validOdds.reduce((sum, o) => sum + (1 / o), 0)
        : 1.0;
    // 3. Probabilidad implícita ajustada (Jullien-Pastine)
    const impliedProbabilityMarginAdj = overround > 0
        ? impliedProbabilityRaw / overround
        : impliedProbabilityRaw;
    // 4. Margen del bookmaker
    const marginPercent = overround > 0 ? (overround - 1) * 100 : 0;
    // 5. Edge
    const edge = safeModelProb - impliedProbabilityMarginAdj;
    // 6. Expected Value
    const expectedValue = safeModelProb * safeOdds - 1;
    return {
        impliedProbabilityRaw: parseFloat(impliedProbabilityRaw.toFixed(4)),
        impliedProbabilityMarginAdj: parseFloat(impliedProbabilityMarginAdj.toFixed(4)),
        overround: parseFloat(overround.toFixed(4)),
        marginPercent: parseFloat(marginPercent.toFixed(2)),
        edge: parseFloat(edge.toFixed(4)),
        expectedValue: parseFloat(expectedValue.toFixed(4)),
        marketOdds: safeOdds,
        modelProbability: parseFloat(safeModelProb.toFixed(4))
    };
}
// ---------------------------------------------------------------------------
// Validación de frescura de cuotas
// ---------------------------------------------------------------------------
/**
 * Determina si las cuotas están demasiado desactualizadas para mercados volátiles.
 * Las cuotas de 1X2 pueden moverse significativamente en las 12h previas al partido.
 * @returns true si las cuotas están vigentes, false si están stale
 */
function areOddsStale(oddsTimestamp, matchUtcDate, thresholdHours = 12) {
    const oddsTime = new Date(oddsTimestamp).getTime();
    const matchTime = new Date(matchUtcDate).getTime();
    const now = Date.now();
    // Si el partido ya pasó, irrelevante
    if (matchTime < now)
        return true;
    const hoursBeforeMatch = (matchTime - now) / (1000 * 60 * 60);
    const hoursOddsAge = (now - oddsTime) / (1000 * 60 * 60);
    // Si quedan menos de 12h para el partido Y las cuotas tienen más de 12h → stale
    if (hoursBeforeMatch < thresholdHours && hoursOddsAge > thresholdHours)
        return true;
    // Cuotas con más de 48h de antigüedad siempre son stale
    if (hoursOddsAge > 48)
        return true;
    return false;
}
// ---------------------------------------------------------------------------
// Detección de inconsistencia entre modelos
// ---------------------------------------------------------------------------
/**
 * Detecta si la diferencia entre dos estimaciones de probabilidad es demasiado grande.
 * Umbral: 35% de diferencia relativa.
 * P.ej.: modelo1 = 0.60, modelo2 = 0.40 → diferencia = 0.20 / avg(0.50) = 40% → inconsistente
 */
function areModelsInconsistent(prob1, prob2) {
    const avg = (prob1 + prob2) / 2;
    if (avg === 0)
        return false;
    const relativeDiff = Math.abs(prob1 - prob2) / avg;
    return relativeDiff > 0.35;
}
//# sourceMappingURL=edge.calculator.js.map