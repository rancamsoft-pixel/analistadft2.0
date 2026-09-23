export interface MatchAnalysisPrompt {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  h2hSummary?: string;
  recentForm?: {
    home: string[];
    away: string[];
  };
  oddsSummary?: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
}

export interface ExpectedValueAssessment {
  selection: string;
  market: string;
  currentOdds: number;
  estimatedProbability: number; // e.g. 0.58 (58%)
  impliedProbability: number;   // 1 / currentOdds e.g. 0.53 (53%)
  expectedValuePercentage: number; // ((prob * odds) - 1) * 100
  isValueBet: boolean;
  confidenceScore: number; // 0 - 100
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

export interface AIProvider {
  readonly providerName: string;
  generateMatchAnalysis(prompt: MatchAnalysisPrompt): Promise<MatchAnalysisResult>;
  evaluateBetValue(
    selection: string,
    market: string,
    currentOdds: number,
    estimatedProbability: number
  ): Promise<ExpectedValueAssessment>;
}
