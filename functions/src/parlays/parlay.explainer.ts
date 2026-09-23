/**
 * Explicador Contextual de Finalistas con Gemini.
 *
 * Contrato:
 * - Se envían a Gemini ÚNICAMENTE los finalistas seleccionados por el algoritmo.
 * - No inventa datos, cuotas ni probabilidades.
 * - Prohibición estricta de lenguaje de certeza ("seguro", "garantizado", "infalible").
 * - Explica la coherencia deportiva y táctica de la combinada y sus riesgos de correlación.
 * - Fallback seguro si la API de Gemini falla o está en modo mock.
 */

import { ParlayCandidate, ParlayExplanation } from './parlay.interface.js';
import { config } from '../config/index.js';
import { StructuredLogger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const logger = new StructuredLogger('ParlayExplainer');

const PROHIBITED_WORDS = [
  'apuesta segura',
  '100% seguro',
  'garantizado',
  'infalible',
  'definitivamente ganará',
  'certeza absoluta',
  'fácil de ganar'
];

export class ParlayExplainer {
  /**
   * Genera explicaciones para los candidatos finalistas
   */
  static async explainFinalist(
    candidate: ParlayCandidate,
    categoryName: string
  ): Promise<ParlayExplanation> {
    if (config.isMockMode || !config.apiKeys.gemini) {
      return this.generateMockExplanation(candidate, categoryName);
    }

    try {
      return await this.callGeminiForExplanation(candidate, categoryName);
    } catch (error) {
      logger.warn(`Error llamando a Gemini para explicar parlay (${categoryName}), usando fallback mock`, {
        error: (error as Error).message
      });
      return this.generateMockExplanation(candidate, categoryName);
    }
  }

  /**
   * Fallback heurístico mock (rápido, determinista y seguro)
   */
  private static generateMockExplanation(
    candidate: ParlayCandidate,
    categoryName: string
  ): ParlayExplanation {
    const legsCount = candidate.selections.length;
    const matchNames = candidate.selections.map(s => s.matchDescription).join(', ');
    const hasCorrelation = candidate.correlationRisk !== 'NONE';

    const keyFactors: string[] = candidate.selections.map(s => {
      const edgeTxt = s.edge ? ` (Edge: +${(s.edge * 100).toFixed(1)}%)` : '';
      return `${s.selectionName} en ${s.matchDescription} [Cuota ${s.odds.toFixed(2)}]${edgeTxt}`;
    });

    const riskFactors: string[] = [];
    if (hasCorrelation) {
      riskFactors.push(...candidate.correlationNotes);
    }
    if (candidate.combinedOdds > 4.0) {
      riskFactors.push(`Cuota combinada elevada (${candidate.combinedOdds}). Mayor volatilidad esperada.`);
    }
    if (legsCount > 3) {
      riskFactors.push(`Combinada de ${legsCount} selecciones: el margen de la casa se multiplica con cada evento.`);
    }
    if (riskFactors.length === 0) {
      riskFactors.push('La combinada depende del cumplimiento simultáneo de eventos independientes.');
    }

    return {
      summary: `${categoryName}: Combinación de ${legsCount} selecciones en ${matchNames} con cuota global de ${candidate.combinedOdds.toFixed(2)}.`,
      justification: `Selecciones sustentadas por el motor estadístico con calidad de datos ${candidate.dataQuality}. Probabilidad de referencia aproximada del ${(candidate.estimatedProbability * 100).toFixed(1)}% y expectativa matemática de ${candidate.estimatedEV >= 0 ? '+' : ''}${candidate.estimatedEV}%.`,
      keyFactors,
      riskFactors,
      provider: 'mock',
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Llamada a Gemini con prompt controlado
   */
  private static async callGeminiForExplanation(
    candidate: ParlayCandidate,
    categoryName: string
  ): Promise<ParlayExplanation> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.apiKeys.gemini}`;

    const promptPayload = {
      category: categoryName,
      combinedOdds: candidate.combinedOdds,
      estimatedEV: candidate.estimatedEV,
      dataQuality: candidate.dataQuality,
      correlationRisk: candidate.correlationRisk,
      correlationNotes: candidate.correlationNotes,
      selections: candidate.selections.map(s => ({
        match: s.matchDescription,
        market: s.market,
        selection: s.selectionName,
        odds: s.odds,
        modelProb: `${(s.probability * 100).toFixed(1)}%`,
        edge: s.edge ? `${(s.edge * 100).toFixed(1)}%` : undefined,
        bookmaker: s.bookmaker
      }))
    };

    const systemInstruction = `Eres un analista deportivo cuantitativo profesional.
Tu tarea es explicar la lógica deportiva y los riesgos de una combinación de apuestas múltiples (parlay) pre-seleccionada por un motor estadístico.

REGLAS ESTRICTAS:
1. NUNCA uses lenguaje de certeza ("seguro", "garantizado", "infalible", "apuesta fija").
2. No inventes cuotas ni estadísticas que no aparezcan en el JSON suministrado.
3. Si hay notas de correlación en los datos, explícalas con claridad.
4. Responde estrictamente con un JSON que cumpla el esquema:
{
  "summary": "Resumen conciso en 1-2 oraciones",
  "justification": "Explicación táctica y estadística de por qué se combinan estos eventos",
  "keyFactors": ["factor 1", "factor 2"],
  "riskFactors": ["riesgo 1", "riesgo 2"]
}`;

    const body = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: `Analiza esta combinación finalista:\n${JSON.stringify(promptPayload, null, 2)}` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    };

    const response = await withRetry(async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        throw new Error(`Gemini HTTP error ${res.status}: ${await res.text()}`);
      }
      return res.json() as Promise<any>;
    }, { maxRetries: 2, initialDelayMs: 1200 });

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Respuesta vacía de Gemini');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`JSON no válido recibido de Gemini: ${text.slice(0, 100)}`);
    }

    // Sanitizar lenguaje no permitido
    const sanitize = (str: string) => {
      let s = str || '';
      for (const w of PROHIBITED_WORDS) {
        s = s.replace(new RegExp(w, 'gi'), '[término no permitido]');
      }
      return s;
    };

    return {
      summary: sanitize(parsed.summary || `Análisis de ${categoryName}`),
      justification: sanitize(parsed.justification || ''),
      keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors.map(sanitize) : [],
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors.map(sanitize) : [],
      provider: 'gemini',
      generatedAt: new Date().toISOString()
    };
  }
}
