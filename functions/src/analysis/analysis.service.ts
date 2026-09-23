import { SportsService } from '../services/sports.service.js';
import { OddsService } from '../services/odds.service.js';
import { AIService } from '../services/ai.service.js';
import { MatchAnalysisResult } from '../providers/ai/ai.interface.js';
import { StructuredLogger } from '../utils/logger.js';

export interface UnifiedMatchReport {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  utcDate: string;
  analysis: MatchAnalysisResult;
  bestOdds: {
    home: number;
    draw: number;
    away: number;
  };
  generatedAt: string;
}

export class AnalysisEngine {
  private sportsService: SportsService;
  private oddsService: OddsService;
  private aiService: AIService;
  private logger = new StructuredLogger('AnalysisEngine');

  constructor() {
    this.sportsService = new SportsService();
    this.oddsService = new OddsService();
    this.aiService = new AIService();
  }

  async analyzeMatch(matchId: string, sportKey: string = 'soccer_epl'): Promise<UnifiedMatchReport> {
    this.logger.info(`Iniciando análisis unificado para partido ${matchId}`);

    const [match, odds] = await Promise.all([
      this.sportsService.getMatchDetails(matchId),
      this.oddsService.getMatchOdds(sportKey, matchId)
    ]);

    const bestHome = odds.bestOdds?.home.price || 1.85;
    const bestDraw = odds.bestOdds?.draw?.price || 3.50;
    const bestAway = odds.bestOdds?.away.price || 4.00;

    const analysis = await this.aiService.getMatchAnalysis({
      matchId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      competition: match.competition.name,
      h2hSummary: match.headToHead ? `${match.headToHead.totalMatches} partidos, ${match.headToHead.homeWins}V local, ${match.headToHead.awayWins}V visita` : undefined,
      recentForm: {
        home: match.homeTeam.form || ['W', 'D', 'W'],
        away: match.awayTeam.form || ['L', 'W', 'D']
      },
      oddsSummary: {
        homeWin: bestHome,
        draw: bestDraw,
        awayWin: bestAway
      }
    });

    return {
      matchId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      competition: match.competition.name,
      utcDate: match.utcDate,
      analysis,
      bestOdds: {
        home: bestHome,
        draw: bestDraw,
        away: bestAway
      },
      generatedAt: new Date().toISOString()
    };
  }
}
