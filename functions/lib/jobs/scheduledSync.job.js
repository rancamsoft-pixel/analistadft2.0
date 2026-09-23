"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncOddsJob = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger_js_1 = require("../utils/logger.js");
const odds_service_js_1 = require("../services/odds.service.js");
const sports_service_js_1 = require("../services/sports.service.js");
const logger = new logger_js_1.StructuredLogger('ScheduledSyncJob');
exports.syncOddsJob = (0, scheduler_1.onSchedule)('every 30 minutes', async (event) => {
    logger.info(`Iniciando sincronización periódica de cuotas y resultados (Execution: ${event.jobName || 'scheduled'})`);
    const oddsService = new odds_service_js_1.OddsService();
    const sportsService = new sports_service_js_1.SportsService();
    try {
        const liveMatches = await sportsService.getLiveMatches();
        logger.info(`Sincronizados ${liveMatches.length} partidos en vivo`);
        const upcomingOdds = await oddsService.getUpcomingOdds('soccer_epl');
        logger.info(`Sincronizadas cuotas para ${upcomingOdds.length} eventos`);
    }
    catch (error) {
        logger.error('Error durante la sincronización programada', error);
    }
});
//# sourceMappingURL=scheduledSync.job.js.map