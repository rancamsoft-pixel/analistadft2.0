"use strict";
/**
 * PredictionEngine — Orchestrador del Motor Estadístico.
 *
 * FLUJO:
 * 1. Recibe MatchInputData (snapshot de datos antes del partido)
 * 2. Ejecuta cada modelo (Poisson, xG, Forma, Home/Away)
 * 3. Combina lambdas con pesos configurables
 * 4. Construye la matriz de probabilidades Poisson
 * 5. Calcula todos los mercados
 * 6. Calcula edge/EV si hay cuotas de mercado disponibles
 * 7. Asigna DataQuality y PredictionCategory
 * 8. Aplica reglas de descarte
 * 9. Devuelve PredictionResult[] (uno por selección)
 *
 * PRINCIPIO: No hay probabilidades de Gemini en este motor.
 * Gemini solo interpreta el contexto DESPUÉS de que el motor produzca sus cifras.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionEngine = void 0;
const poisson_model_js_1 = require("./models/poisson.model.js");
const xg_model_js_1 = require("./models/xg.model.js");
const form_model_js_1 = require("./models/form.model.js");
const homeAway_model_js_1 = require("./models/homeAway.model.js");
const market_calculator_js_1 = require("./markets/market.calculator.js");
const edge_calculator_js_1 = require("./markets/edge.calculator.js");
const prediction_interface_js_1 = require("./prediction.interface.js");
// ---------------------------------------------------------------------------
// PredictionEngine
// ---------------------------------------------------------------------------
class PredictionEngine {
    weights;
    constructor(weights) {
        this.weights = { ...prediction_interface_js_1.DEFAULT_MODEL_WEIGHTS, ...weights };
        this.normalizeWeights();
    }
    normalizeWeights() {
        const total = this.weights.poisson + this.weights.xg + this.weights.form + this.weights.homeAway;
        if (total > 0 && Math.abs(total - 1) > 0.001) {
            this.weights.poisson /= total;
            this.weights.xg /= total;
            this.weights.form /= total;
            this.weights.homeAway /= total;
        }
    }
    /**
     * Analiza un partido y produce PredictionResult para todos los mercados soportados.
     *
     * @param input       Datos del partido (snapshot pre-partido)
     * @param oddsMap     Cuotas de mercado opcionales (para cálculo de edge/EV)
     * @param oddsTimestamp Timestamp de las cuotas (para validar frescura)
     */
    async predict(input, oddsMap, oddsTimestamp) {
        // ---- 1. Verificar descartes previos al cálculo -----------------------
        if (input.status === 'CANCELLED' || input.status === 'POSTPONED') {
            return this.buildDiscardedResults(input, prediction_interface_js_1.DISCARD_REASONS.CANCELLED_MATCH);
        }
        if (input.status === 'FINISHED') {
            return this.buildDiscardedResults(input, 'Partido ya finalizado');
        }
        // ---- 2. Ejecutar modelos individualmente -----------------------------
        const poissonResult = (0, poisson_model_js_1.estimatePoissonLambdas)(input.homeForm, input.awayForm);
        const xgResult = (0, xg_model_js_1.estimateXGLambdas)(input.homeForm, input.awayForm);
        const formAdj = (0, form_model_js_1.calculateFormAdjustment)(input.homeForm, input.awayForm);
        const homeAwayAdj = (0, homeAway_model_js_1.calculateHomeAwayAdjustment)(input);
        // ---- 3. Seleccionar pesos según disponibilidad de xG ----------------
        let effectiveWeights = this.weights;
        if (!xgResult.dataAvailable) {
            effectiveWeights = poissonResult.matchesUsed >= 5 ? prediction_interface_js_1.WEIGHTS_NO_XG : prediction_interface_js_1.WEIGHTS_MINIMAL;
        }
        // ---- 4. Combinar lambdas con pesos -----------------------------------
        const wSum = effectiveWeights.poisson + effectiveWeights.xg + effectiveWeights.form + effectiveWeights.homeAway;
        const rawLambdaHome = (effectiveWeights.poisson * poissonResult.lambdaHome +
            effectiveWeights.xg * xgResult.lambdaHome +
            effectiveWeights.form * poissonResult.lambdaHome * formAdj.homeLambdaMultiplier +
            effectiveWeights.homeAway * poissonResult.lambdaHome * homeAwayAdj.homeLambdaMultiplier) / wSum;
        const rawLambdaAway = (effectiveWeights.poisson * poissonResult.lambdaAway +
            effectiveWeights.xg * xgResult.lambdaAway +
            effectiveWeights.form * poissonResult.lambdaAway * formAdj.awayLambdaMultiplier +
            effectiveWeights.homeAway * poissonResult.lambdaAway * homeAwayAdj.awayLambdaMultiplier) / wSum;
        const lambdaHome = Math.max(0.10, Math.min(5.0, rawLambdaHome));
        const lambdaAway = Math.max(0.10, Math.min(5.0, rawLambdaAway));
        // ---- 5. Verificar consistencia entre modelos Poisson y xG -----------
        let inconsistent = false;
        if (xgResult.dataAvailable) {
            inconsistent =
                (0, edge_calculator_js_1.areModelsInconsistent)(poissonResult.lambdaHome, xgResult.lambdaHome) ||
                    (0, edge_calculator_js_1.areModelsInconsistent)(poissonResult.lambdaAway, xgResult.lambdaAway);
        }
        // ---- 6. Construir matriz de probabilidades ---------------------------
        const goalMatrix = (0, poisson_model_js_1.buildGoalMatrix)(lambdaHome, lambdaAway);
        // ---- 7. Calcular todos los mercados ---------------------------------
        const markets = (0, market_calculator_js_1.calculateAllMarkets)(goalMatrix);
        // ---- 8. Calcular DataQuality global del partido ---------------------
        const dataQuality = this.assessDataQuality(input, xgResult.dataAvailable, poissonResult.matchesUsed);
        // ---- 9. Verificar si hay cuotas stale --------------------------------
        let oddsAreStale = false;
        if (oddsTimestamp && input.utcDate) {
            oddsAreStale = (0, edge_calculator_js_1.areOddsStale)(oddsTimestamp, input.utcDate);
        }
        // ---- 10. Recopilar todos los factores --------------------------------
        const allFactors = [
            ...poissonResult.factors,
            ...(xgResult.dataAvailable ? xgResult.factors : []),
            ...formAdj.factors,
            ...homeAwayAdj.factors
        ];
        // ---- 11. Construir ModelOutputs -------------------------------------
        const modelOutputs = [
            {
                model: 'poisson',
                lambdaHome: poissonResult.lambdaHome,
                lambdaAway: poissonResult.lambdaAway,
                effectiveWeight: effectiveWeights.poisson,
                dataAvailable: poissonResult.matchesUsed > 0
            },
            {
                model: 'xg',
                lambdaHome: xgResult.lambdaHome,
                lambdaAway: xgResult.lambdaAway,
                effectiveWeight: xgResult.dataAvailable ? effectiveWeights.xg : 0,
                dataAvailable: xgResult.dataAvailable
            },
            {
                model: 'form',
                lambdaHome: poissonResult.lambdaHome * formAdj.homeLambdaMultiplier,
                lambdaAway: poissonResult.lambdaAway * formAdj.awayLambdaMultiplier,
                effectiveWeight: effectiveWeights.form,
                dataAvailable: allFactors.some(f => f.name.startsWith('home_form') && f.available)
            },
            {
                model: 'home_away',
                lambdaHome: poissonResult.lambdaHome * homeAwayAdj.homeLambdaMultiplier,
                lambdaAway: poissonResult.lambdaAway * homeAwayAdj.awayLambdaMultiplier,
                effectiveWeight: effectiveWeights.homeAway,
                dataAvailable: true
            }
        ];
        // ---- 12. Construir PredictionResult por selección -------------------
        const results = [];
        const analysisDate = new Date().toISOString().split('T')[0];
        for (const market of markets) {
            const analysisId = `${input.matchId}_${market.market}_${market.selection}_${prediction_interface_js_1.MODEL_VERSION}_${analysisDate}`;
            // Descarte por inconsistencia de fuentes
            if (inconsistent) {
                results.push(this.buildSingleDiscardedResult(analysisId, input, market, dataQuality, allFactors, modelOutputs, prediction_interface_js_1.DISCARD_REASONS.INCONSISTENT_SOURCES));
                continue;
            }
            // Descarte por calidad insuficiente total
            if (dataQuality === 'INSUFFICIENT') {
                results.push(this.buildSingleDiscardedResult(analysisId, input, market, dataQuality, allFactors, modelOutputs, prediction_interface_js_1.DISCARD_REASONS.INSUFFICIENT_DATA));
                continue;
            }
            // Descarte por probabilidad extrema con baja calidad
            // Nota: aquí TypeScript ya sabe que dataQuality != 'INSUFFICIENT'
            // La comparación con 'LOW' sigue siendo válida
            const isLowQuality = dataQuality === 'LOW';
            if ((market.probability < 0.03 || market.probability > 0.97) &&
                isLowQuality) {
                results.push(this.buildSingleDiscardedResult(analysisId, input, market, dataQuality, allFactors, modelOutputs, prediction_interface_js_1.DISCARD_REASONS.EXTREME_PROBABILITY));
                continue;
            }
            // Cálculo de edge si hay cuotas disponibles
            let edgeData;
            const oddsKey = `${market.market}_${market.selection}`;
            const oddsCtx = oddsMap?.get(oddsKey);
            if (oddsCtx && !oddsAreStale) {
                edgeData = (0, edge_calculator_js_1.calculateEdge)(market.probability, oddsCtx);
            }
            const category = this.assignCategory(market.probability, edgeData?.edge, dataQuality, oddsAreStale);
            results.push({
                analysisId,
                matchId: input.matchId,
                market: market.market,
                selection: market.selection,
                probability: parseFloat(market.probability.toFixed(4)),
                fairOdds: market.fairOdds,
                impliedProbabilityRaw: edgeData?.impliedProbabilityRaw,
                impliedProbabilityMarginAdj: edgeData?.impliedProbabilityMarginAdj,
                edge: edgeData?.edge,
                expectedValue: edgeData?.expectedValue,
                marketOdds: edgeData?.marketOdds,
                modelVersion: prediction_interface_js_1.MODEL_VERSION,
                dataQuality,
                category,
                factors: allFactors,
                modelOutputs,
                inputSnapshot: input,
                generatedAt: new Date().toISOString()
            });
        }
        return results;
    }
    // ---------------------------------------------------------------------------
    // DataQuality Assessment
    // ---------------------------------------------------------------------------
    assessDataQuality(input, xgAvailable, matchCount) {
        let score = 0;
        // Datos de forma disponibles
        if (input.homeForm && input.awayForm)
            score += 2;
        else if (input.homeForm || input.awayForm)
            score += 1;
        // Cantidad de partidos históricos
        if (matchCount >= 10)
            score += 2;
        else if (matchCount >= 5)
            score += 1;
        // xG disponible
        if (xgAvailable)
            score += 2;
        // H2H disponible
        if (input.h2h && input.h2h.totalMatches >= 3)
            score += 1;
        // Lesiones conocidas (dato disponible, aunque sea "sin lesiones")
        if (input.injuries)
            score += 1;
        // Clasificación disponible
        if (input.standings)
            score += 1;
        // Alineaciones disponibles
        if (input.lineupsAvailable)
            score += 1;
        // Conversión a DataQuality
        if (score >= 8)
            return 'VERY_HIGH';
        if (score >= 6)
            return 'HIGH';
        if (score >= 4)
            return 'MEDIUM';
        if (score >= 2)
            return 'LOW';
        return 'INSUFFICIENT';
    }
    // ---------------------------------------------------------------------------
    // Category Assignment
    // ---------------------------------------------------------------------------
    assignCategory(probability, edge, dataQuality, oddsStale) {
        const qualityStr = dataQuality;
        if (qualityStr === 'INSUFFICIENT')
            return 'INSUFFICIENT_DATA';
        if (qualityStr === 'LOW')
            return 'LOW_CONFIDENCE';
        if (edge !== undefined && !oddsStale) {
            const isGoodQuality = qualityStr === 'HIGH' || qualityStr === 'VERY_HIGH' || qualityStr === 'MEDIUM';
            if (edge > 0.04 && isGoodQuality) {
                return 'VALUE';
            }
        }
        if (probability >= 0.65)
            return 'HIGH_PROBABILITY';
        return 'NEUTRAL';
    }
    // ---------------------------------------------------------------------------
    // Helpers para resultados descartados
    // ---------------------------------------------------------------------------
    buildDiscardedResults(input, reason) {
        // Solo se devuelve un resultado representativo por partido cuando hay descarte total
        const analysisId = `${input.matchId}_DISCARDED_${prediction_interface_js_1.MODEL_VERSION}_${Date.now()}`;
        return [{
                analysisId,
                matchId: input.matchId,
                market: '1X2',
                selection: 'home',
                probability: 0,
                fairOdds: 0,
                modelVersion: prediction_interface_js_1.MODEL_VERSION,
                dataQuality: 'INSUFFICIENT',
                category: 'INSUFFICIENT_DATA',
                factors: [],
                modelOutputs: [],
                inputSnapshot: input,
                discardReason: reason,
                generatedAt: new Date().toISOString()
            }];
    }
    buildSingleDiscardedResult(analysisId, input, market, dataQuality, factors, modelOutputs, reason) {
        return {
            analysisId,
            matchId: input.matchId,
            market: market.market,
            selection: market.selection,
            probability: market.probability,
            fairOdds: market.fairOdds,
            modelVersion: prediction_interface_js_1.MODEL_VERSION,
            dataQuality,
            category: 'INSUFFICIENT_DATA',
            factors,
            modelOutputs,
            inputSnapshot: input,
            discardReason: reason,
            generatedAt: new Date().toISOString()
        };
    }
}
exports.PredictionEngine = PredictionEngine;
//# sourceMappingURL=prediction.engine.js.map