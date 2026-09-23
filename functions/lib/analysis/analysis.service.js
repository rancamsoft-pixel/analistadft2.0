"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisEngine = void 0;
const sports_service_js_1 = require("../services/sports.service.js");
const odds_service_js_1 = require("../services/odds.service.js");
const ai_service_js_1 = require("../services/ai.service.js");
const logger_js_1 = require("../utils/logger.js");
class AnalysisEngine {
    sportsService;
    oddsService;
    aiService;
    logger = new logger_js_1.StructuredLogger('AnalysisEngine');
    constructor() {
        this.sportsService = new sports_service_js_1.SportsService();
        this.oddsService = new odds_service_js_1.OddsService();
        this.aiService = new ai_service_js_1.AIService();
    }
    async analyzeMatch(matchId, sportKey = 'soccer_epl') {
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
exports.AnalysisEngine = AnalysisEngine;
//# sourceMappingURL=analysis.service.js.map