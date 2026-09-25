import { onRequest } from 'firebase-functions/v2/https';
import { SportsService } from './services/sports.service.js';
import { OddsService } from './services/odds.service.js';
import { AnalysisEngine } from './analysis/analysis.service.js';
import { ParlayCalculator, ParlayLeg } from './parlays/parlay.calculator.js';
import { PredictionService } from './prediction/prediction.service.js';
import { ContextAnalysisService } from './services/context.analysis.service.js';
import { StructuredLogger } from './utils/logger.js';
import { config } from './config/index.js';
import { getColombiaTodayString } from './utils/colombiaDate.js';

export { syncOddsJob } from './jobs/scheduledSync.job.js';
export { dailyAnalysisJob, triggerDailyAnalysisNow } from './jobs/dailyAnalysis.job.js';
export { resultSettlementJob, triggerResultSettlementNow } from './jobs/resultSettlement.job.js';

const logger = new StructuredLogger('CloudFunctionsIndex');

// 1. Health Check
export const healthCheck = onRequest({ cors: true }, (_req, res) => {
  logger.info('HealthCheck consultado');
  res.json({
    status: 'ok',
    service: 'Bet Analyzer Backend',
    version: '1.0.0',
    mode: config.isMockMode ? 'MOCK_DATA' : 'PRODUCTION',
    timestamp: new Date().toISOString()
  });
});

