/**
 * ParlayService — Orquestador del Motor de Parlays y Persistencia.
 *
 * Flujo:
 * 1. Cargar preferencias del usuario (ligas y casas activas).
 * 2. Cargar oportunidades analizadas previamente por el motor estadístico.
 * 3. Ejecutar ParlayEngine (filtros, combinatoria, correlación, ranking).
 * 4. Explicar finalistas con Gemini (o fallback mock).
 * 5. Persistir en Firestore: parlays/{parlayId}.
 * 6. Recuperar parlays del usuario.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { ParlayEngine } from './parlay.engine.js';
import { ParlayExplainer } from './parlay.explainer.js';
import {
  SavedParlay,
  ParlaySelection,
  UserPreferencesContext,
  ParlayCandidate,
  ParlayDisplayCategory
} from './parlay.interface.js';
import { PredictionResult } from '../prediction/prediction.interface.js';
import { StructuredLogger } from '../utils/logger.js';
import { getColombiaTodayString } from '../utils/colombiaDate.js';

const logger = new StructuredLogger('ParlayService');

export class ParlayService {
  private db: ReturnType<typeof getFirestore>;

  constructor() {
    this.db = getFirestore();
  }

  /**
   * Genera, explica y persiste las combinadas personalizadas para un usuario
   */
  async generateAndStoreUserParlays(
    userId: string,
    forcedDate?: string
  ): Promise<SavedParlay[]> {
    logger.info(`Generando parlays personalizados para usuario ${userId}`);
    const date = forcedDate || getColombiaTodayString();

    // 1. Obtener preferencias del usuario
    const userPrefs = await this.getUserPreferences(userId);

    // 2. Obtener oportunidades válidas del motor estadístico
    const selections = await this.getAvailableSelections(userPrefs);

    if (selections.length < 2) {
      logger.info(`Insuficientes selecciones (${selections.length}) para generar parlays de ${userId}`);
      return [];
    }

    // 3. Ejecutar el motor de combinaciones y ranking
    const engineResult = ParlayEngine.generateForUser(selections, userPrefs);

    // 4. Transformar y explicar los finalistas seleccionados
    const savedParlays: SavedParlay[] = [];

    // Foco del Día
    if (engineResult.focoDelDia) {
      const explained = await this.buildSavedParlay(
        userId,
        date,
        engineResult.focoDelDia,
        'FOCO_DEL_DIA',
        'Foco del Día'
      );
      savedParlays.push(explained);
    }

    // Alta Probabilidad
    if (engineResult.altaProbabilidad) {
      const explained = await this.buildSavedParlay(
        userId,
        date,
        engineResult.altaProbabilidad,
        'ALTA_PROBABILIDAD',
        'Parley Alta Probabilidad'
      );
      savedParlays.push(explained);
    }

    // De Valor
    if (engineResult.deValor) {
      const explained = await this.buildSavedParlay(
        userId,
        date,
        engineResult.deValor,
        'VALOR',
        'Parley de Valor (+EV)'
      );
      savedParlays.push(explained);
    }

    // Alternativas
    for (let i = 0; i < engineResult.alternativas.length; i++) {
      const alt = engineResult.alternativas[i]!;
      const explained = await this.buildSavedParlay(
        userId,
        date,
        alt,
        'ALTERNATIVAS',
        `Alternativa ${i + 1}`
      );
      savedParlays.push(explained);
    }

    // 5. Persistir en Firestore (parlays/{parlayId})
    await this.persistParlays(savedParlays);

    logger.info(`Persistidos ${savedParlays.length} parlays personalizados para ${userId}`);
    return savedParlays;
  }

  /**
   * Recupera los parlays guardados de un usuario para una fecha determinada
   */
  async getUserStoredParlays(userId: string, date?: string): Promise<SavedParlay[]> {
    try {
      const targetDate = date || getColombiaTodayString();
      const snapshot = await this.db
        .collection('parlays')
        .where('userId', '==', userId)
        .where('date', '==', targetDate)
        .get();

      if (snapshot.empty) {
        // Si no hay parlays generados hoy, intentar recuperar los más recientes del usuario
        const recentSnap = await this.db
          .collection('parlays')
          .where('userId', '==', userId)
          .orderBy('generatedAt', 'desc')
          .limit(10)
          .get();

        return recentSnap.docs.map(doc => doc.data() as SavedParlay);
      }

      return snapshot.docs.map(doc => doc.data() as SavedParlay);
    } catch (error) {
      logger.error(`Error recuperando parlays guardados para ${userId}`, error as Error);
      return [];
    }
  }

  /**
   * Obtiene las preferencias del usuario desde Firestore o defaults
   */
  async getUserPreferences(userId: string): Promise<UserPreferencesContext> {
    try {
      const prefDoc = await this.db
        .collection('users')
        .doc(userId)
        .collection('settings')
        .doc('preferences')
        .get();

      if (prefDoc.exists) {
        const data = prefDoc.data() || {};
        return {
          userId,
          activeCompetitionIds: data['activeCompetitionIds'] || ['PL', 'PD'],
          activeBookmakerIds: data['activeBookmakerIds'] || ['pinnacle', 'bet365'],
          activeMarketKeys: data['activeMarketKeys'] || ['1X2', 'over_under', 'btts'],
          oddsFormat: data['oddsFormat'] || 'decimal'
        };
      }
    } catch (err) {
      logger.warn(`No se pudieron cargar preferencias de ${userId}, usando valores predeterminados`, {
        error: (err as Error).message
      });
    }

    return {
      userId,
      activeCompetitionIds: ['PL', 'PD'],
      activeBookmakerIds: ['pinnacle', 'bet365'],
      activeMarketKeys: ['1X2', 'over_under', 'btts'],
      oddsFormat: 'decimal'
    };
  }

  /**
   * Obtiene las selecciones disponibles consultando `analyses` o generando fixtures
   */
  private async getAvailableSelections(userPrefs: UserPreferencesContext): Promise<ParlaySelection[]> {
    try {
      // Consultar análisis recientes no descartados
      const analysesSnap = await this.db
        .collection('analyses')
        .orderBy('generatedAt', 'desc')
        .limit(150)
        .get();

      if (!analysesSnap.empty) {
        const results = analysesSnap.docs
          .map(d => d.data() as PredictionResult)
          .filter(r => !r.discardReason && r.marketOdds && r.marketOdds > 1.05);

        if (results.length >= 2) {
          return results.map(r => this.mapPredictionToSelection(r));
        }
      }
    } catch (err) {
      logger.warn('Error leyendo análisis de Firestore, generando datos contextuales', {
        error: (err as Error).message
      });
    }

    // Fallback cuando la colección está vacía o en modo mock
    return this.generateFallbackSelections(userPrefs);
  }

  private mapPredictionToSelection(pred: PredictionResult): ParlaySelection {
    const marketTitles: Record<string, string> = {
      '1X2': 'Resultado Final',
      'over_2.5': 'Más de 2.5 Goles',
      'under_2.5': 'Menos de 2.5 Goles',
      'btts': 'Ambos Equipos Anotan',
      'double_chance': 'Doble Oportunidad',
      'draw_no_bet': 'Empate Apuesta No Válida'
    };

    const selName = `${marketTitles[pred.market] || pred.market}: ${pred.selection}`;
    const homeTeam = pred.inputSnapshot?.homeTeamName || 'Local';
    const awayTeam = pred.inputSnapshot?.awayTeamName || 'Visitante';

    return {
      matchId: pred.matchId,
      matchDescription: `${homeTeam} vs ${awayTeam}`,
      competitionId: pred.inputSnapshot?.competitionId || 'PL',
      competitionName: 'Liga',
      utcDate: pred.inputSnapshot?.utcDate || new Date().toISOString(),
      market: pred.market,
      selection: pred.selection,
      selectionName: selName,
      probability: pred.probability,
      odds: pred.marketOdds || Number((1 / pred.probability).toFixed(2)),
      bookmaker: 'Pinnacle',
      bookmakerId: 'pinnacle',
      edge: pred.edge,
      expectedValue: pred.expectedValue,
      dataQuality: pred.dataQuality
    };
  }

  private async buildSavedParlay(
    userId: string,
    date: string,
    candidate: ParlayCandidate,
    displayCategory: ParlayDisplayCategory,
    categoryLabel: string
  ): Promise<SavedParlay> {
    const hash = candidate.selections
      .map(s => s.matchId.slice(-3) + s.market.slice(0, 2))
      .join('-');
    const parlayId = `parlay_${userId}_${date}_${displayCategory.toLowerCase()}_${hash}`;

    const explanation = await ParlayExplainer.explainFinalist(candidate, categoryLabel);

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

  private async persistParlays(parlays: SavedParlay[]): Promise<void> {
    if (parlays.length === 0) return;

    const batch = this.db.batch();
    for (const parlay of parlays) {
      const docRef = this.db.collection('parlays').doc(parlay.parlayId);
      batch.set(docRef, parlay, { merge: true });
    }

    await batch.commit();
  }

  /**
   * Generador de selecciones de ejemplo ligadas a las ligas y casas configuradas del usuario
   */
  private generateFallbackSelections(userPrefs: UserPreferencesContext): ParlaySelection[] {
    const compA = userPrefs.activeCompetitionIds[0] || 'PL';
    const compB = userPrefs.activeCompetitionIds[1] || 'PD';
    const bookmaker = userPrefs.activeBookmakerIds[0] || 'pinnacle';

    const isBetPlay = compA.includes('CO') || compA.includes('BETPLAY') || compB.includes('BETPLAY');

    if (isBetPlay) {
      return [
        {
          matchId: 'm-col-1',
          matchDescription: 'Millonarios vs Santa Fe',
          competitionId: compA,
          competitionName: 'Liga BetPlay',
          utcDate: new Date().toISOString(),
          market: '1X2',
          selection: 'home',
          selectionName: 'Millonarios (Gana)',
          probability: 0.58,
          odds: 1.85,
          bookmaker: 'BetPlay',
          bookmakerId: 'betplay',
          edge: 0.04,
          expectedValue: 7.3,
          dataQuality: 'HIGH'
        },
        {
          matchId: 'm-col-1',
          matchDescription: 'Millonarios vs Santa Fe',
          competitionId: compA,
          competitionName: 'Liga BetPlay',
          utcDate: new Date().toISOString(),
          market: 'under_2.5',
          selection: 'under',
          selectionName: 'Menos de 2.5 Goles',
          probability: 0.62,
          odds: 1.68,
          bookmaker: 'BetPlay',
          bookmakerId: 'betplay',
          edge: 0.03,
          expectedValue: 4.16,
          dataQuality: 'HIGH'
        },
        {
          matchId: 'm-col-2',
          matchDescription: 'Atlético Nacional vs Junior',
          competitionId: compA,
          competitionName: 'Liga BetPlay',
          utcDate: new Date().toISOString(),
          market: '1X2',
          selection: 'home',
          selectionName: 'Atlético Nacional (Gana)',
          probability: 0.55,
          odds: 1.95,
          bookmaker: 'BetPlay',
          bookmakerId: 'betplay',
          edge: 0.035,
          expectedValue: 7.25,
          dataQuality: 'MEDIUM'
        },
        {
          matchId: 'm-col-3',
          matchDescription: 'América de Cali vs Deportivo Cali',
          competitionId: compA,
          competitionName: 'Liga BetPlay',
          utcDate: new Date().toISOString(),
          market: 'double_chance',
          selection: 'home_draw',
          selectionName: 'América o Empate (1X)',
          probability: 0.72,
          odds: 1.42,
          bookmaker: 'BetPlay',
          bookmakerId: 'betplay',
          edge: 0.02,
          expectedValue: 2.24,
          dataQuality: 'HIGH'
        }
      ];
    }

    // Default: Premier League / La Liga
    return [
      {
        matchId: 'm-epl-1',
        matchDescription: 'Arsenal FC vs Chelsea FC',
        competitionId: 'PL',
        competitionName: 'Premier League',
        utcDate: new Date().toISOString(),
        market: '1X2',
        selection: 'home',
        selectionName: 'Arsenal FC (Gana)',
        probability: 0.60,
        odds: 1.80,
        bookmaker: 'Pinnacle',
        bookmakerId: bookmaker,
        edge: 0.045,
        expectedValue: 8.0,
        dataQuality: 'VERY_HIGH'
      },
      {
        matchId: 'm-epl-1',
        matchDescription: 'Arsenal FC vs Chelsea FC',
        competitionId: 'PL',
        competitionName: 'Premier League',
        utcDate: new Date().toISOString(),
        market: 'over_2.5',
        selection: 'over',
        selectionName: 'Más de 2.5 Goles',
        probability: 0.64,
        odds: 1.72,
        bookmaker: 'Bet365',
        bookmakerId: bookmaker,
        edge: 0.058,
        expectedValue: 10.08,
        dataQuality: 'HIGH'
      },
      {
        matchId: 'm-epl-2',
        matchDescription: 'Manchester City vs Liverpool FC',
        competitionId: 'PL',
        competitionName: 'Premier League',
        utcDate: new Date().toISOString(),
        market: 'btts',
        selection: 'yes',
        selectionName: 'Ambos Equipos Anotan (Sí)',
        probability: 0.68,
        odds: 1.62,
        bookmaker: 'Bet365',
        bookmakerId: bookmaker,
        edge: 0.062,
        expectedValue: 10.16,
        dataQuality: 'HIGH'
      },
      {
        matchId: 'm-pd-1',
        matchDescription: 'Real Madrid vs FC Barcelona',
        competitionId: 'PD',
        competitionName: 'La Liga',
        utcDate: new Date().toISOString(),
        market: 'over_2.5',
        selection: 'over',
        selectionName: 'Más de 2.5 Goles',
        probability: 0.65,
        odds: 1.68,
        bookmaker: 'Pinnacle',
        bookmakerId: bookmaker,
        edge: 0.055,
        expectedValue: 9.2,
        dataQuality: 'HIGH'
      },
      {
        matchId: 'm-pd-2',
        matchDescription: 'Atlético de Madrid vs Sevilla FC',
        competitionId: 'PD',
        competitionName: 'La Liga',
        utcDate: new Date().toISOString(),
        market: '1X2',
        selection: 'home',
        selectionName: 'Atlético de Madrid (Gana)',
        probability: 0.58,
        odds: 1.85,
        bookmaker: 'Pinnacle',
        bookmakerId: bookmaker,
        edge: 0.038,
        expectedValue: 7.3,
        dataQuality: 'HIGH'
      }
    ];
  }
}
