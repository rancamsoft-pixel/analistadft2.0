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

import { getFirestore } from 'firebase-admin/firestore';
import { PredictionEngine, MarketOddsMap } from './prediction.engine.js';
import {
  MatchInputData,
  PredictionResult,
  TeamFormData,
  H2HData,
  InjuryData,
  StandingData,
  SupportedMarket,
  MarketSelection
} from './prediction.interface.js';
import { StructuredLogger } from '../utils/logger.js';
import { MarketOddsContext } from './markets/edge.calculator.js';

const logger = new StructuredLogger('PredictionService');

export class PredictionService {
  private engine: PredictionEngine;
  private db: ReturnType<typeof getFirestore>;

  constructor(engineWeights?: Record<string, number>) {
    this.engine = new PredictionEngine(engineWeights as any);
    this.db = getFirestore();
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
  async predictAndStore(
    input: MatchInputData,
    oddsData?: { market: SupportedMarket; selection: MarketSelection; odds: number; allOdds: number[] }[],
    oddsTimestamp?: string
  ): Promise<PredictionResult[]> {
    logger.info(`Iniciando análisis estadístico para partido ${input.matchId}`);

    // Construir el mapa de cuotas
    const oddsMap: MarketOddsMap | undefined = oddsData
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
  async getStoredAnalyses(matchId: string): Promise<PredictionResult[]> {
    try {
      const snapshot = await this.db
        .collection('analyses')
        .where('matchId', '==', matchId)
        .orderBy('generatedAt', 'desc')
        .limit(100)
        .get();

      return snapshot.docs.map(doc => doc.data() as PredictionResult);
    } catch (error) {
      logger.error(`Error recuperando análisis para ${matchId}`, error as Error);
      return [];
    }
  }

  /**
   * Recupera el análisis más reciente para un partido y mercado específico.
   */
  async getLatestAnalysis(
    matchId: string,
    market: SupportedMarket,
    selection: MarketSelection
  ): Promise<PredictionResult | null> {
    try {
      const snapshot = await this.db
        .collection('analyses')
        .where('matchId', '==', matchId)
        .where('market', '==', market)
        .where('selection', '==', selection)
        .orderBy('generatedAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as PredictionResult;
    } catch (error) {
      logger.error(`Error recuperando análisis reciente para ${matchId}/${market}/${selection}`, error as Error);
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
  static buildTeamFormData(
    results: string, // e.g. "WWDLW" string de la API
    goalsScored: number[],
    goalsConceded: number[],
    venueFilter: 'home' | 'away' | 'all',
    xgScored?: number[],
    xgConceded?: number[],
    shots?: number[]
  ): TeamFormData {
    const resultArray = (results || '')
      .split('')
      .filter(r => ['W', 'D', 'L'].includes(r))
      .map(r => r as 'W' | 'D' | 'L');

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
  static buildH2HData(
    h2h: { totalMatches: number; homeWins: number; awayWins: number; draws: number; recentMatches: any[] }
  ): H2HData {
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
  static buildInjuryData(
    injuries: Array<{ player: { type: string; position?: string }; team: { id: string } }>,
    homeTeamId: string,
    awayTeamId: string
  ): InjuryData {
    const KEY_POSITIONS = ['Goalkeeper', 'Attacker', 'G', 'F'];

    const homeInjuries = injuries.filter(i => i.team.id === homeTeamId);
    const awayInjuries = injuries.filter(i => i.team.id === awayTeamId);

    const isKeyPlayer = (inj: typeof injuries[0]): boolean =>
      KEY_POSITIONS.some(pos =>
        inj.player.type?.toLowerCase().includes(pos.toLowerCase()) ||
        inj.player.position?.toLowerCase().includes(pos.toLowerCase())
      );

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
  static buildStandingData(
    homeTeamId: string,
    awayTeamId: string,
    standings: Array<{ rank: number; team: { id: string }; points: number; goalsDiff: number }>
  ): StandingData | undefined {
    const homeStanding = standings.find(s => s.team.id === homeTeamId);
    const awayStanding = standings.find(s => s.team.id === awayTeamId);

    if (!homeStanding || !awayStanding) return undefined;

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

  private async persistResults(results: PredictionResult[], matchId: string): Promise<void> {
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

  private buildOddsMap(
    oddsData: { market: SupportedMarket; selection: MarketSelection; odds: number; allOdds: number[] }[]
  ): MarketOddsMap {
    const map: MarketOddsMap = new Map<string, MarketOddsContext>();

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