// 2. Obtener Partidos (En vivo y próximos)
export const getMatches = onRequest({ cors: true }, async (req, res) => {
  try {
    const sportsService = new SportsService();
    const type = req.query['type'] as string || 'all';
    const competitionId = req.query['competition'] as string;

    if (type === 'live') {
      const matches = await sportsService.getLiveMatches(competitionId);
      res.json({ success: true, data: matches });
      return;
    }

    const matches = await sportsService.getUpcomingMatches(undefined, competitionId);
    res.json({ success: true, data: matches });
  } catch (error) {
    logger.error('Error en getMatches', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3. Obtener Cuotas de Evento
export const getMatchOdds = onRequest({ cors: true }, async (req, res) => {
  try {
    const sportKey = req.query['sportKey'] as string || 'soccer_epl';
    const eventId = req.query['eventId'] as string;

    if (!eventId) {
      res.status(400).json({ success: false, error: 'Parámetro eventId requerido' });
      return;
    }

    const oddsService = new OddsService();
    const odds = await oddsService.getMatchOdds(sportKey, eventId);
    res.json({ success: true, data: odds });
  } catch (error) {
    logger.error('Error en getMatchOdds', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 4. Obtener Análisis Cuantitativo Unificado
export const getMatchAnalysis = onRequest({ cors: true }, async (req, res) => {
  try {
    const matchId = req.query['matchId'] as string;
    const sportKey = req.query['sportKey'] as string || 'soccer_epl';

    if (!matchId) {
      res.status(400).json({ success: false, error: 'Parámetro matchId requerido' });
      return;
    }

    const engine = new AnalysisEngine();
    const report = await engine.analyzeMatch(matchId, sportKey);
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Error en getMatchAnalysis', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 5. Calculadora de Parlays con EV
export const calculateParlay = onRequest({ cors: true }, (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
      return;
    }

    const body = req.body as { legs?: ParlayLeg[]; stake?: number };
    if (!body.legs || !Array.isArray(body.legs) || body.legs.length === 0) {
      res.status(400).json({ success: false, error: 'Se requiere una lista no vacía de selecciones (legs).' });
      return;
    }

    const result = ParlayCalculator.calculate(body.legs, body.stake || 10);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error en calculateParlay', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 6. Validación y Actualización de Preferencias de Usuario (Backend Enforcement)
export const updateUserSettings = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
      return;
    }

    const body = req.body as {
      userId?: string;
      activeCompetitionIds?: string[];
      activeBookmakerIds?: string[];
      activeMarketKeys?: string[];
      oddsFormat?: string;
      analysisTime?: string;
    };

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
  } catch (error) {
    logger.error('Error en updateUserSettings', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 7. Catálogos Globales (Competiciones, Casas y Mercados)
export const getGlobalCatalogs = onRequest({ cors: true }, (_req, res) => {
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
export const syncSportsData = onRequest({ cors: true }, async (req, res) => {
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
    const sportsService = new SportsService();
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
  } catch (error) {
    logger.error('Error durante la sincronización manual de deportes', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    isSportsSyncInProgress = false;
  }
});

// 9. Consulta de Telemetría y Presupuesto de API-Football
export const getProviderUsage = onRequest({ cors: true }, async (_req, res) => {
  const { apiUsageManager } = await import('./services/apiUsageManager.js');
  const stats = apiUsageManager.getDailyStats();
  res.json({
    success: true,
    data: stats
  });
});

// 10. Comparación de Cuotas Multi-Casa (The Odds API)
export const getMatchOddsComparison = onRequest({ cors: true }, async (req, res) => {
  const eventId = (req.query.eventId as string) || (req.body?.eventId as string);
  const sportKey = (req.query.sportKey as string) || (req.body?.sportKey as string) || 'soccer_epl';
  const bookmakersParam = (req.query.bookmakers as string) || (req.body?.bookmakers as string[]);

  if (!eventId) {
    res.status(400).json({ success: false, error: 'Parámetro eventId es requerido.' });
    return;
  }

  let requestedBookmakers: string[] | undefined;
  if (Array.isArray(bookmakersParam)) {
    requestedBookmakers = bookmakersParam;
  } else if (typeof bookmakersParam === 'string' && bookmakersParam.trim().length > 0) {
    requestedBookmakers = bookmakersParam.split(',').map(b => b.trim());
  }

  try {
    const oddsService = new OddsService();
    const comparison = await oddsService.getMatchOddsComparison(sportKey, eventId, requestedBookmakers);
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    logger.error(`Error obteniendo comparación de cuotas para evento ${eventId}`, error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 11. Consulta de Telemetría y Presupuesto de The Odds API
export const getOddsUsage = onRequest({ cors: true }, async (_req, res) => {
  const { oddsUsageManager } = await import('./services/oddsUsageManager.js');
  const stats = oddsUsageManager.getUsageStats();
  res.json({
    success: true,
    data: stats
  });
});

// 12. Motor Estadístico — Predicción de un partido (todos los mercados)
export const getMatchPredictions = onRequest({ cors: true }, async (req, res) => {
  try {
    const matchId = (req.query.matchId as string) || req.body?.matchId;
    const homeTeamId = (req.query.homeTeamId as string) || req.body?.homeTeamId;
    const awayTeamId = (req.query.awayTeamId as string) || req.body?.awayTeamId;
    const homeTeamName = (req.query.homeTeamName as string) || req.body?.homeTeamName || 'Local';
    const awayTeamName = (req.query.awayTeamName as string) || req.body?.awayTeamName || 'Visitante';
    const competitionId = (req.query.competitionId as string) || req.body?.competitionId || 'unknown';
    const utcDate = (req.query.utcDate as string) || req.body?.utcDate || new Date().toISOString();

    if (!matchId || !homeTeamId || !awayTeamId) {
      res.status(400).json({
        success: false,
        error: 'Parámetros requeridos: matchId, homeTeamId, awayTeamId'
      });
      return;
    }

    const predictionService = new PredictionService();

    // Input mínimo: solo con datos del partido (sin forma histórica)
    // En producción los datos de forma se construyen desde SportsService
    const input = {
      matchId,
      status: 'SCHEDULED' as const,
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
  } catch (error) {
    logger.error('Error en getMatchPredictions', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 13. Motor Estadístico — Análisis histórico guardado para un partido
export const getStoredAnalyses = onRequest({ cors: true }, async (req, res) => {
  try {
    const matchId = (req.query.matchId as string) || req.body?.matchId;

    if (!matchId) {
      res.status(400).json({ success: false, error: 'Parámetro matchId requerido' });
      return;
    }

    const predictionService = new PredictionService();
    const analyses = await predictionService.getStoredAnalyses(matchId);

    res.json({
      success: true,
      data: analyses,
      meta: { matchId, count: analyses.length }
    });
  } catch (error) {
    logger.error('Error en getStoredAnalyses', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 14. Análisis Contextual con Gemini (partido individual)
export const getContextAnalysis = onRequest({ cors: true }, async (req, res) => {
  try {
    const matchId = (req.query.matchId as string) || req.body?.matchId;
    const homeTeam = (req.query.homeTeam as string) || req.body?.homeTeam;
    const awayTeam = (req.query.awayTeam as string) || req.body?.awayTeam;
    const competition = (req.query.competition as string) || req.body?.competition || 'Competición desconocida';
    const utcDate = (req.query.utcDate as string) || req.body?.utcDate || new Date().toISOString();

    if (!matchId || !homeTeam || !awayTeam) {
      res.status(400).json({ success: false, error: 'Parámetros requeridos: matchId, homeTeam, awayTeam' });
      return;
    }

    const statsHome = parseFloat((req.query.statsHome as string) || req.body?.statsHome || '0.4');
    const statsDraw = parseFloat((req.query.statsDraw as string) || req.body?.statsDraw || '0.3');
    const statsAway = parseFloat((req.query.statsAway as string) || req.body?.statsAway || '0.3');
    const dataQuality = (req.query.dataQuality as string) || req.body?.dataQuality || 'LOW';

    const contextService = new ContextAnalysisService();
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
        meta: { matchId, status: 'GEMINI_FAILED', message: 'El análisis estadístico sigue disponible.', provider: config.isMockMode ? 'mock' : 'gemini', model: config.geminiModel }
      });
      return;
    }

    res.json({
      success: true, data: output,
      meta: { matchId, provider: config.isMockMode ? 'mock' : 'gemini', model: config.geminiModel, confidenceAdjustment: output.confidenceAdjustment, sourceQuality: output.sourceQuality, generatedAt: new Date().toISOString() }
    });
  } catch (error) {
    logger.error('Error en getContextAnalysis', error as Error);
    res.status(500).json({ success: false, error: 'Error en el servicio de análisis contextual. El motor estadístico sigue disponible.' });
  }
});

// 15. Análisis Contextuales históricos guardados (para auditoría)
export const getStoredContextAnalyses = onRequest({ cors: true }, async (req, res) => {
  try {
    const matchId = (req.query.matchId as string) || req.body?.matchId;
    if (!matchId) { res.status(400).json({ success: false, error: 'Parámetro matchId requerido' }); return; }
    const contextService = new ContextAnalysisService();
    const analyses = await contextService.getStoredContextAnalyses(matchId);
    res.json({ success: true, data: analyses, meta: { matchId, count: analyses.length } });
  } catch (error) {
    logger.error('Error en getStoredContextAnalyses', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 16. Motor de Parlays — Generar combinadas personalizadas para el usuario
export const generateUserParlays = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = (req.body?.userId as string) || (req.query.userId as string);
    const date = (req.body?.date as string) || (req.query.date as string);

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
  } catch (error) {
    logger.error('Error en generateUserParlays', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 17. Motor de Parlays — Consultar combinadas guardadas del usuario
export const getUserParlays = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = (req.query.userId as string) || (req.body?.userId as string);
    const date = (req.query.date as string) || (req.body?.date as string);

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
        date: date || getColombiaTodayString()
      }
    });
  } catch (error) {
    logger.error('Error en getUserParlays', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
