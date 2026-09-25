"use strict";
/**
 * Motor de Parlays Inteligente.
 *
 * Genera automáticamente combinaciones de mercados seleccionados previamente
 * por el motor estadístico, respetando:
 * - Tipos: HIGH_PROBABILITY_PARLAY, VALUE_PARLAY, BALANCED_PARLAY
 * - Límites de selecciones (máx 3 para High Prob, máx 4 para Value, máx 3 para Balanced)
 * - Detección de correlación intra-partido y penalización
 * - Ranking multicriterio deportivo (sin clasificaciones políticas)
 * - Personalización estricta por usuario (ligas y casas activas)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParlayEngine = void 0;
const parlay_interface_js_1 = require("./parlay.interface.js");
const correlation_detector_js_1 = require("./correlation.detector.js");
class ParlayEngine {
    /**
     * Ejecuta el pipeline completo de generación de parlays para un usuario
     */
    static generateForUser(availableSelections, userPrefs) {
        // 1. Filtrar selecciones por preferencias del usuario
        const userFilteredSelections = this.filterByUserPreferences(availableSelections, userPrefs);
        // 2. Filtrar por calidad básica y vigencia de cuotas
        const validSelections = this.filterValidSelections(userFilteredSelections);
        if (validSelections.length < 2) {
            return {
                focoDelDia: null,
                altaProbabilidad: null,
                deValor: null,
                alternativas: [],
                allCandidatesCount: 0
            };
        }
        // 3. Generar candidatos por cada tipo de parley
        const highProbCandidates = this.generateCandidatesForType(validSelections, 'HIGH_PROBABILITY_PARLAY');
        const valueCandidates = this.generateCandidatesForType(validSelections, 'VALUE_PARLAY');
        const balancedCandidates = this.generateCandidatesForType(validSelections, 'BALANCED_PARLAY');
        const totalCandidatesCount = highProbCandidates.length + valueCandidates.length + balancedCandidates.length;
        // 4. Seleccionar los finalistas estructurados para el usuario:
        // - FOCO DEL DÍA
        // - PARLEY ALTA PROBABILIDAD
        // - PARLEY DE VALOR
        // - ALTERNATIVAS
        return this.selectFinalists(highProbCandidates, valueCandidates, balancedCandidates, totalCandidatesCount);
    }
    /**
     * Filtra selecciones según las competiciones y casas activas del usuario
     */
    static filterByUserPreferences(selections, userPrefs) {
        return selections.filter(sel => {
            // Filtrar por competición activa si el usuario tiene preferencias definidas
            if (userPrefs.activeCompetitionIds && userPrefs.activeCompetitionIds.length > 0) {
                if (!userPrefs.activeCompetitionIds.includes(sel.competitionId)) {
                    return false;
                }
            }
            // Filtrar por casa de apuestas activa si el usuario tiene casas definidas
            if (userPrefs.activeBookmakerIds && userPrefs.activeBookmakerIds.length > 0) {
                const matchesBookmaker = userPrefs.activeBookmakerIds.some(bId => bId.toLowerCase() === sel.bookmakerId.toLowerCase() ||
                    bId.toLowerCase() === sel.bookmaker.toLowerCase());
                if (!matchesBookmaker) {
                    return false;
                }
            }
            // Filtrar por mercados activos si están configurados
            if (userPrefs.activeMarketKeys && userPrefs.activeMarketKeys.length > 0) {
                const matchesMarket = userPrefs.activeMarketKeys.some(mKey => {
                    if (mKey === '1X2' && sel.market === '1X2')
                        return true;
                    if (mKey === 'over_under' && (sel.market.startsWith('over_') || sel.market.startsWith('under_')))
                        return true;
                    if (mKey === 'both_teams_to_score' && sel.market === 'btts')
                        return true;
                    if (mKey === 'double_chance' && sel.market === 'double_chance')
                        return true;
                    if (mKey === 'draw_no_bet' && sel.market === 'draw_no_bet')
                        return true;
                    return mKey === sel.market;
                });
                if (!matchesMarket) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * Filtrar selecciones inválidas, incompletas o de baja calidad
     */
    static filterValidSelections(selections) {
        return selections.filter(sel => {
            // Cuota válida y positiva
            if (!sel.odds || sel.odds <= 1.05 || !Number.isFinite(sel.odds))
                return false;
            // Probabilidad calculada y en rango
            if (!sel.probability || sel.probability <= 0.05 || sel.probability >= 0.98)
                return false;
            // No permitir datos insuficientes
            if (sel.dataQuality === 'INSUFFICIENT')
                return false;
            return true;
        });
    }
    /**
     * Genera y califica candidatos para un tipo específico de parlay
     */
    static generateCandidatesForType(pool, type) {
        const limits = parlay_interface_js_1.PARLAY_LIMITS[type];
        const filteredPool = this.filterPoolForType(pool, type);
        if (filteredPool.length < limits.minSelections) {
            return [];
        }
        const candidates = [];
        const maxCombinationsToEvaluate = 150; // Guard contra explosión combinatoria
        // Generar combinaciones de tamaños permitidos
        for (let size = limits.minSelections; size <= limits.maxSelections; size++) {
            const combos = this.getCombinations(filteredPool, size, maxCombinationsToEvaluate);
            for (const combo of combos) {
                // Evaluar correlación
                const correlation = correlation_detector_js_1.CorrelationDetector.evaluate(combo);
                if (correlation.isExcluded) {
                    continue; // Descartar combinación inválida
                }
                // Calcular métricas matemáticas
                const combinedOdds = Number(combo.reduce((acc, s) => acc * s.odds, 1).toFixed(3));
                const estimatedProbability = Number(combo.reduce((acc, s) => acc * s.probability, 1).toFixed(4));
                const estimatedEV = Number((((estimatedProbability * combinedOdds) - 1) * 100).toFixed(2));
                const dataQuality = this.resolveAggregatedQuality(combo.map(s => s.dataQuality));
                // Calcular score de ranking multicriterio
                const rankingScore = this.calculateRankingScore(type, estimatedProbability, estimatedEV, combo, dataQuality, correlation.correlationPenalty);
                candidates.push({
                    type,
                    selections: combo,
                    combinedOdds,
                    estimatedProbability,
                    estimatedEV,
                    dataQuality,
                    correlationRisk: correlation.correlationRisk,
                    correlationNotes: correlation.notes,
                    correlationPenalty: correlation.correlationPenalty,
                    marketStabilityScore: 0.95,
                    rankingScore
                });
            }
        }
        // Ordenar de mejor a peor según rankingScore
        return candidates.sort((a, b) => b.rankingScore - a.rankingScore);
    }
    /**
     * Filtra el pool según las características de cada tipo de parlay
     */
    static filterPoolForType(pool, type) {
        switch (type) {
            case 'HIGH_PROBABILITY_PARLAY':
                // Mayor probabilidad individual (≥ 52%), cuotas estables
                return pool
                    .filter(s => s.probability >= 0.52 && s.odds <= 2.20)
                    .sort((a, b) => b.probability - a.probability)
                    .slice(0, 10);
            case 'VALUE_PARLAY':
                // Valor esperado positivo o edge relevante
                return pool
                    .filter(s => (s.expectedValue ?? 0) > 0 || (s.edge ?? 0) > 0.015)
                    .sort((a, b) => (b.expectedValue ?? 0) - (a.expectedValue ?? 0))
                    .slice(0, 12);
            case 'BALANCED_PARLAY':
                // Equilibrio entre probabilidad y cuota razonable
                return pool
                    .filter(s => s.probability >= 0.45 && s.odds >= 1.30 && s.odds <= 2.60)
                    .sort((a, b) => {
                    const scoreA = a.probability * (a.odds - 1);
                    const scoreB = b.probability * (b.odds - 1);
                    return scoreB - scoreA;
                })
                    .slice(0, 10);
            default:
                return pool.slice(0, 10);
        }
    }
    /**
     * Cálculo de Ranking Multicriterio Deportivo
     */
    static calculateRankingScore(type, jointProb, ev, selections, quality, correlationPenalty) {
        const qualityMultiplier = {
            VERY_HIGH: 1.0,
            HIGH: 0.9,
            MEDIUM: 0.75,
            LOW: 0.5,
            INSUFFICIENT: 0.0
        };
        const avgEdge = selections.reduce((sum, s) => sum + (s.edge ?? 0), 0) / selections.length;
        const qFactor = qualityMultiplier[quality];
        let baseScore = 0;
        if (type === 'HIGH_PROBABILITY_PARLAY') {
            // Priorizar probabilidad de acierto + control de riesgo
            baseScore = (jointProb * 70) + (Math.max(0, ev) * 1.5) + (qFactor * 15);
        }
        else if (type === 'VALUE_PARLAY') {
            // Priorizar expectativa matemática (+EV) y edge
            baseScore = (ev * 2.5) + (avgEdge * 60) + (jointProb * 25) + (qFactor * 15);
        }
        else {
            // Balanceado: combinación equilibrada
            baseScore = (jointProb * 40) + (Math.max(0, ev) * 2.0) + (avgEdge * 35) + (qFactor * 15);
        }
        // Penalización por correlación
        const penaltyDeduction = correlationPenalty * 35;
        return Number((baseScore - penaltyDeduction).toFixed(2));
    }
    /**
     * Determina la calidad consolidada del parlay (mínimo conservador)
     */
    static resolveAggregatedQuality(qualities) {
        if (qualities.includes('INSUFFICIENT'))
            return 'INSUFFICIENT';
        if (qualities.includes('LOW'))
            return 'LOW';
        if (qualities.includes('MEDIUM'))
            return 'MEDIUM';
        if (qualities.includes('HIGH'))
            return 'HIGH';
        return 'VERY_HIGH';
    }
    /**
     * Selecciona los finalistas presentados al usuario
     */
    static selectFinalists(highProbCandidates, valueCandidates, balancedCandidates, allCount) {
        const topHighProb = highProbCandidates[0] || null;
        const topValue = valueCandidates[0] || null;
        const topBalanced = balancedCandidates[0] || null;
        // Foco del Día: el candidato de mayor puntuación global considerando calidad y bajo riesgo
        const allTop = [topHighProb, topValue, topBalanced].filter((c) => c !== null);
        let focoDelDia = null;
        if (allTop.length > 0) {
            // Elegir el de mejor ranking global con EV positivo o alta probabilidad
            focoDelDia = [...allTop].sort((a, b) => b.rankingScore - a.rankingScore)[0];
        }
        // Alternativas: candidatos balanceados y secundarios distintos al foco del día
        const alternativas = [];
        const usedCombosKey = new Set();
        if (focoDelDia) {
            usedCombosKey.add(this.getCombinationKey(focoDelDia.selections));
        }
        if (topHighProb) {
            usedCombosKey.add(this.getCombinationKey(topHighProb.selections));
        }
        if (topValue) {
            usedCombosKey.add(this.getCombinationKey(topValue.selections));
        }
        // Añadir balanced si es distinto
        if (topBalanced && !usedCombosKey.has(this.getCombinationKey(topBalanced.selections))) {
            alternativas.push(topBalanced);
            usedCombosKey.add(this.getCombinationKey(topBalanced.selections));
        }
        // Rellenar con otros candidatos sólidos
        for (const cand of [...balancedCandidates, ...valueCandidates, ...highProbCandidates]) {
            if (alternativas.length >= 3)
                break;
            const key = this.getCombinationKey(cand.selections);
            if (!usedCombosKey.has(key)) {
                alternativas.push(cand);
                usedCombosKey.add(key);
            }
        }
        return {
            focoDelDia,
            altaProbabilidad: topHighProb,
            deValor: topValue,
            alternativas,
            allCandidatesCount: allCount
        };
    }
    static getCombinationKey(selections) {
        return selections
            .map(s => `${s.matchId}_${s.market}_${s.selection}`)
            .sort()
            .join('|');
    }
    /**
     * Algoritmo combinatorio simple nCr limitado
     */
    static getCombinations(arr, k, maxCount = 100) {
        const results = [];
        function backtrack(start, current) {
            if (results.length >= maxCount)
                return;
            if (current.length === k) {
                results.push([...current]);
                return;
            }
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                backtrack(i + 1, current);
                current.pop();
            }
        }
        backtrack(0, []);
        return results;
    }
}
exports.ParlayEngine = ParlayEngine;
//# sourceMappingURL=parlay.engine.js.map