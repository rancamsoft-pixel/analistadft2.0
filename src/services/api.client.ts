import { env } from '../lib/env';
import {
  Competition,
  EventOdds,
  MatchAnalysisResult,
  ParlayCalculationResult,
  ParlayLeg,
  SportMatch,
  SportMatchDetails,
  MatchOddsComparison,
  OddsUsageStats,
  CanonicalMarket,
  CanonicalSelection,
  BookmakerComparisonRow,
  SavedParlay
} from '../types/domain';
import {
  CLIENT_MOCK_COMPETITIONS,
  CLIENT_MOCK_MATCHES,
  CLIENT_MOCK_ODDS,
  CLIENT_MOCK_ANALYSIS
} from './mock/fixtures';
import { ParlayCalculator } from '../utils/parlayCalculator';

export class ApiClient {
  private static async mockDelay(ms: number = 180): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async getCompetitions(): Promise<Competition[]> {
    if (env.useMockData) {
      await this.mockDelay();
      return CLIENT_MOCK_COMPETITIONS;
    }

    const res = await fetch(`${env.apiBaseUrl}/getMatches?type=competitions`);
    const data = await res.json() as { success: boolean; data: Competition[] };
    return data.data;
  }

  static async getMatches(type: 'all' | 'live' | 'upcoming' = 'all', competitionId?: string): Promise<SportMatch[]> {
    if (env.useMockData) {
      await this.mockDelay();
      let list = CLIENT_MOCK_MATCHES;
      if (type === 'live') {
        list = list.filter(m => m.status === 'LIVE');
      } else if (type === 'upcoming') {
        list = list.filter(m => m.status === 'SCHEDULED');
      }
      if (competitionId) {
        list = list.filter(m => m.competition.id === competitionId);
      }
      return list;
    }

    const compParam = competitionId ? `&competition=${competitionId}` : '';
    const res = await fetch(`${env.apiBaseUrl}/getMatches?type=${type}${compParam}`);
    const data = await res.json() as { success: boolean; data: SportMatch[] };
    return data.data;
  }

