import { onSchedule } from 'firebase-functions/v2/scheduler';
import { StructuredLogger } from '../utils/logger.js';
import { OddsService } from '../services/odds.service.js';
import { SportsService } from '../services/sports.service.js';

const logger = new StructuredLogger('ScheduledSyncJob');

export const syncOddsJob = onSchedule('every 30 minutes', async (event) => {
  logger.info(`Iniciando sincronización periódica de cuotas y resultados (Execution: ${event.jobName || 'scheduled'})`);

  const oddsService = new OddsService();
  const sportsService = new SportsService();

  try {
    const liveMatches = await sportsService.getLiveMatches();
    logger.info(`Sincronizados ${liveMatches.length} partidos en vivo`);

    const upcomingOdds = await oddsService.getUpcomingOdds('soccer_epl');
    logger.info(`Sincronizadas cuotas para ${upcomingOdds.length} eventos`);
  } catch (error) {
    logger.error('Error durante la sincronización programada', error as Error);
  }
});
