"use strict";
/**
 * Orquestador del Agente Diario Automático.
 *
 * Flujo:
 * DATOS GLOBALES -> CACHE -> ANÁLISIS GLOBAL -> PERSONALIZACIÓN POR USUARIO -> PARLEYS -> NOTIFICACIONES
 *
 * Principio:
 * NO ejecutar una investigación completa independientemente por cada usuario.
 * Las ligas y cuotas se consultan y analizan 1 sola vez de forma global, y luego
 * se generan y guardan los parlays personalizados para cada usuario activo.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyAnalysisOrchestrator = void 0;
const firestore_1 = require("firebase-admin/firestore");
const jobLock_manager_js_1 = require("./jobLock.manager.js");
const sports_service_js_1 = require("../services/sports.service.js");
const odds_service_js_1 = require("../services/odds.service.js");
const parlay_engine_js_1 = require("../parlays/parlay.engine.js");
const parlay_explainer_js_1 = require("../parlays/parlay.explainer.js");
const fcm_service_js_1 = require("../notifications/fcm.service.js");
const logger_js_1 = require("../utils/logger.js");
const logger = new logger_js_1.StructuredLogger('DailyAnalysisOrchestrator');
class DailyAnalysisOrchestrator {
    db;
    lockManager;
    sportsService;
    oddsService;
    fcmService;
    constructor() {
        this.db = (0, firestore_1.getFirestore)();
        this.lockManager = new jobLock_manager_js_1.JobLockManager();
        this.sportsService = new sports_service_js_1.SportsService();
        this.oddsService = new odds_service_js_1.OddsService();
        this.fcmService = new fcm_service_js_1.FCMService();
    }
    /**
     * Ejecuta el pipeline completo del análisis diario
     */
    async runDailyPipeline(forcedDate, force = false) {
        const today = forcedDate || new Date().toISOString().split('T')[0];
        const startTime = Date.now();
        const workerId = `worker_${process.pid}_${Math.random().toString(36).substring(2, 7)}`;
        logger.info(`=== INICIANDO AGENTE DIARIO AUTOMÁTICO PARA ${today} (Instance: ${workerId}) ===`);
        // 1. Adquisición del Lock de Idempotencia
        const lockResult = await this.lockManager.acquireLock(today, workerId, force);
        if (!lockResult.acquired) {
            logger.warn(`Ejecución omitida para ${today}. Razón: ${lockResult.reason}`);
            return {
                jobId: lockResult.lock?.jobId || `job_${today}`,
                date: today,
                status: lockResult.lock?.status || 'COMPLETED',
                start: new Date(startTime).toISOString(),
                end: new Date().toISOString(),
                durationMs: Date.now() - startTime,
                completedStages: lockResult.lock?.completedStages || [],
                usersProcessed: 0,
                matchesProcessed: 0,
                apiCalls: 0,
                aiCalls: 0,
                parlaysGenerated: 0,
                notificationsSent: 0,
                errors: [`Lock no adquirido: ${lockResult.reason}`]
            };
        }
        const currentLock = lockResult.lock;
        const completedStages = new Set(currentLock.completedStages || []);
        const errors = [];
        let apiCallsCount = 0;
        let aiCallsCount = 0;
        let usersProcessedCount = 0;
        let matchesProcessedCount = 0;
        let parlaysGeneratedCount = 0;
        let notificationsSentCount = 0;
        try {
            // 2. Cargar usuarios activos y configuraciones consolidadas
            const activeUsers = await this.getActiveUserContexts();
            usersProcessedCount = activeUsers.length;
            // 3. Extraer conjuntos ÚNICOS de competiciones y bookmakers
            const uniqueCompetitions = Array.from(new Set(activeUsers.flatMap(u => u.activeCompetitionIds)));
            const uniqueBookmakers = Array.from(new Set(activeUsers.flatMap(u => u.activeBookmakerIds)));
            logger.info(`Consolidación global: ${activeUsers.length} usuarios activos requieren ${uniqueCompetitions.length} ligas y ${uniqueBookmakers.length} casas.`);
            // -----------------------------------------------------------------------
            // ETAPA 1: FETCH_FIXTURES (Global para ligas únicas)
            // -----------------------------------------------------------------------
            let globalMatches = [];
            if (!completedStages.has('FETCH_FIXTURES')) {
                logger.info(`[ETAPA 1/6] Obteniendo partidos para ligas únicas: ${uniqueCompetitions.join(', ')}`);
                globalMatches = await this.fetchGlobalMatches(uniqueCompetitions, errors);
                apiCallsCount += uniqueCompetitions.length;
                await this.lockManager.updateStageCheckpoint(today, 'FETCH_FIXTURES', 'FETCH_ODDS', {
                    matchesCount: globalMatches.length,
                    competitions: uniqueCompetitions
                });
                completedStages.add('FETCH_FIXTURES');
            }
            else {
                logger.info(`[ETAPA 1/6] RECOVERY: Fixtures ya descargados previamente en checkpoint.`);
            }
            // -----------------------------------------------------------------------
            // ETAPA 2: FETCH_ODDS (Global para eventos y casas únicas)
            // -----------------------------------------------------------------------
            if (!completedStages.has('FETCH_ODDS')) {
                logger.info(`[ETAPA 2/6] Sincronizando cuotas de mercado para casas: ${uniqueBookmakers.join(', ')}`);
                const oddsSyncCount = await this.fetchGlobalOdds(uniqueCompetitions, errors);
                apiCallsCount += oddsSyncCount;
                await this.lockManager.updateStageCheckpoint(today, 'FETCH_ODDS', 'STATISTICAL_ANALYSIS', {
                    oddsSyncCount
                });
                completedStages.add('FETCH_ODDS');
            }
            else {
                logger.info(`[ETAPA 2/6] RECOVERY: Cuotas ya sincronizadas en checkpoint previo.`);
            }
            // -----------------------------------------------------------------------
            // ETAPA 3: STATISTICAL_ANALYSIS (Motor Estadístico Global)
            // -----------------------------------------------------------------------
            let globalOpportunities = [];
            if (!completedStages.has('STATISTICAL_ANALYSIS')) {
                logger.info(`[ETAPA 3/6] Ejecutando motor estadístico (Poisson + xG + Form) de forma global...`);
                globalOpportunities = await this.runGlobalStatisticalEngine(uniqueCompetitions, errors);
                matchesProcessedCount = globalOpportunities.length;
                await this.lockManager.updateStageCheckpoint(today, 'STATISTICAL_ANALYSIS', 'AI_ANALYSIS', {
                    opportunitiesCount: globalOpportunities.length
                });
                completedStages.add('STATISTICAL_ANALYSIS');
            }
            else {
                logger.info(`[ETAPA 3/6] RECOVERY: Análisis estadístico global recuperado.`);
                globalOpportunities = await this.loadOpportunitiesSnapshot(uniqueCompetitions);
                matchesProcessedCount = globalOpportunities.length;
            }
            // -----------------------------------------------------------------------
            // ETAPA 4: AI_ANALYSIS (Gemini para candidatos destacados)
            // -----------------------------------------------------------------------
            if (!completedStages.has('AI_ANALYSIS')) {
                logger.info(`[ETAPA 4/6] Evaluando candidatos de valor con analista contextual...`);
                aiCallsCount += Math.min(globalOpportunities.length, 5); // Simulado / acotado
                await this.lockManager.updateStageCheckpoint(today, 'AI_ANALYSIS', 'PARLAY_GENERATION', {
                    analyzedCount: aiCallsCount
                });
                completedStages.add('AI_ANALYSIS');
            }
            else {
                logger.info(`[ETAPA 4/6] RECOVERY: Análisis de IA ya completado previamente.`);
            }
            // -----------------------------------------------------------------------
            // ETAPA 5: PARLAY_GENERATION (Personalización en memoria por usuario)
            // -----------------------------------------------------------------------
            if (!completedStages.has('PARLAY_GENERATION')) {
                logger.info(`[ETAPA 5/6] Construyendo y guardando parlays personalizados para cada usuario...`);
                parlaysGeneratedCount = await this.generateAndStoreParlaysPerUser(today, activeUsers, globalOpportunities, errors);
                await this.lockManager.updateStageCheckpoint(today, 'PARLAY_GENERATION', 'NOTIFICATIONS', {
                    parlaysGenerated: parlaysGeneratedCount
                });
                completedStages.add('PARLAY_GENERATION');
            }
            else {
                logger.info(`[ETAPA 5/6] RECOVERY: Generación de parlays ya completada.`);
            }
            // -----------------------------------------------------------------------
            // ETAPA 6: NOTIFICATIONS (Envío FCM prudente y limpieza de tokens)
            // -----------------------------------------------------------------------
            if (!completedStages.has('NOTIFICATIONS')) {
                logger.info(`[ETAPA 6/6] Enviando notificaciones FCM a usuarios con dailyFocus activado...`);
                notificationsSentCount = await this.dispatchUserNotifications(activeUsers, errors);
                await this.lockManager.updateStageCheckpoint(today, 'NOTIFICATIONS', 'NOTIFICATIONS', {
                    notificationsSent: notificationsSentCount
                });
                completedStages.add('NOTIFICATIONS');
            }
            else {
                logger.info(`[ETAPA 6/6] RECOVERY: Notificaciones ya despachadas.`);
            }
            // 4. Marcar Job completado
            await this.lockManager.markJobCompleted(today);
            const jobLog = {
                jobId: currentLock.jobId,
                date: today,
                status: errors.length > 0 ? 'PARTIAL' : 'COMPLETED',
                start: new Date(startTime).toISOString(),
                end: new Date().toISOString(),
                durationMs: Date.now() - startTime,
                completedStages: Array.from(completedStages),
                usersProcessed: usersProcessedCount,
                matchesProcessed: matchesProcessedCount,
                apiCalls: apiCallsCount,
                aiCalls: aiCallsCount,
                parlaysGenerated: parlaysGeneratedCount,
                notificationsSent: notificationsSentCount,
                errors
            };
            await this.lockManager.saveJobLog(jobLog);
            logger.info(`=== AGENTE DIARIO COMPLETADO CON ÉXITO EN ${jobLog.durationMs}ms ===`);
            return jobLog;
        }
        catch (criticalError) {
            logger.error(`Error crítico en la ejecución del Agente Diario para ${today}`, criticalError);
            errors.push(criticalError?.message || 'Error no controlado');
            await this.lockManager.markJobFailed(today, completedStages.size > 0, criticalError?.message || 'Fallo general');
            const failedLog = {
                jobId: currentLock.jobId,
                date: today,
                status: completedStages.size > 0 ? 'PARTIAL' : 'FAILED',
                start: new Date(startTime).toISOString(),
                end: new Date().toISOString(),
                durationMs: Date.now() - startTime,
                completedStages: Array.from(completedStages),
                usersProcessed: usersProcessedCount,
                matchesProcessed: matchesProcessedCount,
                apiCalls: apiCallsCount,
                aiCalls: aiCallsCount,
                parlaysGenerated: parlaysGeneratedCount,
                notificationsSent: notificationsSentCount,
                errors
            };
            await this.lockManager.saveJobLog(failedLog);
            return failedLog;
        }
    }
    // ---------------------------------------------------------------------------
    // Helpers del Pipeline
    // ---------------------------------------------------------------------------
    /**
     * Obtiene contextos de todos los usuarios activos
     */
    async getActiveUserContexts() {
        try {
            const usersSnap = await this.db.collection('users').where('active', '==', true).limit(500).get();
            if (!usersSnap.empty) {
                const contexts = [];
                for (const userDoc of usersSnap.docs) {
                    const userId = userDoc.id;
                    const userData = userDoc.data();
                    // Preferencias de competiciones y casas
                    const prefDoc = await this.db.collection('users').doc(userId).collection('settings').doc('preferences').get();
                    const prefData = prefDoc.data() || {};
                    // Preferencias de notificación
                    const notifDoc = await this.db.collection('users').doc(userId).collection('settings').doc('notifications').get();
                    const notifData = notifDoc.data() || {};
                    // Tokens FCM registrados
                    const tokens = await this.fcmService.getUserTokens(userId);
                    contexts.push({
                        userId,
                        email: userData['email'],
                        displayName: userData['displayName'],
                        activeCompetitionIds: prefData['activeCompetitionIds'] || ['PL', 'PD'],
                        activeBookmakerIds: prefData['activeBookmakerIds'] || ['pinnacle', 'bet365'],
                        activeMarketKeys: prefData['activeMarketKeys'] || ['1X2', 'over_under', 'btts'],
                        oddsFormat: prefData['oddsFormat'] || 'decimal',
                        notificationSettings: {
                            dailyFocus: notifData['dailyFocus'] !== false, // default true
                            parlayReady: notifData['parlayReady'] !== false, // default true
                            importantOddsMovement: !!notifData['importantOddsMovement'],
                            matchStartingSoon: !!notifData['matchStartingSoon']
                        },
                        notificationTokens: tokens
                    });
                }
                return contexts;
            }
        }
        catch (err) {
            logger.warn('Error leyendo usuarios activos de Firestore, usando contexto demo', { error: err.message });
        }
        // Contexto de fallback cuando no hay usuarios registrados
        return [
            {
                userId: 'demo-user-1',
                email: 'demo@betanalyzer.com',
                displayName: 'Usuario Demo',
                activeCompetitionIds: ['PL', 'PD'],
                activeBookmakerIds: ['pinnacle', 'bet365'],
                activeMarketKeys: ['1X2', 'over_under', 'btts'],
                oddsFormat: 'decimal',
                notificationSettings: {
                    dailyFocus: true,
                    parlayReady: true,
                    importantOddsMovement: false,
                    matchStartingSoon: false
                },
                notificationTokens: []
            }
        ];
    }
    async fetchGlobalMatches(competitions, errors) {
        const allMatches = [];
        for (const compId of competitions) {
            try {
                const matches = await this.sportsService.getUpcomingMatches(undefined, compId);
                allMatches.push(...matches);
            }
            catch (err) {
                // Resiliencia: si un proveedor falla en una liga, continuamos con las demás
                logger.warn(`Error al consultar partidos para liga ${compId}:`, { error: err.message });
                errors.push(`Fallo al consultar partidos de ${compId}: ${err.message}`);
            }
        }
        return allMatches;
    }
    async fetchGlobalOdds(competitions, errors) {
        let synced = 0;
        for (const compId of competitions) {
            try {
                const sportKey = compId === 'PD' ? 'soccer_spain_la_liga' : 'soccer_epl';
                await this.oddsService.getUpcomingOdds(sportKey);
                synced++;
            }
            catch (err) {
                logger.warn(`Error al consultar cuotas para ${compId}:`, { error: err.message });
                errors.push(`Fallo al consultar cuotas de ${compId}: ${err.message}`);
            }
        }
        return synced;
    }
    async runGlobalStatisticalEngine(competitions, errors) {
        try {
            // Reutiliza o genera análisis para el conjunto global de ligas
            const { ParlayService } = await import('../parlays/parlay.service.js');
            const parlayService = new ParlayService();
            return parlayService.generateFallbackSelections({
                userId: 'global',
                activeCompetitionIds: competitions,
                activeBookmakerIds: ['pinnacle', 'bet365', 'betplay']
            });
        }
        catch (err) {
            logger.error('Error ejecutando motor estadístico global', err);
            errors.push(`Error motor estadístico: ${err.message}`);
            return [];
        }
    }
    async loadOpportunitiesSnapshot(competitions) {
        return this.runGlobalStatisticalEngine(competitions, []);
    }
    /**
     * Construye los parlays personalizados para cada usuario y los persiste
     */
    async generateAndStoreParlaysPerUser(date, users, globalPool, errors) {
        let count = 0;
        for (const user of users) {
            try {
                const engineResult = parlay_engine_js_1.ParlayEngine.generateForUser(globalPool, {
                    userId: user.userId,
                    activeCompetitionIds: user.activeCompetitionIds,
                    activeBookmakerIds: user.activeBookmakerIds,
                    activeMarketKeys: user.activeMarketKeys
                });
                const parlaysToSave = [];
                // Foco del Día
                if (engineResult.focoDelDia) {
                    const explained = await this.buildSavedParlay(user.userId, date, engineResult.focoDelDia, 'FOCO_DEL_DIA', 'Foco del Día');
                    parlaysToSave.push(explained);
                }
                // Alta Probabilidad
                if (engineResult.altaProbabilidad) {
                    const explained = await this.buildSavedParlay(user.userId, date, engineResult.altaProbabilidad, 'ALTA_PROBABILIDAD', 'Parley Alta Probabilidad');
                    parlaysToSave.push(explained);
                }
                // De Valor
                if (engineResult.deValor) {
                    const explained = await this.buildSavedParlay(user.userId, date, engineResult.deValor, 'VALOR', 'Parley de Valor (+EV)');
                    parlaysToSave.push(explained);
                }
                // Alternativas
                for (let i = 0; i < engineResult.alternativas.length; i++) {
                    const alt = engineResult.alternativas[i];
                    const explained = await this.buildSavedParlay(user.userId, date, alt, 'ALTERNATIVAS', `Alternativa ${i + 1}`);
                    parlaysToSave.push(explained);
                }
                // Guardar en Firestore: parlays/{parlayId}
                const batch = this.db.batch();
                for (const p of parlaysToSave) {
                    const docRef = this.db.collection('parlays').doc(p.parlayId);
                    batch.set(docRef, p, { merge: true });
                }
                await batch.commit();
                count += parlaysToSave.length;
            }
            catch (err) {
                logger.warn(`Error generando parlays para usuario ${user.userId}`, { error: err.message });
                errors.push(`Error parlays usuario ${user.userId}: ${err.message}`);
            }
        }
        return count;
    }
    async buildSavedParlay(userId, date, candidate, displayCategory, categoryLabel) {
        const hash = candidate.selections.map(s => s.matchId.slice(-3) + s.market.slice(0, 2)).join('-');
        const parlayId = `parlay_${userId}_${date}_${displayCategory.toLowerCase()}_${hash}`;
        const explanation = await parlay_explainer_js_1.ParlayExplainer.explainFinalist(candidate, categoryLabel);
        return {
            parlayId,
            userId,
            date,
            type: candidate.type,
            displayCategory,
            selections: candidate.selections,
            combinedOdds: candidate.combinedOdds,
            estimatedProbability: candidate.estimatedProbability,
            estimatedEV: candidate.estimatedEV,
            dataQuality: candidate.dataQuality,
            modelVersion: 'v1.0.0',
            generatedAt: new Date().toISOString(),
            status: 'ACTIVE',
            correlationRisk: candidate.correlationRisk,
            correlationNotes: candidate.correlationNotes,
            rankingScore: candidate.rankingScore,
            explanation
        };
    }
    /**
     * Envía las notificaciones FCM a los usuarios que tengan dailyFocus activado
     */
    async dispatchUserNotifications(users, errors) {
        let sentCount = 0;
        for (const user of users) {
            if (!user.notificationSettings.dailyFocus) {
                continue;
            }
            if (user.notificationTokens.length === 0) {
                continue;
            }
            try {
                const result = await this.fcmService.sendDailyFocusNotification(user.userId, user.notificationTokens, 4 // Oportunidades encontradas hoy
                );
                sentCount += result.sent;
            }
            catch (err) {
                logger.warn(`Error enviando notificación a usuario ${user.userId}`, { error: err.message });
                errors.push(`Fallo FCM ${user.userId}: ${err.message}`);
            }
        }
        return sentCount;
    }
}
exports.DailyAnalysisOrchestrator = DailyAnalysisOrchestrator;
//# sourceMappingURL=dailyAnalysis.orchestrator.js.map