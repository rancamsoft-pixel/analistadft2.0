import { ProviderFactory } from '../providers/factory.js';
import {
  Competition,
  HeadToHead,
  InjuryReport,
  MatchLineup,
  MatchPrediction,
  MatchStatistics,
  Season,
  SportMatch,
  SportMatchDetails,
  SportsDataProvider,
  StandingsTable
} from '../providers/sports/sports.interface.js';
import { CircuitBreaker } from '../utils/circuitBreaker.js';
import { StructuredLogger } from '../utils/logger.js';
import { config } from '../config/index.js';

export class SportsService {
  private provider: SportsDataProvider;
  private circuitBreaker: CircuitBreaker;
  private logger = new StructuredLogger('SportsService');

  constructor(provider?: SportsDataProvider) {
    this.provider = provider || ProviderFactory.getSportsProvider();
    this.circuitBreaker = new CircuitBreaker({
      serviceName: this.provider.providerName,
      failureThreshold: config.circuitBreaker.failureThreshold,
      recoveryTimeMs: config.circuitBreaker.recoveryTimeMs
    });
  }

  async getCompetitions(): Promise<Competition[]> {
    this.logger.debug('Obteniendo competiciones deportivas');
    return this.circuitBreaker.execute(() => this.provider.getCompetitions());
  }

  async getSeasons(competitionId: string): Promise<Season[]> {
    return this.circuitBreaker.execute(() => this.provider.getSeasons(competitionId));
  }

  async getLiveMatches(competitionId?: string): Promise<SportMatch[]> {
    return this.circuitBreaker.execute(() => this.provider.getLiveMatches(competitionId));
  }

  async getUpcomingMatches(date?: string, competitionId?: string): Promise<SportMatch[]> {
    return this.circuitBreaker.execute(() => this.provider.getUpcomingMatches(competitionId, date));
  }

  async getResults(competitionId?: string, lastN?: number): Promise<SportMatch[]> {
    return this.circuitBreaker.execute(() => this.provider.getResults(competitionId, lastN));
  }

  async getStandings(competitionId: string, season?: string): Promise<StandingsTable> {
    return this.circuitBreaker.execute(() => this.provider.getStandings(competitionId, season));
  }

  async getStatistics(matchId: string): Promise<MatchStatistics> {
    return this.circuitBreaker.execute(() => this.provider.getStatistics(matchId));
  }

  async getH2H(teamAId: string, teamBId: string): Promise<HeadToHead> {
    return this.circuitBreaker.execute(() => this.provider.getH2H(teamAId, teamBId));
  }

  async getInjuries(matchId: string): Promise<InjuryReport[]> {
    return this.circuitBreaker.execute(() => this.provider.getInjuries(matchId));
  }

  async getLineups(matchId: string): Promise<{ home: MatchLineup; away: MatchLineup } | null> {
    return this.circuitBreaker.execute(() => this.provider.getLineups(matchId));
  }

  async getPredictions(matchId: string): Promise<MatchPrediction | null> {
    return this.circuitBreaker.execute(() => this.provider.getPredictions(matchId));
  }

  async getMatchDetails(matchId: string): Promise<SportMatchDetails> {
    return this.circuitBreaker.execute(() => this.provider.getMatchDetails(matchId));
  }
}
