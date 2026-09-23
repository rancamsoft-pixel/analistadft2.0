/**
 * ResultSettlementJob — Liquidación Automatizada e Inmutable de Resultados
 *
 * Responsabilidades:
 * 1. Consultar partidos finalizados desde SportsService.
 * 2. Comparar el marcador final contra las recomendaciones y pronósticos previos.
 * 3. Actualizar el estado de cada selección y parlay a:
 *    - WON (Acertada)
 *    - LOST (Fallada)
 *    - VOID (Cancelada/Aplazada)
 *    - PENDING (En espera/En juego)
 * 4. Inmutabilidad estricta: Solo el backend con Firebase Admin SDK puede escribir estos resultados.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { StructuredLogger } from '../utils/logger.js';
import { SportsService } from '../services/sports.service.js';

const logger = new StructuredLogger('ResultSettlementJob');

export type SettlementStatus = 'WON' | 'LOST' | 'VOID' | 'PENDING';

export interface MatchOutcomeEvaluation {
  matchId: string;
  status: 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'IN_PLAY' | 'SCHEDULED';
  score?: { home: number; away: number };
}

/**
 * Evalúa si una selección individual resultó ganadora, perdedora o anulada
 */
export function evaluateSelectionOutcome(
  market: string,
  selection: string,
  homeScore: number,
  awayScore: number
): SettlementStatus {
  const totalGoals = homeScore + awayScore;

  switch (market) {
    case '1X2':
      if (selection === 'home') {
        return homeScore > awayScore ? 'WON' : 'LOST';
      }
      if (selection === 'draw') {
        return homeScore === awayScore ? 'WON' : 'LOST';
      }
      if (selection === 'away') {
        return awayScore > homeScore ? 'WON' : 'LOST';
      }
      break;

    case 'double_chance':
      if (selection === 'home_draw') {
        return homeScore >= awayScore ? 'WON' : 'LOST';
      }
      if (selection === 'home_away') {
        return homeScore !== awayScore ? 'WON' : 'LOST';
      }
      if (selection === 'draw_away') {
        return awayScore >= homeScore ? 'WON' : 'LOST';
      }
      break;

    case 'draw_no_bet':
      if (homeScore === awayScore) return 'VOID';
      if (selection === 'home' || selection === 'home_dnb') {
        return homeScore > awayScore ? 'WON' : 'LOST';
      }
      if (selection === 'away' || selection === 'away_dnb') {
        return awayScore > homeScore ? 'WON' : 'LOST';
      }
      break;

    case 'over_0.5':
      return totalGoals > 0.5 ? 'WON' : 'LOST';
    case 'over_1.5':
      return totalGoals > 1.5 ? 'WON' : 'LOST';
    case 'over_2.5':
      return totalGoals > 2.5 ? 'WON' : 'LOST';
    case 'over_3.5':
      return totalGoals > 3.5 ? 'WON' : 'LOST';

    case 'under_2.5':
      return totalGoals < 2.5 ? 'WON' : 'LOST';
    case 'under_3.5':
      return totalGoals < 3.5 ? 'WON' : 'LOST';
    case 'under_4.5':
      return totalGoals < 4.5 ? 'WON' : 'LOST';

    case 'btts':
    case 'both_teams_to_score':
      if (selection === 'yes') {
        return homeScore > 0 && awayScore > 0 ? 'WON' : 'LOST';
      }
      if (selection === 'no') {
        return homeScore === 0 || awayScore === 0 ? 'WON' : 'LOST';
      }
      break;
  }

  return 'PENDING';
}

export class ResultSettlementService {
  private db: ReturnType<typeof getFirestore>;
  private sportsService: SportsService;

  constructor() {
    this.db = getFirestore();
    this.sportsService = new SportsService();
  }

