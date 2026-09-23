/**
 * Tipos canónicos para el Análisis de Contexto por Gemini.
 *
 * CONTRATO FUNDAMENTAL:
 * - Gemini NO inventa cuotas, lesiones, estadísticas, resultados ni probabilidades.
 * - Gemini SOLO analiza información suministrada por nuestro backend.
 * - Gemini SOLO puede devolver un confidenceAdjustment dentro de {-2, -1, 0, 1, 2}.
 * - Gemini NO cambia directamente la probabilidad del motor estadístico.
 *
 * FLUJO:
 * PredictionEngine (probabilidad estadística)
 *   ↓
 * ContextAnalysisService (Gemini analiza contexto)
 *   ↓
 * confidenceAdjustment = señal de riesgo/confianza contextual
 *   ↓
 * El SISTEMA interpreta el ajuste (no Gemini)
 */

// ---------------------------------------------------------------------------
// Fuente de noticia con trazabilidad completa
// ---------------------------------------------------------------------------

export interface NewsSource {
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  /** Cuándo fue recuperada por nuestro sistema */
  retrievedAt: string;
}

// ---------------------------------------------------------------------------
// Input al analista de contexto
// ---------------------------------------------------------------------------

export interface ContextAnalysisInput {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  utcDate: string;

  // ---- Datos deportivos suministrados por el backend ----

  /** Forma reciente (e.g. ["W","D","L","W","W"]) */
  homeRecentForm?: string[];
  awayRecentForm?: string[];

  /** Lesiones disponibles (solo nombres y posición, sin diagnóstico médico) */
  homeInjuries?: Array<{ playerName: string; position: string; status: string }>;
  awayInjuries?: Array<{ playerName: string; position: string; status: string }>;

  /** Posición en tabla */
  homeStandingRank?: number;
  awayStandingRank?: number;
  totalTeamsInTable?: number;

  /** Días de descanso desde el último partido */
  homeRestDays?: number;
  awayRestDays?: number;

  /** Noticias relevantes (máx. 5, con fuente trazable) */
  relevantNews?: NewsSource[];

  /** Resumen H2H */
  h2hSummary?: string;

  /** Importancia del partido (definida por nuestro sistema, no por Gemini) */
  matchImportance?: 'FINAL' | 'SEMIFINAL' | 'DERBY' | 'RELEGATION' | 'TOP4_RACE' | 'REGULAR';

  /** Probabilidades del motor estadístico (Gemini ve esto como dato, no lo modifica) */
  statisticalProbabilities: {
    home: number;
    draw: number;
    away: number;
    dataQuality: string;
    modelVersion: string;
  };

  /** Cuotas de mercado (para que Gemini detecte posibles anomalías, NO para inventar) */
  marketOdds?: {
    home: number;
    draw: number;
    away: number;
    provider: string;
    fetchedAt: string;
  };
}

// ---------------------------------------------------------------------------
// Output del analista de contexto
// ---------------------------------------------------------------------------

/**
 * confidenceAdjustment: señal ordinal de riesgo/confianza.
 *
 * -2 → Riesgo contextual severo (lesiones clave confirmadas, calendario imposible, etc.)
 * -1 → Riesgo moderado (incertidumbre táctica, noticias negativas)
 *  0 → Sin ajuste contextual significativo
 * +1 → Factor contextual favorable (descanso superior, motivación alta)
 * +2 → Factor contextual muy favorable (local, pleno rendimiento, rival debilitado)
 *
 * IMPORTANTE: Este valor NO modifica la probabilidad del motor estadístico directamente.
 * El sistema lo interpreta como una señal de riesgo contextual.
 */
export type ConfidenceAdjustment = -2 | -1 | 0 | 1 | 2;

export interface ContextAnalysisOutput {
  /** Resumen narrativo breve del contexto */
  summary: string;
  /** Factores positivos para el partido (basados solo en datos suministrados) */
  positiveFactors: string[];
  /** Factores negativos o de riesgo */
  negativeFactors: string[];
  /** Riesgos específicos detectados */
  risks: string[];
  /** Noticias relevantes con fuente (solo las que el backend proporcionó) */
  relevantNews: NewsSource[];
  /** Calidad percibida de las fuentes disponibles */
  sourceQuality: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  /**
   * Contexto de la recomendación: texto neutral que acompaña el análisis.
   * NO es una recomendación de apuesta; describe el contexto competitivo.
   */
  recommendationContext: string;
  /**
   * Ajuste de confianza contextual.
   * SOLO dentro de {-2, -1, 0, 1, 2}.
   * Gemini NO puede devolver otro valor.
   */
  confidenceAdjustment: ConfidenceAdjustment;
  /** Cadena de razonamiento que justifica el confidenceAdjustment */
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Resultado completo guardado en Firestore: aiAnalyses/{analysisId}
// ---------------------------------------------------------------------------

export interface ContextAnalysisRecord {
  analysisId: string;
  matchId: string;
  /** Hash SHA-256 de los inputs (para detectar si los datos cambiaron y evitar re-llamadas) */
  inputHash: string;
  /** Modelo Gemini usado */
  model: string;
  /** Input completo (snapshot para auditoría) */
  input: ContextAnalysisInput;
  /** Output de Gemini (null si hubo error) */
  output: ContextAnalysisOutput | null;
  /** Tokens de entrada usados si la API los reporta */
  inputTokens?: number;
  /** Tokens de salida usados si la API los reporta */
  outputTokens?: number;
  /** Duración de la llamada en ms */
  durationMs: number;
  /** Error si hubo fallo */
  error?: string;
  /** Si el output fue reparado tras un intento de corrección */
  wasRepaired?: boolean;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Interfaz del proveedor de análisis contextual
// ---------------------------------------------------------------------------

export interface ContextAnalysisProvider {
  readonly providerName: string;
  readonly isMock: boolean;
  /**
   * Analiza el contexto de un partido.
   * NUNCA inventa datos. Solo razona sobre los inputs suministrados.
   */
  analyzeContext(input: ContextAnalysisInput): Promise<ContextAnalysisOutput>;
}

// ---------------------------------------------------------------------------
// Constantes de validación
// ---------------------------------------------------------------------------

/** Valores permitidos de confidenceAdjustment */
export const VALID_CONFIDENCE_ADJUSTMENTS: ConfidenceAdjustment[] = [-2, -1, 0, 1, 2];

/** Lenguaje prohibido (Gemini no debe usar estas expresiones) */
export const PROHIBITED_LANGUAGE = [
  'apuesta segura',
  '100% seguro',
  'garantizado',
  'certeza',
  'infalible',
  'seguro que',
  'definitivamente ganará',
  'no puede perder'
] as const;

/** Máximo de noticias que se pueden pasar como contexto */
export const MAX_NEWS_CONTEXT = 5;

/** Máximo de lesiones por equipo en el contexto */
export const MAX_INJURIES_CONTEXT = 8;