  static async getMatchDetails(matchId: string): Promise<SportMatchDetails> {
    if (env.useMockData) {
      await this.mockDelay();
      const found = CLIENT_MOCK_MATCHES.find(m => m.id === matchId)
        || (matchId.includes('col-2') || matchId.includes('nacional') || matchId.includes('millonarios') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-col-2') : null)
        || (matchId.includes('col-1') || matchId.includes('junior') || matchId.includes('santa-fe') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-col-1') : null)
        || (matchId.includes('col-3') || matchId.includes('america') || matchId.includes('cali') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-col-3') : null)
        || (matchId.includes('col-4') || matchId.includes('medellin') || matchId.includes('once') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-col-4') : null)
        || (matchId.includes('col-5') || matchId.includes('tolima') || matchId.includes('bucaramanga') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-col-5') : null)
        || (matchId.includes('pd') || matchId.includes('madrid') || matchId.includes('barca') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-102') : null)
        || (matchId.includes('city') || matchId.includes('liverpool') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-103') : null)
        || CLIENT_MOCK_MATCHES[0]!;
      return found!;
    }

    const res = await fetch(`${env.apiBaseUrl}/getMatches?type=details&id=${matchId}`);
    const data = await res.json() as { success: boolean; data: SportMatchDetails };
    return data.data;
  }

  static async getMatchOdds(eventId: string, sportKey: string = 'soccer_epl'): Promise<EventOdds> {
    if (env.useMockData) {
      await this.mockDelay();
      const found = CLIENT_MOCK_ODDS[eventId];
      if (found) return found;

      // Fallback genérico para modo mock
      return {
        id: eventId,
        sportKey,
        sportTitle: 'Competición Simulada',
        commenceTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
        homeTeam: 'Equipo A',
        awayTeam: 'Equipo B',
        isMock: true,
        bestOdds: {
          home: { price: 1.95, bookmaker: 'Pinnacle' },
          draw: { price: 3.45, bookmaker: 'Bet365' },
          away: { price: 3.80, bookmaker: 'Betfair' },
          payoutMargin: 96.0
        },
        bookmakers: [
          {
            key: 'pinnacle',
            title: 'Pinnacle',
            lastUpdate: new Date().toISOString(),
            markets: [
              {
                key: 'h2h',
                lastUpdate: new Date().toISOString(),
                outcomes: [
                  { name: 'Equipo A', price: 1.95 },
                  { name: 'Empate', price: 3.40 },
                  { name: 'Equipo B', price: 3.75 }
                ]
              }
            ]
          }
        ]
      };
    }

    const res = await fetch(`${env.apiBaseUrl}/getMatchOdds?eventId=${eventId}&sportKey=${sportKey}`);
    const data = await res.json() as { success: boolean; data: EventOdds };
    return data.data;
  }

  static async getMatchAnalysis(matchId: string, sportKey: string = 'soccer_epl'): Promise<MatchAnalysisResult> {
    if (env.useMockData) {
      await this.mockDelay(300);
      const found = CLIENT_MOCK_ANALYSIS[matchId];
      if (found) return found;

      // Generar análisis dinámico simulado
      return {
        matchId,
        summary: `Análisis predictivo de valor para el partido ${matchId}. Las métricas xG y posesión proyectan una ventaja ligera local.`,
        keyTacticalInsights: [
          'Mayor presión en el último tercio de cancha con un 4.2 de recuperaciones altas.',
          'El rival concede más ocasiones en segundas partes (min 60-90).'
        ],
        projectedScore: { home: 1, away: 0 },
        winProbabilities: { home: 52.0, draw: 28.0, away: 20.0 },
        valueBets: [
          {
            selection: 'Equipo Local',
            market: '1X2',
            currentOdds: 1.95,
            estimatedProbability: 0.54,
            impliedProbability: 0.51,
            expectedValuePercentage: 5.3,
            isValueBet: true,
            confidenceScore: 76,
            recommendation: 'STRONG_VALUE'
          }
        ],
        riskFactor: 'MEDIUM',
        disclaimer: 'Análisis generado en Modo Mock de desarrollo.',
        provider: 'MockAIProvider',
        isMock: true,
        generatedAt: new Date().toISOString()
      };
    }

    const res = await fetch(`${env.apiBaseUrl}/getMatchAnalysis?matchId=${matchId}&sportKey=${sportKey}`);
    const data = await res.json() as { success: boolean; data: { analysis: MatchAnalysisResult } };
    return data.data.analysis;
  }

  static async calculateParlay(legs: ParlayLeg[], stake: number = 10): Promise<ParlayCalculationResult> {
    if (env.useMockData || !env.apiBaseUrl) {
      await this.mockDelay(80);
      return ParlayCalculator.calculate(legs, stake);
    }

    const res = await fetch(`${env.apiBaseUrl}/calculateParlay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legs, stake })
    });
    const data = await res.json() as { success: boolean; data: ParlayCalculationResult };
    return data.data;
  }

  static async syncSportsData(): Promise<{ success: boolean; message: string; matchesProcessed: number; stats?: any }> {
    if (env.useMockData || !env.apiBaseUrl) {
      await this.mockDelay(800);
      return {
        success: true,
        message: 'Sincronización simulada en Modo Mock completada.',
        matchesProcessed: 8,
        stats: {
          today: new Date().toISOString().split('T')[0],
          limit: 80,
          used: 12,
          remaining: 68,
          isWarning: false,
          isExhausted: false,
          recordsCount: 12
        }
      };
    }

    const res = await fetch(`${env.apiBaseUrl}/syncSportsData`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json() as { success: boolean; message: string; matchesProcessed: number; stats?: any; error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'Error al ejecutar sincronización deportiva');
    }
    return data;
  }

  static async getProviderUsage(): Promise<{ success: boolean; stats: { today: string; limit: number; used: number; remaining: number; isWarning: boolean; isExhausted: boolean; recordsCount: number } }> {
    if (env.useMockData || !env.apiBaseUrl) {
      await this.mockDelay(150);
      return {
        success: true,
        stats: {
          today: new Date().toISOString().split('T')[0] || '2026-09-22',
          limit: 80,
          used: 12,
          remaining: 68,
          isWarning: false,
          isExhausted: false,
          recordsCount: 12
        }
      };
    }

    const res = await fetch(`${env.apiBaseUrl}/getProviderUsage`);
    const data = await res.json() as { success: boolean; stats: any };
    return data;
  }

  static async getMatchOddsComparison(
    eventId: string,
    sportKey: string = 'soccer_epl',
    requestedBookmakers?: string[]
  ): Promise<MatchOddsComparison> {
    if (env.useMockData || !env.apiBaseUrl) {
      await this.mockDelay(180);
      const targetBks = requestedBookmakers && requestedBookmakers.length > 0
        ? requestedBookmakers
        : ['betplay', 'wplay', 'rushbet', 'codere_co', 'pinnacle', 'bet365'];

      // Encontrar información real del partido para no devolver siempre Arsenal vs Chelsea
      const match = CLIENT_MOCK_MATCHES.find(m => m.id === eventId)
        || (eventId.includes('col-2') || eventId.includes('nacional') || eventId.includes('millonarios') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-col-2') : null)
        || (eventId.includes('col-3') || eventId.includes('america') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-col-3') : null)
        || (eventId.includes('col-1') || eventId.includes('junior') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-col-1') : null)
        || (eventId.includes('102') || eventId.includes('madrid') ? CLIENT_MOCK_MATCHES.find(m => m.id === 'match-102') : null)
        || CLIENT_MOCK_MATCHES[0]!;

      const existingOdds = CLIENT_MOCK_ODDS[eventId] || CLIENT_MOCK_ODDS[match.id];

      const getBookmakerDisplayName = (id: string): string => {
        switch (id.toLowerCase()) {
          case 'betplay': return 'BetPlay (Coljuegos)';
          case 'wplay': return 'Wplay.co (Coljuegos)';
          case 'rushbet': return 'Rushbet (Coljuegos)';
          case 'codere_co': return 'Codere Colombia';
          case 'yajuego': return 'YaJuego (Coljuegos)';
          case 'rivalo': return 'Rivalo Colombia';
          case 'pinnacle': return 'Pinnacle (+EV Sharp)';
          case 'bet365': return 'Bet365 (Global)';
          case 'betfair': return 'Betfair (Exchange)';
          case '1xbet': return '1xBet';
          default: return id.toUpperCase();
        }
      };

      const makeRows = (basePrice: number, marketKey: string, outcomeIndex: number = 0): BookmakerComparisonRow[] => {
        return targetBks.map((id, idx) => {
          // Intentar extraer cuota exacta si el mockOdds la tiene definida
          let customPrice: number | undefined;
          if (existingOdds && existingOdds.bookmakers) {
            const bk = existingOdds.bookmakers.find(b => b.key.toLowerCase() === id.toLowerCase() || b.title.toLowerCase().includes(id.toLowerCase()));
            if (bk && bk.markets) {
              const mkt = bk.markets.find(m => (marketKey === '1X2' && (m.key === 'h2h' || (m.key as string) === '1X2')) || (marketKey.includes('over_under') && (m.key === 'totals' || (m.key as string) === 'over_under')));
              if (mkt && mkt.outcomes && mkt.outcomes[outcomeIndex]) {
                customPrice = mkt.outcomes[outcomeIndex]?.price;
              }
            }
          }

          // Variación realista por casa de apuestas si no viene en el mock
          const variance = [0.03, -0.02, 0.05, -0.04, 0.02, -0.03][idx % 6]!;
          const finalPrice = customPrice ?? Number(Math.max(1.05, basePrice + variance).toFixed(2));

          return {
            bookmakerId: id,
            bookmakerName: getBookmakerDisplayName(id),
            isAvailable: true,
            price: finalPrice,
            lastUpdate: new Date().toISOString()
          };
        });
      };

      const computeSel = (market: CanonicalMarket, selection: CanonicalSelection, basePrice: number, outcomeIdx: number = 0, line?: number) => {
        const rows = makeRows(basePrice, market, outcomeIdx);
        const valid = rows.filter(r => r.isAvailable && typeof r.price === 'number');
        const prices = valid.map(r => r.price as number);
        const max = prices.length > 0 ? Math.max(...prices) : 0;
        const min = prices.length > 0 ? Math.min(...prices) : 0;
        const best = valid.find(r => r.price === max);
        const worst = valid.find(r => r.price === min);
        for (const r of rows) {
          if (r.price === max) r.isBest = true;
          if (r.price === min) r.isWorst = true;
        }
        const sorted = [...prices].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length === 0 ? 0 : sorted.length % 2 !== 0 ? sorted[mid]! : Number(((sorted[mid - 1]! + sorted[mid]!) / 2).toFixed(2));

        return {
          market,
          selection,
          line,
          bestOdds: best ? { price: max, bookmakerId: best.bookmakerId, bookmakerName: best.bookmakerName } : null,
          worstOdds: worst ? { price: min, bookmakerId: worst.bookmakerId, bookmakerName: worst.bookmakerName } : null,
          averageOdds: prices.length > 0 ? Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)) : 0,
          medianOdds: median,
          bookmakerCount: prices.length,
          rows
        };
      };

      return {
        matchId: eventId,
        sportKey: match.competition?.code || sportKey,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        commenceTime: match.utcDate,
        fetchedAt: new Date().toISOString(),
        isStale: false,
        provider: 'MockOddsProvider',
        selections: {
          '1X2_home': computeSel('1X2', 'home', eventId.includes('col-2') ? 2.05 : 1.82, 0),
          '1X2_draw': computeSel('1X2', 'draw', eventId.includes('col-2') ? 3.35 : 3.80, 1),
          '1X2_away': computeSel('1X2', 'away', eventId.includes('col-2') ? 3.75 : 4.50, 2),
          'over_under_over_2.5': computeSel('over_under', 'over', 1.85, 0, 2.5),
          'over_under_under_2.5': computeSel('over_under', 'under', 1.95, 1, 2.5),
          'btts_yes': computeSel('btts', 'yes', 1.75, 0),
          'btts_no': computeSel('btts', 'no', 2.05, 1)
        },
        activeBookmakersEvaluated: targetBks
      };
    }

    const bksParam = requestedBookmakers ? `&bookmakers=${requestedBookmakers.join(',')}` : '';
    const res = await fetch(`${env.apiBaseUrl}/getMatchOddsComparison?eventId=${eventId}&sportKey=${sportKey}${bksParam}`);
    const data = await res.json() as { success: boolean; data: MatchOddsComparison };
    return data.data;
  }

  static async getOddsUsage(): Promise<{ success: boolean; data: OddsUsageStats }> {
    if (env.useMockData || !env.apiBaseUrl) {
      await this.mockDelay(150);
      return {
        success: true,
        data: {
          provider: 'the-odds-api',
          monthlyLimit: 500,
          creditsUsed: 122,
          creditsRemaining: 378,
          lastQuery: new Date().toISOString(),
          lastError: null,
          status: 'OK',
          warningAlert: false,
          estimatedCostPerQuery: 1,
          lastUpdated: new Date().toISOString()
        }
      };
    }

    const res = await fetch(`${env.apiBaseUrl}/getOddsUsage`);
    const data = await res.json() as { success: boolean; data: OddsUsageStats };
    return data;
  }


  static async triggerDailyAnalysisNow(userId?: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (env.useMockData || !env.apiBaseUrl) {
      await this.mockDelay(600);
      return {
        success: true,
        message: 'Análisis diario ejecutado exitosamente (Simulación).',
        data: { matchesProcessed: 14, parlaysGenerated: 3, notificationsSent: 1 }
      };
    }

    const res = await fetch(`${env.apiBaseUrl}/triggerDailyAnalysisNow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, force: true })
    });
    return res.json();
  }

  static async getUserParlays(userId: string, date?: string): Promise<SavedParlay[]> {
    if (env.useMockData || !env.apiBaseUrl) {
      await this.mockDelay(200);
      return this.getMockUserParlays(userId, date);
    }

    try {
      const dateParam = date ? `&date=${date}` : '';
      const res = await fetch(`${env.apiBaseUrl}/getUserParlays?userId=${userId}${dateParam}`);
      if (!res.ok) throw new Error('Error al obtener parlays');
      const json = await res.json() as { success: boolean; data: SavedParlay[] };
      return json.data || [];
    } catch (e) {
      console.warn('Fallback a parlays mock:', e);
      return this.getMockUserParlays(userId, date);
    }
  }

  static async generateUserParlays(userId: string, date?: string): Promise<SavedParlay[]> {
    if (env.useMockData || !env.apiBaseUrl) {
      await this.mockDelay(400);
      return this.getMockUserParlays(userId, date);
    }

    try {
      const res = await fetch(`${env.apiBaseUrl}/generateUserParlays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date })
      });
      if (!res.ok) throw new Error('Error al generar parlays');
      const json = await res.json() as { success: boolean; data: SavedParlay[] };
      return json.data || [];
    } catch (e) {
      console.warn('Fallback a generación mock de parlays:', e);
      return this.getMockUserParlays(userId, date);
    }
  }

  private static getMockUserParlays(userId: string, date?: string): SavedParlay[] {
    const today = date || new Date().toISOString().split('T')[0]!;
    const now = Date.now();

    // Tiempos dinámicos para que los eventos estén abiertos y con fechas escalonadas
    const timeTodaySoon = new Date(now + 1000 * 60 * 150).toISOString(); // en 2.5h (Hoy)
    const timeTodayEvening = new Date(now + 1000 * 60 * 360).toISOString(); // en 6h (Hoy)
    const timeTomorrow = new Date(now + 1000 * 60 * 60 * 28).toISOString(); // en 28h (Mañana)
    const timeDayAfter = new Date(now + 1000 * 60 * 60 * 52).toISOString(); // en 52h (Fin de semana)

    // Leer preferencias locales si existen para simular personalización por usuario
    let activeComps = ['PL', 'PD'];
    try {
      const saved = localStorage.getItem(`bet_prefs_${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeCompetitionIds && parsed.activeCompetitionIds.length > 0) {
          activeComps = parsed.activeCompetitionIds;
        }
      }
    } catch {
      // fallback
    }

    const isBetPlay = activeComps.some(c => c.toLowerCase().includes('betplay') || c.toLowerCase().includes('co'));

    if (isBetPlay) {
      return [
        {
          parlayId: `parlay_${userId}_${today}_foco_col`,
          userId,
          date: today,
          type: 'BALANCED_PARLAY',
          displayCategory: 'FOCO_DEL_DIA',
          selections: [
            {
              matchId: 'match-col-2',
              matchDescription: 'Atlético Nacional vs Millonarios FC',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeTodaySoon,
              market: '1X2',
              selection: 'home',
              selectionName: 'Atlético Nacional (Gana)',
              probability: 0.55,
              odds: 2.05,
              bookmaker: 'BetPlay',
              bookmakerId: 'betplay',
              edge: 0.048,
              expectedValue: 8.2,
              dataQuality: 'HIGH'
            },
            {
              matchId: 'match-col-3',
              matchDescription: 'América de Cali vs Deportivo Cali',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeTodayEvening,
              market: '1X2',
              selection: 'home',
              selectionName: 'América de Cali (Gana)',
              probability: 0.53,
              odds: 1.95,
              bookmaker: 'Wplay',
              bookmakerId: 'wplay',
              edge: 0.038,
              expectedValue: 7.15,
              dataQuality: 'HIGH'
            }
          ],
          combinedOdds: 3.997,
          estimatedProbability: 0.291,
          estimatedEV: 16.3,
          dataQuality: 'HIGH',
          modelVersion: 'v1.0.0',
          generatedAt: new Date().toISOString(),
          status: 'ACTIVE',
          correlationRisk: 'NONE',
          correlationNotes: [],
          rankingScore: 45.5,
          explanation: {
            summary: 'Foco del Día (Liga BetPlay): Superclásico Atlético Nacional vs Millonarios FC respaldado por ventaja en Atanasio Girardot.',
            justification: 'Nacional y América presentan ventajas marcadas de xG (1.84 vs 1.05) y consistencia en sus respectivos clásicos ante Millonarios y Deportivo Cali.',
            keyFactors: [
              'Atlético Nacional con 5.8 tiros a puerta por partido como local en Medellín',
              'Cuota 2.05 en BetPlay con valor esperado (+EV) positivo de 8.2%'
            ],
            riskFactors: [
              'Intensidad y fricción táctica propia de un superclásico con marcador ajustado'
            ],
            provider: 'mock',
            generatedAt: new Date().toISOString()
          }
        },
        // 🐢 PARLEY PACIENCIA (Multi-fecha y Máxima Seguridad)
        {
          parlayId: `parlay_${userId}_${today}_paciencia_col`,
          userId,
          date: today,
          type: 'PACIENCIA_PARLAY',
          displayCategory: 'PACIENCIA',
          selections: [
            {
              matchId: 'match-col-3',
              matchDescription: 'América de Cali vs Deportivo Cali',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeTodaySoon,
              market: 'double_chance',
              selection: 'home_draw',
              selectionName: 'América de Cali o Empate (1X)',
              probability: 0.76,
              odds: 1.36,
              bookmaker: 'BetPlay',
              bookmakerId: 'betplay',
              edge: 0.033,
              expectedValue: 3.36,
              dataQuality: 'VERY_HIGH'
            },
            {
              matchId: 'match-col-4',
              matchDescription: 'Independiente Medellín vs Once Caldas',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeTomorrow,
              market: 'double_chance',
              selection: 'home_draw',
              selectionName: 'Medellín o Empate (1X)',
              probability: 0.75,
              odds: 1.38,
              bookmaker: 'Wplay',
              bookmakerId: 'wplay',
              edge: 0.035,
              expectedValue: 3.5,
              dataQuality: 'HIGH'
            },
            {
              matchId: 'match-col-5',
              matchDescription: 'Deportes Tolima vs Atlético Bucaramanga',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeDayAfter,
              market: 'double_chance',
              selection: 'home_draw',
              selectionName: 'Deportes Tolima o Empate (1X)',
              probability: 0.78,
              odds: 1.34,
              bookmaker: 'Rushbet',
              bookmakerId: 'rushbet',
              edge: 0.045,
              expectedValue: 4.52,
              dataQuality: 'HIGH'
            }
          ],
          combinedOdds: 2.515,
          estimatedProbability: 0.445,
          estimatedEV: 11.9,
          dataQuality: 'VERY_HIGH',
          modelVersion: 'v1.0.0',
          generatedAt: new Date().toISOString(),
          status: 'ACTIVE',
          correlationRisk: 'NONE',
          correlationNotes: ['Eventos escalonados en 3 jornadas diferentes con cero correlación negativa.'],
          rankingScore: 62.4,
          explanation: {
            summary: '🐢 Parley Paciencia (Estrategia Multi-Fecha): La combinada más segura de la semana en Colombia.',
            justification: 'Distribuye los 3 eventos en jornadas distintas (Hoy, Mañana y Fin de semana) con una probabilidad individual superior al 75% por partido.',
            keyFactors: [
              'América, Medellín y Tolima acumulan más del 78% de puntos como locales',
              'Eventos independientes sin solapamiento de horario ni fatiga cruzada'
            ],
            riskFactors: [
              'Requiere esperar la resolución progresiva de cada fecha sin cerrar anticipadamente'
            ],
            provider: 'mock',
            generatedAt: new Date().toISOString()
          }
        },
        {
          parlayId: `parlay_${userId}_${today}_alta_prob_col`,
          userId,
          date: today,
          type: 'HIGH_PROBABILITY_PARLAY',
          displayCategory: 'ALTA_PROBABILIDAD',
          selections: [
            {
              matchId: 'match-col-3',
              matchDescription: 'América de Cali vs Deportivo Cali',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeTodaySoon,
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
            },
            {
              matchId: 'match-col-1',
              matchDescription: 'Millonarios vs Santa Fe',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeTodayEvening,
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
            }
          ],
          combinedOdds: 2.386,
          estimatedProbability: 0.446,
          estimatedEV: 6.5,
          dataQuality: 'HIGH',
          modelVersion: 'v1.0.0',
          generatedAt: new Date().toISOString(),
          status: 'ACTIVE',
          correlationRisk: 'NONE',
          correlationNotes: [],
          rankingScore: 48.2,
          explanation: {
            summary: 'Alta Probabilidad (Liga BetPlay): Selección de alta certeza con línea conservadora de doble oportunidad y under.',
            justification: 'Histórico de baja cuota de goles en clásicos del FPC.',
            keyFactors: ['Tasa de partidos under 2.5 superior al 68% en el torneo'],
            riskFactors: ['Posibles penales o expulsiones en partidos de alta fricción'],
            provider: 'mock',
            generatedAt: new Date().toISOString()
          }
        },
        {
          parlayId: `parlay_${userId}_${today}_valor_col`,
          userId,
          date: today,
          type: 'VALUE_PARLAY',
          displayCategory: 'VALOR',
          selections: [
            {
              matchId: 'match-col-1',
              matchDescription: 'Millonarios vs Santa Fe',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeTodaySoon,
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
              matchId: 'match-col-2',
              matchDescription: 'Atlético Nacional vs Junior',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeTodayEvening,
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
            }
          ],
          combinedOdds: 3.608,
          estimatedProbability: 0.319,
          estimatedEV: 15.1,
          dataQuality: 'MEDIUM',
          modelVersion: 'v1.0.0',
          generatedAt: new Date().toISOString(),
          status: 'ACTIVE',
          correlationRisk: 'NONE',
          correlationNotes: [],
          rankingScore: 46.8,
          explanation: {
            summary: 'Parley de Valor (+EV): Mayor expectativa matemática en Liga BetPlay.',
            justification: 'Las cuotas de mercado subestiman la localía en plazas de altura.',
            keyFactors: ['Edge promedio de +3.8%'],
            riskFactors: ['Margen de error en partidos cerrados'],
            provider: 'mock',
            generatedAt: new Date().toISOString()
          }
        },
        {
          parlayId: `parlay_${userId}_${today}_alt_col_1`,
          userId,
          date: today,
          type: 'BALANCED_PARLAY',
          displayCategory: 'ALTERNATIVAS',
          selections: [
            {
              matchId: 'match-col-2',
              matchDescription: 'Atlético Nacional vs Junior',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeTodaySoon,
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
              matchId: 'match-col-4',
              matchDescription: 'Independiente Medellín vs Once Caldas',
              competitionId: 'CO_LFP',
              competitionName: 'Liga BetPlay',
              utcDate: timeTomorrow,
              market: 'double_chance',
              selection: 'home_draw',
              selectionName: 'Medellín o Empate (1X)',
              probability: 0.75,
              odds: 1.38,
              bookmaker: 'Wplay',
              bookmakerId: 'wplay',
              edge: 0.035,
              expectedValue: 3.5,
              dataQuality: 'HIGH'
            }
          ],
          combinedOdds: 2.691,
          estimatedProbability: 0.412,
          estimatedEV: 10.8,
          dataQuality: 'MEDIUM',
          modelVersion: 'v1.0.0',
          generatedAt: new Date().toISOString(),
          status: 'ACTIVE',
          correlationRisk: 'NONE',
          correlationNotes: [],
          rankingScore: 39.5,
          explanation: {
            summary: 'Alternativa Balanceada: Mezcla de favoritismo de Nacional y resguardo en Medellín.',
            justification: 'Equilibrio de riesgo controlado para diversificación.',
            keyFactors: ['Rendimiento superior en duelos directos'],
            riskFactors: ['Junior con potencial de contragolpe'],
            provider: 'mock',
            generatedAt: new Date().toISOString()
          }
        }
      ];
    }

    // Default: Premier League / La Liga
    return [
      {
        parlayId: `parlay_${userId}_${today}_foco_epl`,
        userId,
        date: today,
        type: 'BALANCED_PARLAY',
        displayCategory: 'FOCO_DEL_DIA',
        selections: [
          {
            matchId: 'match-101',
            matchDescription: 'Arsenal FC vs Chelsea FC',
            competitionId: 'PL',
            competitionName: 'Premier League',
            utcDate: timeTodaySoon,
            market: '1X2',
            selection: 'home',
            selectionName: 'Arsenal FC (Gana)',
            probability: 0.60,
            odds: 1.80,
            bookmaker: 'Pinnacle',
            bookmakerId: 'pinnacle',
            edge: 0.045,
            expectedValue: 8.0,
            dataQuality: 'VERY_HIGH'
          },
          {
            matchId: 'match-103',
            matchDescription: 'Manchester City vs Liverpool FC',
            competitionId: 'PL',
            competitionName: 'Premier League',
            utcDate: timeTodayEvening,
            market: 'btts',
            selection: 'yes',
            selectionName: 'Ambos Equipos Anotan (Sí)',
            probability: 0.68,
            odds: 1.62,
            bookmaker: 'Bet365',
            bookmakerId: 'bet365',
            edge: 0.062,
            expectedValue: 10.16,
            dataQuality: 'HIGH'
          }
        ],
        combinedOdds: 2.916,
        estimatedProbability: 0.408,
        estimatedEV: 18.97,
        dataQuality: 'HIGH',
        modelVersion: 'v1.0.0',
        generatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        correlationRisk: 'NONE',
        correlationNotes: [],
        rankingScore: 54.3,
        explanation: {
          summary: 'Foco del Día: Doblete de Premier League con respaldo sólido de Poisson y xG.',
          justification: 'Arsenal muestra dominio de local frente a Chelsea, mientras que el enfrentamiento City-Liverpool tiene una tasa histórica de BTTS superior al 75%.',
          keyFactors: [
            'Arsenal supera a Chelsea en ocasiones creadas (2.8 vs 1.4 xG en últimos 5 partidos)',
            'Ambos equipos anotaron en 8 de los últimos 10 choques entre City y Liverpool'
          ],
          riskFactors: [
            'Cansancio acumulado por competición europea a mitad de semana'
          ],
          provider: 'mock',
          generatedAt: new Date().toISOString()
        }
      },
      // 🐢 PARLEY PACIENCIA (Multi-fecha y Máxima Seguridad)
      {
        parlayId: `parlay_${userId}_${today}_paciencia_epl`,
        userId,
        date: today,
        type: 'PACIENCIA_PARLAY',
        displayCategory: 'PACIENCIA',
        selections: [
          {
            matchId: 'match-101',
            matchDescription: 'Arsenal FC vs Chelsea FC',
            competitionId: 'PL',
            competitionName: 'Premier League',
            utcDate: timeTodaySoon,
            market: 'double_chance',
            selection: 'home_draw',
            selectionName: 'Arsenal o Empate (1X)',
            probability: 0.80,
            odds: 1.28,
            bookmaker: 'Pinnacle',
            bookmakerId: 'pinnacle',
            edge: 0.024,
            expectedValue: 2.4,
            dataQuality: 'VERY_HIGH'
          },
          {
            matchId: 'match-104',
            matchDescription: 'Manchester City vs Tottenham Hotspur',
            competitionId: 'PL',
            competitionName: 'Premier League',
            utcDate: timeTomorrow,
            market: 'over_1.5',
            selection: 'over',
            selectionName: 'Más de 1.5 Goles',
            probability: 0.84,
            odds: 1.30,
            bookmaker: 'Bet365',
            bookmakerId: 'bet365',
            edge: 0.092,
            expectedValue: 9.2,
            dataQuality: 'VERY_HIGH'
          },
          {
            matchId: 'match-105',
            matchDescription: 'Atlético de Madrid vs Sevilla FC',
            competitionId: 'PD',
            competitionName: 'La Liga',
            utcDate: timeDayAfter,
            market: 'double_chance',
            selection: 'home_draw',
            selectionName: 'Atlético de Madrid o Empate (1X)',
            probability: 0.78,
            odds: 1.35,
            bookmaker: 'Pinnacle',
            bookmakerId: 'pinnacle',
            edge: 0.053,
            expectedValue: 5.3,
            dataQuality: 'HIGH'
          }
        ],
        combinedOdds: 2.246,
        estimatedProbability: 0.524,
        estimatedEV: 17.68,
        dataQuality: 'VERY_HIGH',
        modelVersion: 'v1.0.0',
        generatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        correlationRisk: 'NONE',
        correlationNotes: ['3 partidos distribuidos en 3 jornadas diferentes con cero correlación cruzada.'],
        rankingScore: 68.5,
        explanation: {
          summary: '🐢 Parley Paciencia (Estrategia Multi-Fecha): La combinación más segura del calendario semanal.',
          justification: 'Estrategia cuantitativa paciente: selecciona los 3 eventos con mayor probabilidad individual calculada (>78%) repartidos entre Hoy, Mañana y Fin de semana.',
          keyFactors: [
            'Arsenal acumula 9 partidos sin caer en el Emirates',
            'Man City y Spurs promedian 3.2 goles en sus duelos directos',
            'Atlético solo ha concedido 4 goles en casa en toda la temporada'
          ],
          riskFactors: [
            'Requiere paciencia táctica para que concluyan las 3 fechas'
          ],
          provider: 'mock',
          generatedAt: new Date().toISOString()
        }
      },
      {
        parlayId: `parlay_${userId}_${today}_alta_prob_epl`,
        userId,
        date: today,
        type: 'HIGH_PROBABILITY_PARLAY',
        displayCategory: 'ALTA_PROBABILIDAD',
        selections: [
          {
            matchId: 'match-101',
            matchDescription: 'Arsenal FC vs Chelsea FC',
            competitionId: 'PL',
            competitionName: 'Premier League',
            utcDate: timeTodaySoon,
            market: '1X2',
            selection: 'home',
            selectionName: 'Arsenal FC (Gana)',
            probability: 0.60,
            odds: 1.80,
            bookmaker: 'Pinnacle',
            bookmakerId: 'pinnacle',
            edge: 0.045,
            expectedValue: 8.0,
            dataQuality: 'VERY_HIGH'
          },
          {
            matchId: 'match-102',
            matchDescription: 'Real Madrid vs FC Barcelona',
            competitionId: 'PD',
            competitionName: 'La Liga',
            utcDate: timeTodayEvening,
            market: 'over_2.5',
            selection: 'over',
            selectionName: 'Más de 2.5 Goles',
            probability: 0.65,
            odds: 1.68,
            bookmaker: 'Bet365',
            bookmakerId: 'bet365',
            edge: 0.055,
            expectedValue: 9.2,
            dataQuality: 'HIGH'
          }
        ],
        combinedOdds: 3.024,
        estimatedProbability: 0.39,
        estimatedEV: 17.94,
        dataQuality: 'HIGH',
        modelVersion: 'v1.0.0',
        generatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        correlationRisk: 'NONE',
        correlationNotes: [],
        rankingScore: 51.4,
        explanation: {
          summary: 'Parley Alta Probabilidad: Combinada de 2 selecciones de alta solidez en Premier League y La Liga.',
          justification: 'Ambos partidos cuentan con muestras estadísticas de más de 20 jornadas y modelos Poisson calibrados.',
          keyFactors: ['Calidad de datos VERY_HIGH', 'El Clásico promedia 3.4 goles por encuentro'],
          riskFactors: ['Intensidad defensiva táctica en partidos de alto calibre'],
          provider: 'mock',
          generatedAt: new Date().toISOString()
        }
      },
      {
        parlayId: `parlay_${userId}_${today}_valor_epl`,
        userId,
        date: today,
        type: 'VALUE_PARLAY',
        displayCategory: 'VALOR',
        selections: [
          {
            matchId: 'match-103',
            matchDescription: 'Manchester City vs Liverpool FC',
            competitionId: 'PL',
            competitionName: 'Premier League',
            utcDate: timeTodaySoon,
            market: 'btts',
            selection: 'yes',
            selectionName: 'Ambos Equipos Anotan (Sí)',
            probability: 0.68,
            odds: 1.62,
            bookmaker: 'Bet365',
            bookmakerId: 'bet365',
            edge: 0.062,
            expectedValue: 10.16,
            dataQuality: 'HIGH'
          },
          {
            matchId: 'match-105',
            matchDescription: 'Atlético de Madrid vs Sevilla FC',
            competitionId: 'PD',
            competitionName: 'La Liga',
            utcDate: timeDayAfter,
            market: '1X2',
            selection: 'home',
            selectionName: 'Atlético de Madrid (Gana)',
            probability: 0.58,
            odds: 1.85,
            bookmaker: 'Pinnacle',
            bookmakerId: 'pinnacle',
            edge: 0.038,
            expectedValue: 7.3,
            dataQuality: 'HIGH'
          },
          {
            matchId: 'match-102',
            matchDescription: 'Real Madrid vs FC Barcelona',
            competitionId: 'PD',
            competitionName: 'La Liga',
            utcDate: timeTodayEvening,
            market: 'over_2.5',
            selection: 'over',
            selectionName: 'Más de 2.5 Goles',
            probability: 0.65,
            odds: 1.68,
            bookmaker: 'Pinnacle',
            bookmakerId: 'pinnacle',
            edge: 0.055,
            expectedValue: 9.2,
            dataQuality: 'HIGH'
          }
        ],
        combinedOdds: 5.035,
        estimatedProbability: 0.256,
        estimatedEV: 28.9,
        dataQuality: 'HIGH',
        modelVersion: 'v1.0.0',
        generatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        correlationRisk: 'NONE',
        correlationNotes: [],
        rankingScore: 58.7,
        explanation: {
          summary: 'Parley de Valor (+EV): Combinada de 3 eventos con la mayor expectativa matemática acumulada (+28.9% EV).',
          justification: 'Todos los mercados seleccionados superan su cuota justa con un edge favorable mayor al 3.5%.',
          keyFactors: ['Edge promedio de +5.2%', 'Cuota combinada atractiva de 5.04'],
          riskFactors: ['Volatilidad incrementada por combinar 3 eventos'],
          provider: 'mock',
          generatedAt: new Date().toISOString()
        }
      },
      {
        parlayId: `parlay_${userId}_${today}_alt_epl_1`,
        userId,
        date: today,
        type: 'BALANCED_PARLAY',
        displayCategory: 'ALTERNATIVAS',
        selections: [
          {
            matchId: 'match-101',
            matchDescription: 'Arsenal FC vs Chelsea FC',
            competitionId: 'PL',
            competitionName: 'Premier League',
            utcDate: timeTodaySoon,
            market: 'over_2.5',
            selection: 'over',
            selectionName: 'Más de 2.5 Goles',
            probability: 0.64,
            odds: 1.72,
            bookmaker: 'Bet365',
            bookmakerId: 'bet365',
            edge: 0.058,
            expectedValue: 10.08,
            dataQuality: 'HIGH'
          },
          {
            matchId: 'match-105',
            matchDescription: 'Atlético de Madrid vs Sevilla FC',
            competitionId: 'PD',
            competitionName: 'La Liga',
            utcDate: timeDayAfter,
            market: '1X2',
            selection: 'home',
            selectionName: 'Atlético de Madrid (Gana)',
            probability: 0.58,
            odds: 1.85,
            bookmaker: 'Pinnacle',
            bookmakerId: 'pinnacle',
            edge: 0.038,
            expectedValue: 7.3,
            dataQuality: 'HIGH'
          }
        ],
        combinedOdds: 3.182,
        estimatedProbability: 0.371,
        estimatedEV: 18.05,
        dataQuality: 'HIGH',
        modelVersion: 'v1.0.0',
        generatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        correlationRisk: 'NONE',
        correlationNotes: [],
        rankingScore: 47.9,
        explanation: {
          summary: 'Alternativa Equilibrada: Combinada de goles en Londres y fortaleza local en Madrid.',
          justification: 'Opción con excelente relación cuota/riesgo (3.18) y calidad de datos alta.',
          keyFactors: ['Excelente ratio de victorias colchoneras en el Metropolitano'],
          riskFactors: ['Sevilla suele plantear partidos trabados'],
          provider: 'mock',
          generatedAt: new Date().toISOString()
        }
      }
    ];
  }
}
