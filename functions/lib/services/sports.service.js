"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SportsService = void 0;
const factory_js_1 = require("../providers/factory.js");
const circuitBreaker_js_1 = require("../utils/circuitBreaker.js");
const logger_js_1 = require("../utils/logger.js");
const index_js_1 = require("../config/index.js");
class SportsService {
    provider;
    circuitBreaker;
    logger = new logger_js_1.StructuredLogger('SportsService');
    constructor(provider) {
        this.provider = provider || factory_js_1.ProviderFactory.getSportsProvider();
        this.circuitBreaker = new circuitBreaker_js_1.CircuitBreaker({
            serviceName: this.provider.providerName,
            failureThreshold: index_js_1.config.circuitBreaker.failureThreshold,
            recoveryTimeMs: index_js_1.config.circuitBreaker.recoveryTimeMs
        });
    }
    async getCompetitions() {
        this.logger.debug('Obteniendo competiciones deportivas');
        return this.circuitBreaker.execute(() => this.provider.getCompetitions());
    }
    async getSeasons(competitionId) {
        return this.circuitBreaker.execute(() => this.provider.getSeasons(competitionId));
    }
    async getLiveMatches(competitionId) {
        return this.circuitBreaker.execute(() => this.provider.getLiveMatches(competitionId));
    }
    async getUpcomingMatches(date, competitionId) {
        return this.circuitBreaker.execute(() => this.provider.getUpcomingMatches(competitionId, date));
    }
    async getResults(competitionId, lastN) {
        return this.circuitBreaker.execute(() => this.provider.getResults(competitionId, lastN));
    }
    async getStandings(competitionId, season) {
        return this.circuitBreaker.execute(() => this.provider.getStandings(competitionId, season));
    }
    async getStatistics(matchId) {
        return this.circuitBreaker.execute(() => this.provider.getStatistics(matchId));
    }
    async getH2H(teamAId, teamBId) {
        return this.circuitBreaker.execute(() => this.provider.getH2H(teamAId, teamBId));
    }
    async getInjuries(matchId) {
        return this.circuitBreaker.execute(() => this.provider.getInjuries(matchId));
    }
    async getLineups(matchId) {
        return this.circuitBreaker.execute(() => this.provider.getLineups(matchId));
    }
    async getPredictions(matchId) {
        return this.circuitBreaker.execute(() => this.provider.getPredictions(matchId));
    }
    async getMatchDetails(matchId) {
        return this.circuitBreaker.execute(() => this.provider.getMatchDetails(matchId));
    }
}
exports.SportsService = SportsService;
//# sourceMappingURL=sports.service.js.map