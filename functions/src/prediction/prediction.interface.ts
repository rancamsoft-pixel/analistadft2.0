/**
 * Motor Estadístico — Tipos Canónicos
 *
 * Las probabilidades emergen de modelos matemáticos reproducibles.
 * Gemini NO determina probabilidades; solo interpreta contexto
 * textual posterior a que el motor produzca sus cifras.
 */

// ---------------------------------------------------------------------------
// Calidad del dato
// ---------------------------------------------------------------------------

/**
 * Depende de: cantidad de datos, antigüedad, fuentes disponibles,
 * lesiones conocidas, alineación disponible, consistencia entre fuentes.
 */
export type DataQuality = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

// ---------------------------------------------------------------------------
// Categoría de señal (NO es garantía)
// ---------------------------------------------------------------------------

/**
 * HIGH_PROBABILITY  → probabilidad modelo > 65%
 * VALUE             → edge > 0.04 y calidad ≥ MEDIUM
 * NEUTRAL           → sin edge significativo
 * LOW_CONFIDENCE    → calidad LOW pero suficiente para emitir
 * INSUFFICIENT_DATA → análisis descartado por falta de datos
 */
export type PredictionCategory =
  | 'HIGH_PROBABILITY'
  | 'VALUE'
  | 'NEUTRAL'
  | 'LOW_CONFIDENCE'
  | 'INSUFFICIENT_DATA';

// ---------------------------------------------------------------------------
// Mercados soportados
// ---------------------------------------------------------------------------

export type SupportedMarket =
  | '1X2'
  | 'double_chance'
  | 'draw_no_bet'
  | 'over_0.5'
  | 'over_1.5'
  | 'over_2.5'
  | 'over_3.5'
  | 'under_2.5'
  | 'under_3.5'
  | 'under_4.5'
  | 'btts';

export type MarketSelection =
  | 'home'
  | 'draw'
  | 'away'
  | 'home_draw'
  | 'home_away'
  | 'draw_away'
  | 'home_dnb'
  | 'away_dnb'
  | 'over'
  | 'under'
  | 'yes'
  | 'no';

// ---------------------------------------------------------------------------
// Factor individual con metadatos completos
// ---------------------------------------------------------------------------

export interface PredictionFactor {
  /** Nombre del factor (e.g. 'home_goals_scored_5', 'xg_home', 'h2h_home_wins') */
  name: string;
  /** Valor numérico del factor */
  value: number;
  /** Peso del factor en el modelo [0, 1] */
  weight: number;
  /** Fuente del dato */
  source: 'api-football' | 'h2h' | 'standings' | 'xg' | 'lineups' | 'injuries' | 'mock' | 'derived';
  /** Calidad del dato individual */
  quality: DataQuality;
  /** Si el dato estaba disponible (false = ausente, NO penalización automática extrema) */
  available: boolean;
  /** Nota adicional opcional */
  note?: string;
}

// ---------------------------------------------------------------------------
// Inputs crudos al motor (lo que había disponible antes del partido)
// ---------------------------------------------------------------------------

export interface TeamFormData {
  /** Resultados ordenados del más reciente al más antiguo */
  results: Array<'W' | 'D' | 'L'>;
  /** Goles marcados en cada partido (misma ordenación) */
  goalsScored: number[];
  /** Goles recibidos en cada partido (misma ordenación) */
  goalsConceded: number[];
  /** xG marcados si disponible */
  xgScored?: number[];
  /** xGA recibidos si disponible */
  xgConceded?: number[];
  /** Total de tiros si disponible */
  shots?: number[];
  /** ¿Es esta la estadística en casa (home) o fuera (away)? */
  venueFilter: 'home' | 'away' | 'all';
  /** Número de partidos considerados */
  matchCount: number;
}

export interface H2HData {
  totalMatches: number;
  homeTeamWins: number;
  awayTeamWins: number;
  draws: number;
  /** Goles totales en los H2H (para estimar xG implícito) */
  totalGoals: number;
  recentMatchCount: number;
}

export interface InjuryData {
  homeInjuryCount: number;
  awayInjuryCount: number;
  homeKeyPlayersInjured: number; // portero o delanteros titulares
  awayKeyPlayersInjured: number;
}

export interface StandingData {
  homeRank: number;
  awayRank: number;
  totalTeams: number;
  homePoints: number;
  awayPoints: number;
  homeGoalDiff: number;
  awayGoalDiff: number;
}

export interface MatchInputData {
  matchId: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  competitionId: string;
  utcDate: string;
  /** Estadísticas de forma local del equipo local */
  homeForm?: TeamFormData;
  /** Estadísticas de forma visitante del equipo visitante */
  awayForm?: TeamFormData;
  /** H2H entre los dos equipos */
  h2h?: H2HData;
  /** Datos de lesiones */
  injuries?: InjuryData;
  /** Datos de posición en liga */
  standings?: StandingData;
  /** Alineación confirmada disponible */
  lineupsAvailable: boolean;
  /** Días de descanso desde el último partido (null = desconocido) */
  homeRestDays?: number;
  awayRestDays?: number;
  /** Liga home/away advantage medio (puede ser null si no hay datos históricos suficientes) */
  leagueHomeWinRate?: number;
}

