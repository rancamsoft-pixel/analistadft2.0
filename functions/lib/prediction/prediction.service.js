"use strict";
/**
 * PredictionService — Persistencia y Recuperación de Análisis.
 *
 * Responsabilidades:
 * 1. Construir MatchInputData desde los datos disponibles (SportsService + OddsService)
 * 2. Llamar al PredictionEngine
 * 3. Guardar en Firestore: analyses/{analysisId}
 * 4. Asegurar que SOLO se usan datos previos al partido (no leakage)
 * 5. Exponer métodos para recuperar análisis guardados
 *
 * PRINCIPIO DE NO-LEAKAGE:
 * Cada análisis guardado incluye un inputSnapshot con todos los datos
 * que existían ANTES del partido. Esto permite backtesting posterior
 * sin contaminar con información futura.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionService = void 0;
const firestore_1 = require("firebase-admin/firestore");
const prediction_engine_js_1 = require("./prediction.engine.js");
const logger_js_1 = require("../utils/logger.js");
const logger = new logger_js_1.StructuredLogger('PredictionService');
class PredictionService {
    engine;
    db;
    constructor(engineWeights) {
        this.engine = new prediction_engine_js_1.PredictionEngine(engineWeights);
        this.db = (0, firestore_1.getFirestore)();
    }
    // ---------------------------------------------------------------------------
    // API pública principal
    // ---------------------------------------------------------------------------
    /**
     * Genera predicciones para un partido completo (todos los mercados soportados).
     * Guarda en Firestore y devuelve los resultados.
     *
     * @param input      Datos del partido pre-partido (no debe incluir resultado final)
     * @param oddsData   Cuotas de mercado (opcional, para edge/EV)
     * @param oddsTimestamp Timestamp de las cuotas
     */
    async predictAndStore(input, oddsData, oddsTimestamp) {
        logger.info(`Iniciando análisis estadístico para partido ${input.matchId}`);
        // Construir el mapa de cuotas
        const oddsMap = oddsData
            ? this.buildOddsMap(oddsData)
            : undefined;
        // Ejecutar el motor
        const results = await this.engine.predict(input, oddsMap, oddsTimestamp);
        // Persistir en Firestore (fire-and-forget con catch para no bloquear la respuesta)
        this.persistResults(results, input.matchId).catch(err => {
            logger.error(`Error persistiendo análisis para ${input.matchId}`, err);
        });
        logger.info(`Análisis completado: ${results.length} selecciones calculadas para ${input.matchId}`);
        return results;
    }
    /**
     * Recupera análisis guardados para un partido específico.
     */
    async getStoredAnalyses(matchId) {
        try {
            const snapshot = await this.db
                .collection('analyses')
                .where('matchId', '==', matchId)
                .orderBy('generatedAt', 'desc')
                .limit(100)
                .get();
            return snapshot.docs.map(doc => doc.data());
        }
        catch (error) {
            logger.error(`Error recuperando análisis para ${matchId}`, error);
            return [];
        }
    }
    /**
     * Recupera el análisis más reciente para un partido y mercado específico.
     */
    async getLatestAnalysis(matchId, market, selection) {
        try {
            const snapshot = await this.db
                .collection('analyses')
                .where('matchId', '==', matchId)
                .where('market', '==', market)
                .where('selection', '==', selection)
                .orderBy('generatedAt', 'desc')
                .limit(1)
                .get();
            if (snapshot.empty)
                return null;
            return snapshot.docs[0].data();
        }
        catch (error) {
            logger.error(`Error recuperando análisis reciente para ${matchId}/${market}/${selection}`, error);
            return null;
        }
    }
    // ---------------------------------------------------------------------------
    // Helpers para construir MatchInputData desde fuentes externas
    // ---------------------------------------------------------------------------
    /**
     * Construye TeamFormData desde resultados brutos de API-Football.
     * Solo considera los campos disponibles sin imponer penalizaciones extremas.
     */
    static buildTeamFormData(results, // e.g. "WWDLW" string de la API
    goalsScored, goalsConceded, venueFilter, xgScored, xgConceded, shots) {
        const resultArray = (results || '')
            .split('')
            .filter(r => ['W', 'D', 'L'].includes(r))
            .map(r => r);
        return {
            results: resultArray,
            goalsScored: goalsScored || [],
            goalsConceded: goalsConceded || [],
            xgScored: xgScored && xgScored.length > 0 ? xgScored : undefined,
            xgConceded: xgConceded && xgConceded.length > 0 ? xgConceded : undefined,
            shots: shots && shots.length > 0 ? shots : undefined,
            venueFilter,
            matchCount: Math.min(resultArray.length, goalsScored?.length || 0)
        };
    }
    /**
     * Construye H2HData desde el resultado de getH2H().
     */
    static buildH2HData(h2h) {
        const totalGoals = h2h.recentMatches.reduce((sum, m) => {
            const parts = m.score?.split(' - ') || [];
            return sum + (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0);
        }, 0);
        return {
            totalMatches: h2h.totalMatches,
            homeTeamWins: h2h.homeWins,
            awayTeamWins: h2h.awayWins,
            draws: h2h.draws,
            totalGoals,
            recentMatchCount: h2h.recentMatches.length
        };
    }
    /**
     * Construye InjuryData desde el resultado de getInjuries().
     * Identifica jugadores clave (portero, delantero) como "key players".
     */
    static buildInjuryData(injuries, homeTeamId, awayTeamId) {
        const KEY_POSITIONS = ['Goalkeeper', 'Attacker', 'G', 'F'];
        const homeInjuries = injuries.filter(i => i.team.id === homeTeamId);
        const awayInjuries = injuries.filter(i => i.team.id === awayTeamId);
        const isKeyPlayer = (inj) => KEY_POSITIONS.some(pos => inj.player.type?.toLowerCase().includes(pos.toLowerCase()) ||
            inj.player.position?.toLowerCase().includes(pos.toLowerCase()));
        return {
            homeInjuryCount: homeInjuries.length,
            awayInjuryCount: awayInjuries.length,
            homeKeyPlayersInjured: homeInjuries.filter(isKeyPlayer).length,
            awayKeyPlayersInjured: awayInjuries.filter(isKeyPlayer).length
        };
    }
    /**
     * Construye StandingData desde la tabla de la liga.
     */
    static buildStandingData(homeTeamId, awayTeamId, standings) {
        const homeStanding = standings.find(s => s.team.id === homeTeamId);
        const awayStanding = standings.find(s => s.team.id === awayTeamId);
        if (!homeStanding || !awayStanding)
            return undefined;
        return {
            homeRank: homeStanding.rank,
            awayRank: awayStanding.rank,
            totalTeams: standings.length,
            homePoints: homeStanding.points,
            awayPoints: awayStanding.points,
            homeGoalDiff: homeStanding.goalsDiff,
            awayGoalDiff: awayStanding.goalsDiff
        };
    }
    // ---------------------------------------------------------------------------
    // Persistencia
    // ---------------------------------------------------------------------------
    async persistResults(results, matchId) {
        const batch = this.db.batch();
        const analysesRef = this.db.collection('analyses');
        // Solo persistimos resultados no descartados (los descartados se devuelven al cliente pero no se almacenan)
        const validResults = results.filter(r => !r.discardReason);
        if (validResults.length === 0) {
            logger.info(`Sin resultados válidos para persistir de ${matchId}`);
            return;
        }
        for (const result of validResults) {
            const docRef = analysesRef.doc(result.analysisId);
            batch.set(docRef, result, { merge: false }); // No merge: cada análisis es inmutable
        }
        await batch.commit();
        logger.info(`Persistidos ${validResults.length} análisis para ${matchId}`);
    }
    buildOddsMap(oddsData) {
        const map = new Map();
        for (const odds of oddsData) {
            const key = `${odds.market}_${odds.selection}`;
            map.set(key, {
                selectionOdds: odds.odds,
                allOutcomeOdds: odds.allOdds
            });
        }
        return map;
    }
}
exports.PredictionService = PredictionService;
//# sourceMappingURL=prediction.service.js.map