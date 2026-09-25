/**
 * ContextAnalysisService — Pipeline de Análisis Contextual con Gemini.
 *
 * FLUJO COMPLETO:
 * 1. Recibe lista de partidos candidatos (puede ser larga)
 * 2. Fase de filtrado: reduce a los más relevantes según criterios
 *    100 → 20 candidatos → 10 con suficiente info → 5-10 análisis Gemini
 * 3. Para cada candidato final: verifica caché por inputHash
 * 4. Si no hay caché o los inputs cambiaron: llama a Gemini
 * 5. Guarda resultado en Firestore: aiAnalyses/{analysisId}
 * 6. Si Gemini falla: el análisis estadístico sigue funcionando
 *
 * CACHE:
 * - Clave: SHA-256 del inputHash (matchId + fecha + hash del contenido)
 * - Si los inputs no cambiaron: no se vuelve a llamar Gemini
 * - TTL en cache en memoria: 30 minutos
 *
 * PRINCIPIO DE RESILIENCIA:
 * - El análisis estadístico NUNCA depende de que Gemini responda.
 * - Si Gemini falla, se registra el error y se continúa.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import {
  ContextAnalysisInput,
  ContextAnalysisOutput,
  ContextAnalysisProvider,
  ContextAnalysisRecord
} from '../providers/ai/context.interface.js';
import { GeminiContextProvider } from '../providers/ai/gemini.context.provider.js';
import { MockContextProvider } from '../providers/ai/mock.context.provider.js';
import { globalCache } from './cache.service.js';
import { StructuredLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { getColombiaTodayString } from '../utils/colombiaDate.js';

const logger = new StructuredLogger('ContextAnalysisService');

// ---------------------------------------------------------------------------
// Criterios de selección de candidatos
// ---------------------------------------------------------------------------

export interface MatchCandidate {
  matchId: string;
  score: number; // Puntuación de relevancia (mayor = más candidato)
  input: ContextAnalysisInput;
}

// ---------------------------------------------------------------------------
// ContextAnalysisService
// ---------------------------------------------------------------------------

export class ContextAnalysisService {
  private provider: ContextAnalysisProvider;
  private db: ReturnType<typeof getFirestore>;

  constructor(provider?: ContextAnalysisProvider) {
    if (provider) {
      this.provider = provider;
    } else if (config.isMockMode || !config.apiKeys.gemini) {
      this.provider = new MockContextProvider();
    } else {
      this.provider = new GeminiContextProvider(config.apiKeys.gemini, config.geminiModel);
    }
    this.db = getFirestore();
  }

  // ---------------------------------------------------------------------------
  // Pipeline principal: filtrar candidatos y analizar
  // ---------------------------------------------------------------------------

  /**
   * Filtra los partidos más relevantes de una lista completa y ejecuta
   * el análisis contextual de Gemini solo sobre los finalistas.
   *
   * @param candidates Lista de hasta 100 partidos con inputs
   * @param maxFinal   Máximo de análisis Gemini a ejecutar (default: 8)
   * @returns Mapa de matchId → ContextAnalysisOutput (null si falló)
   */
  async analyzeTopCandidates(
    candidates: ContextAnalysisInput[],
    maxFinal: number = 8
  ): Promise<Map<string, ContextAnalysisOutput | null>> {
    const results = new Map<string, ContextAnalysisOutput | null>();

    if (candidates.length === 0) {
      logger.info('Sin candidatos para análisis contextual');
      return results;
    }

    // Fase 1: Puntuar y ordenar candidatos (máx 100 → 20)
    const scored = this.scoreCandidates(candidates);
    const top20 = scored.slice(0, 20);
    logger.info(`Candidatos iniciales: ${candidates.length} → filtrados: ${top20.length}`);

    // Fase 2: Filtrar los que tienen suficiente información (20 → 10)
    const sufficient = top20.filter(c => this.hasSufficientData(c.input));
    const top10 = sufficient.slice(0, 10);
    logger.info(`Con suficiente información: ${top10.length}`);

    // Fase 3: Aplicar límite final (10 → 5-8 por costo)
    const finalCandidates = top10.slice(0, maxFinal);
    logger.info(`Candidatos finales para Gemini: ${finalCandidates.length}`);

    // Fase 4: Analizar con Gemini (con caché por hash)
    for (const candidate of finalCandidates) {
      const output = await this.analyzeWithCache(candidate.input);
      results.set(candidate.matchId, output);
    }

    return results;
  }

  /**
   * Analiza un partido específico directamente (sin filtrado de candidatos).
   */
  async analyzeSingleMatch(input: ContextAnalysisInput): Promise<ContextAnalysisOutput | null> {
    return this.analyzeWithCache(input);
  }

  // ---------------------------------------------------------------------------
  // Cache y Firestore
  // ---------------------------------------------------------------------------

  private async analyzeWithCache(input: ContextAnalysisInput): Promise<ContextAnalysisOutput | null> {
    const inputHash = this.computeInputHash(input);
    const cacheKey = `context:${input.matchId}:${inputHash}`;

    // Cache en memoria
    const cached = globalCache.get<ContextAnalysisOutput>(cacheKey);
    if (cached) {
      logger.info(`Cache hit para análisis contextual de ${input.matchId}`);
      return cached;
    }

    // Verificar Firestore por inputHash (los inputs no cambiaron)
    const stored = await this.findStoredByHash(input.matchId, inputHash);
    if (stored?.output) {
      logger.info(`Firestore hit para análisis contextual de ${input.matchId} (mismo inputHash)`);
      globalCache.set(cacheKey, stored.output, config.cache.analysisTtlSeconds);
      return stored.output;
    }

    // Llamar a Gemini (con manejo de errores)
    return this.executeAnalysis(input, inputHash, cacheKey);
  }

  private async executeAnalysis(
    input: ContextAnalysisInput,
    inputHash: string,
    cacheKey: string
  ): Promise<ContextAnalysisOutput | null> {
    const startMs = Date.now();
    const analysisId = `ctx_${input.matchId}_${getColombiaTodayString()}_${inputHash.slice(0, 8)}`;
    let output: ContextAnalysisOutput | null = null;
    let error: string | undefined;
    let wasRepaired = false;

    try {
      output = await this.provider.analyzeContext(input);
    } catch (err) {
      const errMsg = (err as Error).message;
      error = errMsg;
      logger.error(`Error en análisis contextual de ${input.matchId}. El motor estadístico continúa.`, err as Error);
      // IMPORTANTE: No lanzamos el error. El análisis estadístico sigue funcionando.
    }

    const durationMs = Date.now() - startMs;

    // Persistir en Firestore (siempre, incluso si hubo error)
    const record: ContextAnalysisRecord = {
      analysisId,
      matchId: input.matchId,
      inputHash,
      model: this.provider.isMock ? 'mock' : config.geminiModel,
      input,
      output,
      durationMs,
      error,
      wasRepaired,
      generatedAt: new Date().toISOString()
    };

    this.persistRecord(record).catch(e => {
      logger.error(`Error persistiendo registro de análisis contextual para ${input.matchId}`, e);
    });

    // Cache en memoria solo si hubo éxito
    if (output) {
      globalCache.set(cacheKey, output, config.cache.analysisTtlSeconds);
    }

    return output;
  }

  // ---------------------------------------------------------------------------
  // Puntuación de candidatos
  // ---------------------------------------------------------------------------

  /**
   * Puntúa cada candidato según relevancia para análisis contextual.
   * Mayor puntuación = más candidato a análisis Gemini.
   */
  private scoreCandidates(candidates: ContextAnalysisInput[]): MatchCandidate[] {
    return candidates
      .map(input => {
        let score = 0;

        // Importancia del partido
        switch (input.matchImportance) {
          case 'FINAL': score += 10; break;
          case 'SEMIFINAL': score += 8; break;
          case 'DERBY': score += 7; break;
          case 'RELEGATION': score += 6; break;
          case 'TOP4_RACE': score += 5; break;
          default: score += 1; break;
        }

        // Calidad del dato estadístico (los mejores primero)
        switch (input.statisticalProbabilities.dataQuality) {
          case 'VERY_HIGH': score += 4; break;
          case 'HIGH': score += 3; break;
          case 'MEDIUM': score += 2; break;
          case 'LOW': score += 1; break;
          default: break;
        }

        // Lesiones relevantes disponibles (hay contexto que analizar)
        if (input.homeInjuries && input.homeInjuries.length > 0) score += 2;
        if (input.awayInjuries && input.awayInjuries.length > 0) score += 2;

        // Noticias disponibles
        if (input.relevantNews && input.relevantNews.length > 0) score += 3;

        // H2H disponible
        if (input.h2hSummary) score += 1;

        // Descanso conocido (diferencia interesante)
        if (input.homeRestDays !== undefined && input.awayRestDays !== undefined) {
          const diff = Math.abs(input.homeRestDays - input.awayRestDays);
          if (diff >= 3) score += 2; // Diferencia significativa de descanso
        }

        // Partido próximo (menos de 48h)
        const hoursToMatch = (new Date(input.utcDate).getTime() - Date.now()) / 3600000;
        if (hoursToMatch >= 0 && hoursToMatch <= 48) score += 3;

        return { matchId: input.matchId, score, input };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Determina si un candidato tiene suficiente información para un análisis útil.
   * Sin información suficiente, Gemini no puede agregar valor real.
   */
  private hasSufficientData(input: ContextAnalysisInput): boolean {
    const hasForm =
      (input.homeRecentForm && input.homeRecentForm.length >= 3) ||
      (input.awayRecentForm && input.awayRecentForm.length >= 3);

    const hasStandings =
      input.homeStandingRank !== undefined || input.awayStandingRank !== undefined;

    const hasAnyContext =
      (input.relevantNews?.length ?? 0) > 0 ||
      (input.homeInjuries?.length ?? 0) > 0 ||
      (input.awayInjuries?.length ?? 0) > 0 ||
      !!input.h2hSummary;

    const dataQuality = input.statisticalProbabilities.dataQuality;
    const hasAcceptableQuality = ['VERY_HIGH', 'HIGH', 'MEDIUM'].includes(dataQuality);

    return !!(hasForm || hasStandings) && hasAcceptableQuality && hasAnyContext;
  }

  // ---------------------------------------------------------------------------
  // Hash de inputs
  // ---------------------------------------------------------------------------

  /**
   * Calcula un hash SHA-256 de los inputs para detectar si cambiaron.
   * Se excluyen campos que cambian con el tiempo sin cambiar el contenido real
   * (como timestamps de fetch).
   */
  computeInputHash(input: ContextAnalysisInput): string {
    const canonical = {
      matchId: input.matchId,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      utcDate: input.utcDate,
      homeRecentForm: input.homeRecentForm ?? [],
      awayRecentForm: input.awayRecentForm ?? [],
      homeInjuries: input.homeInjuries ?? [],
      awayInjuries: input.awayInjuries ?? [],
      homeStandingRank: input.homeStandingRank ?? null,
      awayStandingRank: input.awayStandingRank ?? null,
      homeRestDays: input.homeRestDays ?? null,
      awayRestDays: input.awayRestDays ?? null,
      newsUrls: input.relevantNews?.map(n => n.url).sort() ?? [],
      statsQuality: input.statisticalProbabilities.dataQuality,
      statsHome: input.statisticalProbabilities.home.toFixed(3),
      statsDraw: input.statisticalProbabilities.draw.toFixed(3),
      statsAway: input.statisticalProbabilities.away.toFixed(3)
    };
    return createHash('sha256')
      .update(JSON.stringify(canonical))
      .digest('hex');
  }

  // ---------------------------------------------------------------------------
  // Firestore
  // ---------------------------------------------------------------------------

  private async findStoredByHash(
    matchId: string,
    inputHash: string
  ): Promise<ContextAnalysisRecord | null> {
    try {
      const snap = await this.db
        .collection('aiAnalyses')
        .where('matchId', '==', matchId)
        .where('inputHash', '==', inputHash)
        .where('error', '==', null)
        .orderBy('generatedAt', 'desc')
        .limit(1)
        .get();

      if (snap.empty) return null;
      return snap.docs[0].data() as ContextAnalysisRecord;
    } catch {
      return null; // No bloquear por errores de Firestore
    }
  }

  private async persistRecord(record: ContextAnalysisRecord): Promise<void> {
    await this.db
      .collection('aiAnalyses')
      .doc(record.analysisId)
      .set({
        ...record,
        // Asegurar que el campo error sea null (no undefined) para que la query funcione
        error: record.error ?? null,
        wasRepaired: record.wasRepaired ?? false
      });
  }

  /**
   * Recupera análisis contextuales guardados para un partido.
   */
  async getStoredContextAnalyses(matchId: string): Promise<ContextAnalysisRecord[]> {
    try {
      const snap = await this.db
        .collection('aiAnalyses')
        .where('matchId', '==', matchId)
        .orderBy('generatedAt', 'desc')
        .limit(20)
        .get();
      return snap.docs.map(d => d.data() as ContextAnalysisRecord);
    } catch (error) {
      logger.error(`Error recuperando análisis contextuales para ${matchId}`, error as Error);
      return [];
    }
  }
}
