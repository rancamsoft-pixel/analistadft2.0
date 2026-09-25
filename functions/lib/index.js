"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserParlays = exports.generateUserParlays = exports.getStoredContextAnalyses = exports.getContextAnalysis = exports.getStoredAnalyses = exports.getMatchPredictions = exports.getOddsUsage = exports.getMatchOddsComparison = exports.getProviderUsage = exports.syncSportsData = exports.getGlobalCatalogs = exports.updateUserSettings = exports.calculateParlay = exports.getMatchAnalysis = exports.getMatchOdds = exports.getMatches = exports.healthCheck = exports.triggerResultSettlementNow = exports.resultSettlementJob = exports.triggerDailyAnalysisNow = exports.dailyAnalysisJob = exports.syncOddsJob = void 0;
const https_1 = require("firebase-functions/v2/https");
const sports_service_js_1 = require("./services/sports.service.js");
const odds_service_js_1 = require("./services/odds.service.js");
const analysis_service_js_1 = require("./analysis/analysis.service.js");
const parlay_calculator_js_1 = require("./parlays/parlay.calculator.js");
const prediction_service_js_1 = require("./prediction/prediction.service.js");
const context_analysis_service_js_1 = require("./services/context.analysis.service.js");
const logger_js_1 = require("./utils/logger.js");
const index_js_1 = require("./config/index.js");
const colombiaDate_js_1 = require("./utils/colombiaDate.js");
var scheduledSync_job_js_1 = require("./jobs/scheduledSync.job.js");
Object.defineProperty(exports, "syncOddsJob", { enumerable: true, get: function () { return scheduledSync_job_js_1.syncOddsJob; } });
var dailyAnalysis_job_js_1 = require("./jobs/dailyAnalysis.job.js");
Object.defineProperty(exports, "dailyAnalysisJob", { enumerable: true, get: function () { return dailyAnalysis_job_js_1.dailyAnalysisJob; } });
Object.defineProperty(exports, "triggerDailyAnalysisNow", { enumerable: true, get: function () { return dailyAnalysis_job_js_1.triggerDailyAnalysisNow; } });
var resultSettlement_job_js_1 = require("./jobs/resultSettlement.job.js");
Object.defineProperty(exports, "resultSettlementJob", { enumerable: true, get: function () { return resultSettlement_job_js_1.resultSettlementJob; } });
Object.defineProperty(exports, "triggerResultSettlementNow", { enumerable: true, get: function () { return resultSettlement_job_js_1.triggerResultSettlementNow; } });
const logger = new logger_js_1.StructuredLogger('CloudFunctionsIndex');
// 1. Health Check
exports.healthCheck = (0, https_1.onRequest)({ cors: true }, (_req, res) => {
    logger.info('HealthCheck consultado');
    res.json({
        status: 'ok',
        service: 'Bet Analyzer Backend',
        version: '1.0.0',
        mode: index_js_1.config.isMockMode ? 'MOCK_DATA' : 'PRODUCTION',
        timestamp: new Date().toISOString()
    });
});
// 2. Obtener Partidos (En vivo y próximos)
exports.getMatches = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const sportsService = new sports_service_js_1.SportsService();
        const type = req.query['type'] || 'all';
        const competitionId = req.query['competition'];
        if (type === 'live') {
            const matches = await sportsService.getLiveMatches(competitionId);
            res.json({ success: true, data: matches });
            return;
        }
        const matches = await sportsService.getUpcomingMatches(undefined, competitionId);
        res.json({ success: true, data: matches });
    }
    catch (error) {
        logger.error('Error en getMatches', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 3. Obtener Cuotas de Evento
exports.getMatchOdds = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const sportKey = req.query['sportKey'] || 'soccer_epl';
        const eventId = req.query['eventId'];
        if (!eventId) {
            res.status(400).json({ success: false, error: 'Parámetro eventId requerido' });
            return;
        }
        const oddsService = new odds_service_js_1.OddsService();
        const odds = await oddsService.getMatchOdds(sportKey, eventId);
        res.json({ success: true, data: odds });
    }
    catch (error) {
        logger.error('Error en getMatchOdds', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 4. Obtener Análisis Cuantitativo Unificado
exports.getMatchAnalysis = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const matchId = req.query['matchId'];
        const sportKey = req.query['sportKey'] || 'soccer_epl';
        if (!matchId) {
            res.status(400).json({ success: false, error: 'Parámetro matchId requerido' });
            return;
        }
        const engine = new analysis_service_js_1.AnalysisEngine();
        const report = await engine.analyzeMatch(matchId, sportKey);
        res.json({ success: true, data: report });
    }
    catch (error) {
        logger.error('Error en getMatchAnalysis', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 5. Calculadora de Parlays con EV
exports.calculateParlay = (0, https_1.onRequest)({ cors: true }, (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
            return;
        }
        const body = req.body;
        if (!body.legs || !Array.isArray(body.legs) || body.legs.length === 0) {
            res.status(400).json({ success: false, error: 'Se requiere una lista no vacía de selecciones (legs).' });
            return;
        }
        const result = parlay_calculator_js_1.ParlayCalculator.calculate(body.legs, body.stake || 10);
        res.json({ success: true, data: result });
    }
    catch (error) {
        logger.error('Error en calculateParlay', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 6. Validación y Actualización de Preferencias de Usuario (Backend Enforcement)
exports.updateUserSettings = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
            return;
        }
        const body = req.body;
        if (!body.userId) {
            res.status(400).json({ success: false, error: 'userId es requerido.' });
            return;
        }
        // Regla de negocio: Máx 2 campeonatos activos
        if (body.activeCompetitionIds && body.activeCompetitionIds.length > 2) {
            res.status(400).json({
                success: false,
                error: 'Límite excedido: Solo puedes activar un máximo de 2 campeonatos simultáneamente.'
            });
            return;
        }
        // Regla de negocio: Máx 5 casas de apuestas activas
        if (body.activeBookmakerIds && body.activeBookmakerIds.length > 5) {
            res.status(400).json({
                success: false,
                error: 'Límite excedido: Solo puedes activar un máximo de 5 casas de apuestas simultáneamente.'
            });
            return;
        }
        logger.info(`Preferencias validadas y actualizadas para usuario ${body.userId}`, {
            competitionsCount: body.activeCompetitionIds?.length,
            bookmakersCount: body.activeBookmakerIds?.length
        });
        res.json({
            success: true,
            message: 'Preferencias validadas y actualizadas correctamente.',
            data: {
                userId: body.userId,
                activeCompetitionIds: body.activeCompetitionIds || [],
                activeBookmakerIds: body.activeBookmakerIds || [],
                activeMarketKeys: body.activeMarketKeys || [],
                oddsFormat: body.oddsFormat || 'decimal',
                analysisTime: body.analysisTime || '08:30',
                updatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Error en updateUserSettings', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 7. Catálogos Globales (Competiciones, Casas y Mercados)
exports.getGlobalCatalogs = (0, https_1.onRequest)({ cors: true }, (_req, res) => {
    res.json({
        success: true,
        data: {
            maxCompetitions: 2,
            maxBookmakers: 5,
            sportsSupported: ['football'],
            marketsAvailable: [
                { key: '1X2', name: 'Resultado Final (1X2)' },
                { key: 'double_chance', name: 'Doble Oportunidad' },
                { key: 'draw_no_bet', name: 'Empate Apuesta No Válida' },
                { key: 'over_under', name: 'Totales (Más/Menos 2.5)' },
                { key: 'both_teams_to_score', name: 'Ambos Equipos Anotan' },
                { key: 'asian_handicap', name: 'Hándicap Asiático' }
            ]
        }
    });
});
// Mutex lock para impedir sincronizaciones simultáneas
let isSportsSyncInProgress = false;
// 8. Sincronización Manual de Datos Deportivos (Admin Trigger con Mutex y Verificación de Presupuesto)
exports.syncSportsData = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
        return;
    }
    if (isSportsSyncInProgress) {
        res.status(409).json({
            success: false,
            error: 'Una sincronización de datos deportivos ya está en ejecución. Espera a que finalice para no saturar la cuota.'
        });
        return;
    }
    const { apiUsageManager } = await import('./services/apiUsageManager.js');
    const usageCheck = apiUsageManager.canMakeRequest('api-football');
    if (!usageCheck.allowed) {
        res.status(429).json({
            success: false,
            error: 'Presupuesto diario alcanzado (80 requests/día). Sincronización externa pausada; se servirá desde cache.'
        });
        return;
    }
    isSportsSyncInProgress = true;
    logger.info('Iniciando sincronización manual de datos deportivos...');
    try {
        const sportsService = new sports_service_js_1.SportsService();
        // Consultar partidos utilizando el pipeline de cache y normalización
        const upcoming = await sportsService.getUpcomingMatches();
        const live = await sportsService.getLiveMatches();
        const totalMatches = upcoming.length + live.length;
        const currentStats = apiUsageManager.getDailyStats();
        res.json({
            success: true,
            message: 'Sincronización de datos deportivos completada con éxito.',
            matchesProcessed: totalMatches,
            stats: currentStats
        });
    }
    catch (error) {
        logger.error('Error durante la sincronización manual de deportes', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        isSportsSyncInProgress = false;
    }
});
// 9. Consulta de Telemetría y Presupuesto de API-Football
exports.getProviderUsage = (0, https_1.onRequest)({ cors: true }, async (_req, res) => {
    const { apiUsageManager } = await import('./services/apiUsageManager.js');
    const stats = apiUsageManager.getDailyStats();
    res.json({
        success: true,
        data: stats
    });
});
// 10. Comparación de Cuotas Multi-Casa (The Odds API)
exports.getMatchOddsComparison = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    const eventId = req.query.eventId || req.body?.eventId;
    const sportKey = req.query.sportKey || req.body?.sportKey || 'soccer_epl';
    const bookmakersParam = req.query.bookmakers || req.body?.bookmakers;
    if (!eventId) {
        res.status(400).json({ success: false, error: 'Parámetro eventId es requerido.' });
        return;
    }
    let requestedBookmakers;
    if (Array.isArray(bookmakersParam)) {
        requestedBookmakers = bookmakersParam;
    }
    else if (typeof bookmakersParam === 'string' && bookmakersParam.trim().length > 0) {
        requestedBookmakers = bookmakersParam.split(',').map(b => b.trim());
    }
    try {
        const oddsService = new odds_service_js_1.OddsService();
        const comparison = await oddsService.getMatchOddsComparison(sportKey, eventId, requestedBookmakers);
        res.json({
            success: true,
            data: comparison
        });
    }
    catch (error) {
        logger.error(`Error obteniendo comparación de cuotas para evento ${eventId}`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 11. Consulta de Telemetría y Presupuesto de The Odds API
exports.getOddsUsage = (0, https_1.onRequest)({ cors: true }, async (_req, res) => {
    const { oddsUsageManager } = await import('./services/oddsUsageManager.js');
    const stats = oddsUsageManager.getUsageStats();
    res.json({
        success: true,
        data: stats
    });
});
// 12. Motor Estadístico — Predicción de un partido (todos los mercados)
exports.getMatchPredictions = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const matchId = req.query.matchId || req.body?.matchId;
        const homeTeamId = req.query.homeTeamId || req.body?.homeTeamId;
        const awayTeamId = req.query.awayTeamId || req.body?.awayTeamId;
        const homeTeamName = req.query.homeTeamName || req.body?.homeTeamName || 'Local';
        const awayTeamName = req.query.awayTeamName || req.body?.awayTeamName || 'Visitante';
        const competitionId = req.query.competitionId || req.body?.competitionId || 'unknown';
        const utcDate = req.query.utcDate || req.body?.utcDate || new Date().toISOString();
        if (!matchId || !homeTeamId || !awayTeamId) {
            res.status(400).json({
                success: false,
                error: 'Parámetros requeridos: matchId, homeTeamId, awayTeamId'
            });
            return;
        }
        const predictionService = new prediction_service_js_1.PredictionService();
        // Input mínimo: solo con datos del partido (sin forma histórica)
        // En producción los datos de forma se construyen desde SportsService
        const input = {
            matchId,
            status: 'SCHEDULED',
            homeTeamId,
            awayTeamId,
            homeTeamName,
            awayTeamName,
            competitionId,
            utcDate,
            lineupsAvailable: false
        };
        const results = await predictionService.predictAndStore(input);
        res.json({
            success: true,
            data: results,
            meta: {
                matchId,
                totalSelections: results.length,
                validSelections: results.filter(r => !r.discardReason).length,
                discardedSelections: results.filter(r => !!r.discardReason).length,
                modelVersion: results[0]?.modelVersion,
                dataQuality: results[0]?.dataQuality,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Error en getMatchPredictions', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 13. Motor Estadístico — Análisis histórico guardado para un partido
exports.getStoredAnalyses = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const matchId = req.query.matchId || req.body?.matchId;
        if (!matchId) {
            res.status(400).json({ success: false, error: 'Parámetro matchId requerido' });
            return;
        }
        const predictionService = new prediction_service_js_1.PredictionService();
        const analyses = await predictionService.getStoredAnalyses(matchId);
        res.json({
            success: true,
            data: analyses,
            meta: { matchId, count: analyses.length }
        });
    }
    catch (error) {
        logger.error('Error en getStoredAnalyses', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 14. Análisis Contextual con Gemini (partido individual)
exports.getContextAnalysis = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const matchId = req.query.matchId || req.body?.matchId;
        const homeTeam = req.query.homeTeam || req.body?.homeTeam;
        const awayTeam = req.query.awayTeam || req.body?.awayTeam;
        const competition = req.query.competition || req.body?.competition || 'Competición desconocida';
        const utcDate = req.query.utcDate || req.body?.utcDate || new Date().toISOString();
        if (!matchId || !homeTeam || !awayTeam) {
            res.status(400).json({ success: false, error: 'Parámetros requeridos: matchId, homeTeam, awayTeam' });
            return;
        }
        const statsHome = parseFloat(req.query.statsHome || req.body?.statsHome || '0.4');
        const statsDraw = parseFloat(req.query.statsDraw || req.body?.statsDraw || '0.3');
        const statsAway = parseFloat(req.query.statsAway || req.body?.statsAway || '0.3');
        const dataQuality = req.query.dataQuality || req.body?.dataQuality || 'LOW';
        const contextService = new context_analysis_service_js_1.ContextAnalysisService();
        const input = {
            matchId, homeTeam, awayTeam, competition, utcDate,
            statisticalProbabilities: { home: statsHome, draw: statsDraw, away: statsAway, dataQuality, modelVersion: 'v1.0.0' },
            homeRecentForm: req.body?.homeRecentForm,
            awayRecentForm: req.body?.awayRecentForm,
            homeInjuries: req.body?.homeInjuries,
            awayInjuries: req.body?.awayInjuries,
            homeStandingRank: req.body?.homeStandingRank,
            awayStandingRank: req.body?.awayStandingRank,
            totalTeamsInTable: req.body?.totalTeamsInTable,
            homeRestDays: req.body?.homeRestDays,
            awayRestDays: req.body?.awayRestDays,
            relevantNews: req.body?.relevantNews,
            h2hSummary: req.body?.h2hSummary,
            matchImportance: req.body?.matchImportance,
            marketOdds: req.body?.marketOdds
        };
        const output = await contextService.analyzeSingleMatch(input);
        if (!output) {
            res.json({
                success: true, data: null,
                meta: { matchId, status: 'GEMINI_FAILED', message: 'El análisis estadístico sigue disponible.', provider: index_js_1.config.isMockMode ? 'mock' : 'gemini', model: index_js_1.config.geminiModel }
            });
            return;
        }
        res.json({
            success: true, data: output,
            meta: { matchId, provider: index_js_1.config.isMockMode ? 'mock' : 'gemini', model: index_js_1.config.geminiModel, confidenceAdjustment: output.confidenceAdjustment, sourceQuality: output.sourceQuality, generatedAt: new Date().toISOString() }
        });
    }
    catch (error) {
        logger.error('Error en getContextAnalysis', error);
        res.status(500).json({ success: false, error: 'Error en el servicio de análisis contextual. El motor estadístico sigue disponible.' });
    }
});
// 15. Análisis Contextuales históricos guardados (para auditoría)
exports.getStoredContextAnalyses = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const matchId = req.query.matchId || req.body?.matchId;
        if (!matchId) {
            res.status(400).json({ success: false, error: 'Parámetro matchId requerido' });
            return;
        }
        const contextService = new context_analysis_service_js_1.ContextAnalysisService();
        const analyses = await contextService.getStoredContextAnalyses(matchId);
        res.json({ success: true, data: analyses, meta: { matchId, count: analyses.length } });
    }
    catch (error) {
        logger.error('Error en getStoredContextAnalyses', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 16. Motor de Parlays — Generar combinadas personalizadas para el usuario
exports.generateUserParlays = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const userId = req.body?.userId || req.query.userId;
        const date = req.body?.date || req.query.date;
        if (!userId) {
            res.status(400).json({ success: false, error: 'Parámetro userId requerido.' });
            return;
        }
        const { ParlayService } = await import('./parlays/parlay.service.js');
        const parlayService = new ParlayService();
        const parlays = await parlayService.generateAndStoreUserParlays(userId, date);
        res.json({
            success: true,
            data: parlays,
            meta: {
                userId,
                count: parlays.length,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Error en generateUserParlays', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 17. Motor de Parlays — Consultar combinadas guardadas del usuario
exports.getUserParlays = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const userId = req.query.userId || req.body?.userId;
        const date = req.query.date || req.body?.date;
        if (!userId) {
            res.status(400).json({ success: false, error: 'Parámetro userId requerido.' });
            return;
        }
        const { ParlayService } = await import('./parlays/parlay.service.js');
        const parlayService = new ParlayService();
        const parlays = await parlayService.getUserStoredParlays(userId, date);
        res.json({
            success: true,
            data: parlays,
            meta: {
                userId,
                count: parlays.length,
                date: date || (0, colombiaDate_js_1.getColombiaTodayString)()
            }
        });
    }
    catch (error) {
        logger.error('Error en getUserParlays', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
//# sourceMappingURL=index.js.map