// ---------------------------------------------------------------------------
// Salida del motor por modelo individual
// ---------------------------------------------------------------------------

export interface ModelOutput {
  /** Nombre del modelo */
  model: 'poisson' | 'xg' | 'form' | 'home_away';
  /** Lambda home (goles esperados local) */
  lambdaHome: number;
  /** Lambda away (goles esperados visitante) */
  lambdaAway: number;
  /** Peso efectivo usado en la combinación */
  effectiveWeight: number;
  /** Disponibilidad de datos suficientes para este modelo */
  dataAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Probabilidades base de 1X2 (de las que derivan todos los demás mercados)
// ---------------------------------------------------------------------------

export interface Base1X2Probabilities {
  home: number;
  draw: number;
  away: number;
  /** Matrix de distribución de goles [home_goals][away_goals] */
  goalMatrix: number[][];
  /** Lambda home efectivo combinado */
  lambdaHome: number;
  /** Lambda away efectivo combinado */
  lambdaAway: number;
}

// ---------------------------------------------------------------------------
// Resultado canónico persistido en Firestore
// ---------------------------------------------------------------------------

export interface PredictionResult {
  /** analyses/{analysisId} */
  analysisId: string;
  matchId: string;
  market: SupportedMarket;
  selection: MarketSelection;
  /** Probabilidad del modelo [0, 1] */
  probability: number;
  /** Cuota justa = 1 / probability */
  fairOdds: number;
  /** Probabilidad implícita simple de la cuota de mercado (sin corrección de margen) */
  impliedProbabilityRaw?: number;
  /**
   * Probabilidad implícita ajustada por margen (método Jullien-Pastine).
   * Divide cada prob implícita por el overround total del mercado.
   * Más correcta que la simple, especialmente en mercados 1X2 (3 outcomes).
   */
  impliedProbabilityMarginAdj?: number;
  /**
   * edge = modelProbability - impliedProbabilityMarginAdj
   * Positivo = la cuota de mercado subestima la probabilidad real del modelo.
   */
  edge?: number;
  /**
   * EV = modelProbability * marketOdds - 1
   * > 0 = apuesta con valor esperado positivo según el modelo.
   */
  expectedValue?: number;
  /** Cuota de mercado usada para el cálculo (puede ser null si no hay cuotas) */
  marketOdds?: number;
  /** Versión del motor que generó este análisis */
  modelVersion: string;
  /** Calidad global del dato */
  dataQuality: DataQuality;
  /** Categoría de señal (NO garantía) */
  category: PredictionCategory;
  /** Factores individuales con metadatos */
  factors: PredictionFactor[];
  /** Salidas por modelo individual */
  modelOutputs: ModelOutput[];
  /** Inputs snapshot (para backtesting posterior sin leakage) */
  inputSnapshot: MatchInputData;
  /**
   * Si está presente, el análisis fue descartado.
   * No se debe mostrar como recomendación cuando discardReason existe.
   */
  discardReason?: string;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Razones de descarte
// ---------------------------------------------------------------------------

export const DISCARD_REASONS = {
  CANCELLED_MATCH: 'Partido cancelado o aplazado',
  INSUFFICIENT_DATA: 'Datos insuficientes para generar una estimación confiable',
  STALE_ODDS: 'Cuotas de mercado desactualizadas (> 12h antes del partido)',
  UNSUPPORTED_MARKET: 'Mercado no soportado',
  INCONSISTENT_SOURCES: 'Fuentes de datos inconsistentes (diferencia entre modelos > 35%)',
  EXTREME_PROBABILITY: 'Probabilidad fuera de rango confiable (< 3% o > 97%) con calidad baja',
  NO_MATCH_DATA: 'No se encontraron datos del partido'
} as const;

// ---------------------------------------------------------------------------
// Pesos del modelo (configurables, default v1.0)
// ---------------------------------------------------------------------------

export interface ModelWeights {
  poisson: number;
  xg: number;
  form: number;
  homeAway: number;
}

export const DEFAULT_MODEL_WEIGHTS: ModelWeights = {
  poisson: 0.50,
  xg: 0.30,
  form: 0.15,
  homeAway: 0.05
};

/** Pesos cuando xG NO está disponible */
export const WEIGHTS_NO_XG: ModelWeights = {
  poisson: 0.65,
  xg: 0.00,
  form: 0.25,
  homeAway: 0.10
};

/** Pesos cuando xG Y forma histórica son limitados */
export const WEIGHTS_MINIMAL: ModelWeights = {
  poisson: 0.80,
  xg: 0.00,
  form: 0.10,
  homeAway: 0.10
};

export const MODEL_VERSION = 'v1.0.0';
