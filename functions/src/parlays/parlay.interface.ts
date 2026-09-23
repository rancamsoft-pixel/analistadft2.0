/**
 * Contratos y tipos canónicos del Motor de Parlays.
 *
 * El motor combina automáticamente selecciones previas del motor estadístico,
 * evalúa correlaciones (intra-partido y entre mercados), calcula métricas matemáticas,
 * aplica ranking multicriterio y produce candidatos finalistas para cada usuario.
 */

import { DataQuality, SupportedMarket, MarketSelection } from '../prediction/prediction.interface.js';

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

/**
 * Parámetros máximos iniciales por tipo de parlay
 */
export const PARLAY_LIMITS: Record<ParlayType, { minSelections: number; maxSelections: number }> = {
  HIGH_PROBABILITY_PARLAY: { minSelections: 2, maxSelections: 3 },
  VALUE_PARLAY: { minSelections: 2, maxSelections: 4 },
  BALANCED_PARLAY: { minSelections: 2, maxSelections: 3 }
};

/**
 * Cada selección evaluada que conforma un parlay
 */
export interface ParlaySelection {
  matchId: string;
  matchDescription: string;
  competitionId: string;
  competitionName?: string;
  utcDate: string;
  market: SupportedMarket;
  selection: MarketSelection;
  selectionName: string;
  probability: number; // [0, 1] estimada por el modelo estadístico
  odds: number; // Cuota de mercado de la casa
  bookmaker: string;
  bookmakerId: string;
  edge?: number; // edge del modelo vs cuota
  expectedValue?: number; // EV porcentual
  dataQuality: DataQuality;
}

/**
 * Evaluación de correlación entre dos o más selecciones
 */
export interface CorrelationEvaluation {
  hasCorrelation: boolean;
  correlationRisk: CorrelationRisk;
  correlationPenalty: number; // Factor de penalización para el score [0, 1]
  isExcluded: boolean; // Si es inválido (contradicción o > 2 selecciones mismo partido)
  excludeReason?: string;
  notes: string[];
}

/**
 * Candidato intermedio generado antes de seleccionar finalistas
 */
export interface ParlayCandidate {
  type: ParlayType;
  selections: ParlaySelection[];
  combinedOdds: number;
  estimatedProbability: number; // Referencia aproximada (asumiendo independencia)
  estimatedEV: number;
  dataQuality: DataQuality;
  correlationRisk: CorrelationRisk;
  correlationNotes: string[];
  correlationPenalty: number;
  marketStabilityScore: number;
  rankingScore: number;
}

/**
 * Explicación táctica y contextual generada por Gemini
 */
export interface ParlayExplanation {
  summary: string;
  justification: string;
  keyFactors: string[];
  riskFactors: string[];
  provider: 'gemini' | 'mock';
  generatedAt: string;
}

/**
 * Documento persistido en Firestore: parlays/{parlayId}
 */
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
  dataQuality: DataQuality;
  modelVersion: string;
  generatedAt: string;
  status: 'ACTIVE' | 'WON' | 'LOST' | 'VOID' | 'PENDING';
  correlationRisk: CorrelationRisk;
  correlationNotes: string[];
  rankingScore: number;
  explanation?: ParlayExplanation;
}

/**
 * Preferencias activas del usuario para personalizar la generación
 */
export interface UserPreferencesContext {
  userId: string;
  activeCompetitionIds: string[];
  activeBookmakerIds: string[];
  activeMarketKeys?: string[];
  oddsFormat?: 'decimal' | 'american';
}
