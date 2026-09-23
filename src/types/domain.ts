export type OddsFormat = 'decimal' | 'american' | 'fractional';

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';

export type CompetitionRegion = 'COLOMBIA' | 'EUROPA' | 'AMERICA_SUR' | 'INTERNACIONAL';
export type CompetitionTier = 'PRIMERA' | 'SEGUNDA' | 'COPA' | 'CONTINENTAL';

export interface Competition {
  id: string;
  name: string;
  country: string;
  code: string;
  emblem: string;
  season: string;
  region?: CompetitionRegion;
  tier?: CompetitionTier;
  flag?: string; // emoji flag e.g. '🇨🇴'
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  form?: string[];
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
  xg?: { home: number; away: number };
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

export interface PlayerInjury {
  player: string;
  position: string;
  status: string;
  reason?: string;
  isKeyPlayer?: boolean;
}

export interface MatchNewsItem {
  title: string;
  source: string;
  publishedAt?: string;
  snippet?: string;
}

export interface SportMatchDetails extends SportMatch {
  statistics?: MatchStatistics;
  headToHead?: HeadToHead;
  injuries?: {
    home: PlayerInjury[];
    away: PlayerInjury[];
  };
  news?: MatchNewsItem[];
  externalPredictions?: {
    source: string;
    consensusHome: number;
    consensusDraw: number;
    consensusAway: number;
  };
  oddsMovement?: {
    openingOdds: { home: number; draw: number; away: number };
    currentOdds: { home: number; draw: number; away: number };
    trend: 'UP' | 'DOWN' | 'STABLE';
    movementPercentage: number;
  };
}

export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

export interface Market {
  key: 'h2h' | 'spreads' | 'totals';
  lastUpdate: string;
  outcomes: Outcome[];
}

export interface BookmakerOdds {
  key: string;
  title: string;
  lastUpdate: string;
  markets: Market[];
}

export interface EventOdds {
  id: string;
  sportKey: string;
  sportTitle: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  bookmakers: BookmakerOdds[];
  bestOdds?: {
    home: { price: number; bookmaker: string };
    draw?: { price: number; bookmaker: string };
    away: { price: number; bookmaker: string };
    payoutMargin?: number;
  };
  isMock?: boolean;
  isStale?: boolean;
  fetchedAt?: string;
}

export type CanonicalMarket = '1X2' | 'over_under' | 'btts';
export type CanonicalSelection = 'home' | 'draw' | 'away' | 'over' | 'under' | 'yes' | 'no';

export interface NormalizedOddsItem {
  id: string;
  matchId: string;
  bookmakerId: string;
  bookmakerName: string;
  provider: 'the-odds-api' | 'mock';
  market: CanonicalMarket;
  selection: CanonicalSelection;
  odds: number;
  line?: number;
  timestamp: string;
  fetchedAt: string;
  isStale?: boolean;
}

export interface BookmakerComparisonRow {
  bookmakerId: string;
  bookmakerName: string;
  isAvailable: boolean;
  price?: number;
  unavailableReason?: string;
  lastUpdate?: string;
  isBest?: boolean;
  isWorst?: boolean;
}

export interface SelectionOddsComparison {
  market: CanonicalMarket;
  selection: CanonicalSelection;
  line?: number;
  bestOdds: { price: number; bookmakerId: string; bookmakerName: string } | null;
  worstOdds: { price: number; bookmakerId: string; bookmakerName: string } | null;
  averageOdds: number;
  medianOdds: number;
  bookmakerCount: number;
  rows: BookmakerComparisonRow[];
}

export interface MatchOddsComparison {
  matchId: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  fetchedAt: string;
  isStale: boolean;
  provider: string;
  selections: Record<string, SelectionOddsComparison>;
  activeBookmakersEvaluated: string[];
}

export interface OddsUsageStats {
  provider: 'the-odds-api';
  monthlyLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  lastQuery: string | null;
  lastError: string | null;
  status: 'OK' | 'WARNING' | 'EXHAUSTED';
  warningAlert: boolean;
  estimatedCostPerQuery: number;
  lastUpdated: string;
}

export interface ExpectedValueAssessment {
  selection: string;
  market: string;
  currentOdds: number;
  estimatedProbability: number;
  impliedProbability: number;
  expectedValuePercentage: number;
  isValueBet: boolean;
  confidenceScore: number;
  recommendation: 'STRONG_VALUE' | 'MODERATE_VALUE' | 'FAIR_MARKET' | 'NEGATIVE_VALUE';
}

export interface MatchAnalysisResult {
  matchId: string;
  summary: string;
  keyTacticalInsights: string[];
  projectedScore: {
    home: number;
    away: number;
  };
  winProbabilities: {
    home: number;
    draw: number;
    away: number;
  };
  valueBets: ExpectedValueAssessment[];
  riskFactor: 'LOW' | 'MEDIUM' | 'HIGH';
  disclaimer: string;
  provider: string;
  isMock: boolean;
  generatedAt: string;
}

export interface ParlayLeg {
  id: string;
  matchId: string;
  matchDescription: string;
  selection: string;
  odds: number;
  estimatedProbability?: number;
}

export interface ParlayCalculationResult {
  totalOddsDecimal: number;
  totalOddsAmerican: string;
  impliedProbabilityPercent: number;
  estimatedJointProbabilityPercent: number;
  expectedValuePercentage: number;
  potentialPayout: (stake?: number) => number;
  potentialProfit: (stake?: number) => number;
  warnings: string[];
  isRecommended: boolean;
}

export interface ParlaySlip {
  legs: ParlayLeg[];
  stake: number;
  totalOddsDecimal: number;
  totalOddsAmerican: string;
  impliedProbability: number;
  expectedValue: number;
  payout: number;
  profit: number;
}

export type UserRole = 'user' | 'admin';

export interface AppUser {
  id: string;
  uid?: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  active: boolean;
  isAnonymous?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  activeCompetitionIds: string[]; // Máximo 2
  activeBookmakerIds: string[];   // Máximo 5
  activeMarketKeys: string[];
  oddsFormat: OddsFormat;
  analysisTime: string;           // e.g. "09:00"
  updatedAt: string;
}

export interface UserProfileSettings {
  displayName: string;
  phoneNumber?: string;
  timezone: string;
  preferredCurrency: string;
}

export interface UserNotificationsSettings {
  dailyFocus: boolean;
  parlayReady: boolean;
  importantOddsMovement: boolean;
  matchStartingSoon: boolean;
  emailAlerts?: boolean;
  oddsDropAlerts?: boolean;
  minEvThreshold?: number; // e.g. 3.0 para +3% EV
}

export interface UserNotificationToken {
  tokenId: string;
  deviceType: 'web' | 'android' | 'ios';
  userAgent?: string;
  createdAt: string;
  lastUsedAt: string;
}

export type JobExecutionStage =
  | 'FETCH_FIXTURES'
  | 'FETCH_ODDS'
  | 'STATISTICAL_ANALYSIS'
  | 'AI_ANALYSIS'
  | 'PARLAY_GENERATION'
  | 'NOTIFICATIONS';

export type JobExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL';

export interface DailyJobLog {
  jobId: string;
  date: string; // YYYY-MM-DD
  status: JobExecutionStatus;
  start: string;
  end?: string;
  durationMs?: number;
  currentStage?: JobExecutionStage;
  completedStages: JobExecutionStage[];
  usersProcessed: number;
  matchesProcessed: number;
  apiCalls: number;
  aiCalls: number;
  parlaysGenerated: number;
  notificationsSent: number;
  errors: string[];
}

export type BookmakerCategory = 'COLOMBIA' | 'INTERNATIONAL';
export type BookmakerLicense = 'COLJUEGOS' | 'INTERNACIONAL';
export type BookmakerCurrency = 'COP' | 'EUR' | 'USD' | 'GBP';

export interface GlobalBookmaker {
  id: string;
  name: string;
  logo: string;
  provider: string;
  providerKey: string;
  country: string;
  active: boolean;
  category?: BookmakerCategory;
  license?: BookmakerLicense;
  currency?: BookmakerCurrency;
  website?: string;
}

export interface GlobalMarket {
  id: string;
  key: string; // '1X2' | 'double_chance' | 'draw_no_bet' | 'over_under' | 'both_teams_to_score' | 'asian_handicap'
  name: string;
  description: string;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Motor de Parlays Automático — Tipos Canónicos
// ---------------------------------------------------------------------------

export type ParlayType =
  | 'HIGH_PROBABILITY_PARLAY'
  | 'VALUE_PARLAY'
  | 'BALANCED_PARLAY';

export type ParlayDisplayCategory =
  | 'FOCO_DEL_DIA'
  | 'ALTA_PROBABILIDAD'
  | 'VALOR'
  | 'ALTERNATIVAS';

export type CorrelationRisk = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface ParlaySelection {
  matchId: string;
  matchDescription: string;
  competitionId: string;
  competitionName?: string;
  utcDate: string;
  market: string;
  selection: string;
  selectionName: string;
  probability: number;
  odds: number;
  bookmaker: string;
  bookmakerId: string;
  edge?: number;
  expectedValue?: number;
  dataQuality: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
}

export interface ParlayExplanation {
  summary: string;
  justification: string;
  keyFactors: string[];
  riskFactors: string[];
  provider: 'gemini' | 'mock';
  generatedAt: string;
}

export interface SavedParlay {
  parlayId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  type: ParlayType;
  displayCategory: ParlayDisplayCategory;
  selections: ParlaySelection[];
  combinedOdds: number;
  estimatedProbability: number;
  estimatedEV: number;
  dataQuality: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  modelVersion: string;
  generatedAt: string;
  status: 'ACTIVE' | 'WON' | 'LOST' | 'VOID' | 'PENDING';
  correlationRisk: CorrelationRisk;
  correlationNotes: string[];
  rankingScore: number;
  explanation?: ParlayExplanation;
}

