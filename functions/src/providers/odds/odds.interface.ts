export type MarketKey = 'h2h' | 'spreads' | 'totals' | 'btts';
export type CanonicalMarket = '1X2' | 'over_under' | 'btts';
export type CanonicalSelection = 'home' | 'draw' | 'away' | 'over' | 'under' | 'yes' | 'no';

export interface Outcome {
  name: string; // 'Arsenal FC', 'Empate', 'Chelsea FC', 'Over 2.5', 'Under 2.5'
  price: number; // Decimal odds e.g. 1.85
  point?: number; // e.g. 2.5 for totals
}

export interface Market {
  key: MarketKey;
  lastUpdate: string;
  outcomes: Outcome[];
}

export interface BookmakerOdds {
  key: string; // 'pinnacle', 'bet365', 'draftkings', 'betfair'
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

/**
 * Modelo canónico interno para Firestore: odds/{oddsId}
 */
export interface NormalizedOddsItem {
  id: string; // `${matchId}_${bookmakerId}_${market}_${selection}`
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

/**
 * Snapshot histórico para Firestore: odds_snapshots/{snapshotId}
 */
export interface OddsSnapshot {
  snapshotId: string;
  matchId: string;
  bookmaker: string;
  market: string;
  selection?: string;
  line?: number;
  odds: number;
  capturedAt: string;
  trigger: 'daily' | 'pre_match' | 'on_demand';
}

/**
 * Fila individual del comparador para una casa de apuestas específica
 */
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

/**
 * Comparación estadística de cuotas para una selección en un mercado
 */
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

/**
 * Comparación completa de un partido para el comparador de cuotas
 */
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

export interface OddsProvider {
  readonly providerName: string;
  getMatchOdds(sportKey: string, eventId: string): Promise<EventOdds>;
  getUpcomingOdds(sportKey: string): Promise<EventOdds[]>;
  getSupportedSports(): Promise<Array<{ key: string; title: string }>>;
  getMatchOddsComparison(sportKey: string, eventId: string, requestedBookmakers?: string[]): Promise<MatchOddsComparison>;
}