  /**
   * Procesa partidos terminados y liquida los análisis y parlays pendientes en Firestore
   */
  async settlePendingResults(): Promise<{ settledAnalyses: number; settledParlays: number }> {
    logger.info('Iniciando proceso de liquidación de resultados...');

    let settledAnalyses = 0;
    let settledParlays = 0;

    try {
      // 1. Obtener partidos finalizados recientes
      const finishedMatches = await this.sportsService.getResults();
      const matchMap = new Map<string, { homeScore: number; awayScore: number; status: string }>();

      for (const m of finishedMatches) {
        if (m.score.home !== null && m.score.away !== null) {
          matchMap.set(m.id, {
            homeScore: m.score.home,
            awayScore: m.score.away,
            status: m.status
          });
        }
      }

      if (matchMap.size === 0) {
        logger.info('No hay partidos finalizados recientes para liquidar.');
        return { settledAnalyses: 0, settledParlays: 0 };
      }

      // 2. Liquidar documentos en colección 'analyses'
      const analysesSnapshot = await this.db
        .collection('analyses')
        .where('settlement.status', '==', 'PENDING')
        .limit(100)
        .get();

      const batch = this.db.batch();

      for (const doc of analysesSnapshot.docs) {
        const data = doc.data();
        const matchData = matchMap.get(data['matchId']);

        if (matchData) {
          const outcome = evaluateSelectionOutcome(
            data['market'],
            data['selection'],
            matchData.homeScore,
            matchData.awayScore
          );

          batch.update(doc.ref, {
            'settlement.status': outcome,
            'settlement.settledAt': new Date().toISOString(),
            'settlement.actualScore': { home: matchData.homeScore, away: matchData.awayScore }
          });
          settledAnalyses++;
        }
      }

      // 3. Liquidar documentos en colección 'parlays'
      const parlaysSnapshot = await this.db
        .collection('parlays')
        .where('status', 'in', ['ACTIVE', 'PENDING'])
        .limit(50)
        .get();

      for (const doc of parlaysSnapshot.docs) {
        const parlay = doc.data();
        const selections = parlay['selections'] as Array<{
          matchId: string;
          market: string;
          selection: string;
          status?: SettlementStatus;
        }>;

        let allFinished = true;
        let anyLost = false;
        let anyVoid = false;

        for (const sel of selections) {
          const matchData = matchMap.get(sel.matchId);
          if (!matchData) {
            allFinished = false;
            break;
          }

          const legOutcome = evaluateSelectionOutcome(
            sel.market,
            sel.selection,
            matchData.homeScore,
            matchData.awayScore
          );

          sel.status = legOutcome;

          if (legOutcome === 'LOST') anyLost = true;
          if (legOutcome === 'VOID') anyVoid = true;
          if (legOutcome === 'PENDING') allFinished = false;
        }

        if (allFinished) {
          let parlayStatus: SettlementStatus = 'WON';
          if (anyLost) parlayStatus = 'LOST';
          else if (anyVoid) parlayStatus = 'VOID';

          batch.update(doc.ref, {
            status: parlayStatus,
            selections,
            settledAt: new Date().toISOString()
          });
          settledParlays++;
        }
      }

      if (settledAnalyses > 0 || settledParlays > 0) {
        await batch.commit();
        logger.info(`Liquidación completada: ${settledAnalyses} análisis y ${settledParlays} parlays actualizados.`);
      }
    } catch (error) {
      logger.error('Error durante la liquidación de resultados', error as Error);
    }

    return { settledAnalyses, settledParlays };
  }
}

/**
 * Scheduled job que corre cada 15 minutos para liquidar resultados de partidos terminados
 */
export const resultSettlementJob = onSchedule('every 15 minutes', async () => {
  const service = new ResultSettlementService();
  await service.settlePendingResults();
});

/**
 * Endpoint HTTPS administrativo para disparar liquidación inmediata
 */
export const triggerResultSettlementNow = onRequest({ cors: true }, async (_req, res) => {
  try {
    const service = new ResultSettlementService();
    const result = await service.settlePendingResults();
    res.json({
      success: true,
      message: 'Liquidación de resultados ejecutada correctamente.',
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
