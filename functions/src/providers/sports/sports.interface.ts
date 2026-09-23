export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  form?: string[];
}

export interface Competition {
  id: string;
  name: string;
  country: string;
  code: string;
  emblem: string;
  season: string;
}

export interface Season {
  year: number;
  start: string;
  end: string;
  current: boolean;
}

export interface MatchScore {
  home: number | null;
  away: number | null;
  halfTime?: {
    home: number | null;
    away: number | null;
  };
}

export interface SportMatch {
  id: string;
  competition: Competition;
  utcDate: string;
  status: MatchStatus;
  minute?: number;
  homeTeam: Team;
  awayTeam: Team;
  score: MatchScore;
  venue?: string;
  isMock?: boolean;
}

export interface MatchStatistics {
  possession: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  totalShots: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
}

export interface HeadToHead {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  recentMatches: Array<{
    date: string;
    homeTeam: string;
    awayTeam: string;
    score: string;
  }>;
}

export interface StandingItem {
  rank: number;
  team: Team;
  points: number;
  goalsDiff: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  form?: string;
}

export interface StandingsTable {
  competitionId: string;
  season: string;
  standings: StandingItem[];
  updatedAt: string;
}

export interface InjuryReport {
  player: {
    id: string;
    name: string;
    type: string;
    reason: string;
  };
  team: {
    id: string;
    name: string;
  };
  fixtureId: string;
}

export interface SquadPlayer {
  id: string;
  name: string;
  age: number;
  number?: number;
  position: string;
  photo: string;
}

export interface MatchLineup {
  team: Team;
  formation: string;
  startXI: Array<{ id: string; name: string; number: number; pos: string }>;
  substitutes: Array<{ id: string; name: string; number: number; pos: string }>;
  coach: { id: string; name: string; photo?: string };
}

export interface MatchPrediction {
  matchId: string;
  winner: { id: string; name: string; comment?: string };
  winProbabilities: { home: number; draw: number; away: number };
  goalsAdvise: string;
  percentAdvice: string;
}

export interface SportMatchDetails extends SportMatch {
  statistics?: MatchStatistics;
  headToHead?: HeadToHead;
  lineups?: { home: MatchLineup; away: MatchLineup };
  injuries?: InjuryReport[];
  predictions?: MatchPrediction;
}

export interface SportsDataProvider {
  readonly providerName: string;
  // 1. Obtener competiciones
  getCompetitions(): Promise<Competition[]>;
  // 2. Obtener temporadas
  getSeasons(competitionId: string): Promise<Season[]>;
  // 3. Obtener próximos partidos
  getUpcomingMatches(competitionId?: string, date?: string): Promise<SportMatch[]>;
  // 4. Obtener resultados
  getResults(competitionId?: string, lastN?: number): Promise<SportMatch[]>;
  // 5. Obtener standings
  getStandings(competitionId: string, season?: string): Promise<StandingsTable>;
  // 6. Obtener estadísticas
  getStatistics(matchId: string): Promise<MatchStatistics>;
  // 7. Obtener enfrentamientos H2H
  getH2H(teamAId: string, teamBId: string): Promise<HeadToHead>;
  // 8. Obtener lesiones
  getInjuries(matchId: string): Promise<InjuryReport[]>;
  // 9. Obtener jugadores disponibles
  getSquad(teamId: string): Promise<SquadPlayer[]>;
  // 10. Obtener alineaciones
  getLineups(matchId: string): Promise<{ home: MatchLineup; away: MatchLineup } | null>;
  // 11. Obtener predicciones disponibles
  getPredictions(matchId: string): Promise<MatchPrediction | null>;
  // Método auxiliar detalle completo
  getMatchDetails(matchId: string): Promise<SportMatchDetails>;
  getLiveMatches(competitionId?: string): Promise<SportMatch[]>;
}
