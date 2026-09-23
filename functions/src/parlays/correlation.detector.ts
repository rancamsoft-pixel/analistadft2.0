/**
 * Detector de Correlaciones y Conflictos en Selecciones de Parlay.
 *
 * Principio:
 * No asumir independencia de forma automática.
 *
 * Reglas:
 * 1. Exclusión estricta de selecciones mutuamente excluyentes o contradictorias.
 * 2. Máximo 2 selecciones del mismo partido inicialmente.
 * 3. Detección y penalización de correlaciones positivas intra-partido
 *    (ej. Over 2.5 + BTTS Yes, Favorito gana + Favorito -1.5).
 * 4. Marcado explícito de nivel de riesgo y notas de correlación.
 */

import { ParlaySelection, CorrelationEvaluation, CorrelationRisk } from './parlay.interface.js';

export class CorrelationDetector {
  /**
   * Evalúa la lista completa de selecciones que componen una combinación
   */
  static evaluate(selections: ParlaySelection[]): CorrelationEvaluation {
    if (selections.length <= 1) {
      return {
        hasCorrelation: false,
        correlationRisk: 'NONE',
        correlationPenalty: 0,
        isExcluded: false,
        notes: []
      };
    }

    const notes: string[] = [];
    let isExcluded = false;
    let excludeReason: string | undefined;
    let maxRisk: CorrelationRisk = 'NONE';
    let totalPenalty = 0;

    // 1. Agrupar por partido
    const byMatch = new Map<string, ParlaySelection[]>();
    for (const sel of selections) {
      const list = byMatch.get(sel.matchId) || [];
      list.push(sel);
      byMatch.set(sel.matchId, list);
    }

    // 2. Verificar límite de selecciones por partido (máx 2)
    for (const [matchId, matchSelections] of byMatch.entries()) {
      if (matchSelections.length > 2) {
        return {
          hasCorrelation: true,
          correlationRisk: 'HIGH',
          correlationPenalty: 1.0,
          isExcluded: true,
          excludeReason: `Excedido límite de selecciones en el mismo partido (${matchSelections[0]?.matchDescription || matchId}): máximo 2 permitidas.`,
          notes: [`Máximo 2 selecciones permitidas del mismo partido.`]
        };
      }

      // 3. Evaluar par del mismo partido si hay 2 selecciones
      if (matchSelections.length === 2) {
        const [a, b] = matchSelections;
        if (!a || !b) continue;

        const sameMatchEval = this.evaluateSameMatchPair(a, b);

        if (sameMatchEval.isExcluded) {
          return {
            hasCorrelation: true,
            correlationRisk: 'HIGH',
            correlationPenalty: 1.0,
            isExcluded: true,
            excludeReason: sameMatchEval.excludeReason,
            notes: sameMatchEval.notes
          };
        }

        if (sameMatchEval.hasCorrelation) {
          notes.push(...sameMatchEval.notes);
          totalPenalty += sameMatchEval.correlationPenalty;
          maxRisk = this.escalateRisk(maxRisk, sameMatchEval.correlationRisk);
        }
      }
    }

    // 4. Evaluar duplicados idénticos en cualquier parte de la lista
    for (let i = 0; i < selections.length; i++) {
      for (let j = i + 1; j < selections.length; j++) {
        const selA = selections[i]!;
        const selB = selections[j]!;

        if (selA.matchId === selB.matchId && selA.market === selB.market && selA.selection === selB.selection) {
          return {
            hasCorrelation: true,
            correlationRisk: 'HIGH',
            correlationPenalty: 1.0,
            isExcluded: true,
            excludeReason: `Selección duplicada detectada: ${selA.selectionName} para ${selA.matchDescription}`,
            notes: [`Selección duplicada: ${selA.selectionName}`]
          };
        }
      }
    }

    // Normalizar penalización a [0, 0.8]
    const finalPenalty = Math.min(0.8, totalPenalty);

    return {
      hasCorrelation: notes.length > 0,
      correlationRisk: maxRisk,
      correlationPenalty: finalPenalty,
      isExcluded,
      excludeReason,
      notes
    };
  }

  /**
   * Evalúa dos selecciones pertenecientes al mismo partido
   */
  private static evaluateSameMatchPair(
    a: ParlaySelection,
    b: ParlaySelection
  ): {
    isExcluded: boolean;
    excludeReason?: string;
    hasCorrelation: boolean;
    correlationRisk: CorrelationRisk;
    correlationPenalty: number;
    notes: string[];
  } {
    const notes: string[] = [];

    // --- REGLAS DE CONTRADICCIÓN / EXCLUSIÓN MUTUA ---

    // 1X2 opuestos (ej. Home vs Away, Home vs Draw, Away vs Draw)
    if (a.market === '1X2' && b.market === '1X2' && a.selection !== b.selection) {
      return {
        isExcluded: true,
        excludeReason: `Contradicción excluyente en 1X2: ${a.selectionName} y ${b.selectionName}`,
        hasCorrelation: true,
        correlationRisk: 'HIGH',
        correlationPenalty: 1.0,
        notes: [`Selecciones mutuamente excluyentes en 1X2`]
      };
    }

    // Over vs Under en totales
    const isTotA = a.market.startsWith('over_') || a.market.startsWith('under_');
    const isTotB = b.market.startsWith('over_') || b.market.startsWith('under_');
    if (isTotA && isTotB) {
      if (
        (a.market.startsWith('over_') && b.market.startsWith('under_')) ||
        (a.market.startsWith('under_') && b.market.startsWith('over_'))
      ) {
        return {
          isExcluded: true,
          excludeReason: `Conflicto de totales contradictorios: ${a.market} y ${b.market}`,
          hasCorrelation: true,
          correlationRisk: 'HIGH',
          correlationPenalty: 1.0,
          notes: [`Conflicto entre Más y Menos goles en el mismo encuentro`]
        };
      }
    }

    // BTTS Yes vs BTTS No
    if (a.market === 'btts' && b.market === 'btts' && a.selection !== b.selection) {
      return {
        isExcluded: true,
        excludeReason: `Contradicción en Ambos Equipos Anotan: Sí vs No`,
        hasCorrelation: true,
        correlationRisk: 'HIGH',
        correlationPenalty: 1.0,
        notes: [`Contradicción directa en Ambos Equipos Anotan`]
      };
    }

    // Under 2.5 y BTTS Yes (restringido a 1-1)
    if (
      (a.market === 'btts' && a.selection === 'yes' && b.market === 'under_2.5' && b.selection === 'under') ||
      (b.market === 'btts' && b.selection === 'yes' && a.market === 'under_2.5' && a.selection === 'under')
    ) {
      // Under 2.5 + BTTS Yes solo tiene 1 marcador posible: 1-1. Muy restrictivo.
      notes.push(
        `Correlación restrictiva: Menos de 2.5 y Ambos Equipos Anotan (Sí) solo permite un resultado (1-1). Cuota altamente dependiente.`
      );
      return {
        isExcluded: false,
        hasCorrelation: true,
        correlationRisk: 'HIGH',
        correlationPenalty: 0.35,
        notes
      };
    }

    // --- REGLAS DE CORRELACIÓN POSITIVA FUERTE ---

    // 1. Over 2.5 + BTTS Yes (Fuerte correlación positiva)
    const hasOver25 = (a.market === 'over_2.5' && a.selection === 'over') || (b.market === 'over_2.5' && b.selection === 'over');
    const hasBttsYes = (a.market === 'btts' && a.selection === 'yes') || (b.market === 'btts' && b.selection === 'yes');

    if (hasOver25 && hasBttsYes) {
      notes.push(
        `Correlación intra-partido positiva: Más de 2.5 Goles y Ambos Equipos Anotan (Sí) dependen del mismo flujo ofensivo. Las casas suelen ajustar cuotas en combinadas del mismo evento.`
      );
      return {
        isExcluded: false,
        hasCorrelation: true,
        correlationRisk: 'HIGH',
        correlationPenalty: 0.30,
        notes
      };
    }

    // 2. Under 2.5 + BTTS No (Fuerte correlación positiva)
    const hasUnder25 = (a.market === 'under_2.5' && a.selection === 'under') || (b.market === 'under_2.5' && b.selection === 'under');
    const hasBttsNo = (a.market === 'btts' && a.selection === 'no') || (b.market === 'btts' && b.selection === 'no');

    if (hasUnder25 && hasBttsNo) {
      notes.push(
        `Correlación intra-partido positiva: Menos de 2.5 Goles y Ambos Equipos NO Anotan (5 de los 6 marcadores under coinciden con BTTS No).`
      );
      return {
        isExcluded: false,
        hasCorrelation: true,
        correlationRisk: 'HIGH',
        correlationPenalty: 0.28,
        notes
      };
    }

    // 3. Favorito gana (1X2) + Over 2.5 o Spreads correlacionados
    const is1X2 = a.market === '1X2' || b.market === '1X2';
    const isSpreadOrTotal = isTotA || isTotB || a.market === 'double_chance' || b.market === 'double_chance';

    // Redundancia: 1X2 Home + Doble Oportunidad 1X (subsumida)
    if (
      (a.market === '1X2' && a.selection === 'home' && b.market === 'double_chance' && b.selection === 'home_draw') ||
      (b.market === '1X2' && b.selection === 'home' && a.market === 'double_chance' && a.selection === 'home_draw')
    ) {
      return {
        isExcluded: true,
        excludeReason: `Selección redundante/subsumida: Ganador Local y Doble Oportunidad Local/Empate en el mismo partido.`,
        hasCorrelation: true,
        correlationRisk: 'HIGH',
        correlationPenalty: 1.0,
        notes: [`Selección redundante en el mismo partido`]
      };
    }

    // Redundancia: 1X2 + Draw No Bet del mismo equipo
    if (
      (a.market === '1X2' && a.selection === 'home' && b.market === 'draw_no_bet' && b.selection === 'home_dnb') ||
      (b.market === '1X2' && b.selection === 'home' && a.market === 'draw_no_bet' && a.selection === 'home_dnb')
    ) {
      return {
        isExcluded: true,
        excludeReason: `Selección redundante: Ganador Local y Empate Apuesta No Válida (Local) en el mismo partido.`,
        hasCorrelation: true,
        correlationRisk: 'HIGH',
        correlationPenalty: 1.0,
        notes: [`Selección redundante 1X2 y DNB`]
      };
    }

    // 4. Victoria con cuota baja / favorito + Over 2.5
    if (is1X2 && isSpreadOrTotal) {
      notes.push(
        `Correlación intra-partido moderada: Victoria de equipo y mercado de totales en el mismo partido (${a.matchDescription}).`
      );
      return {
        isExcluded: false,
        hasCorrelation: true,
        correlationRisk: 'MEDIUM',
        correlationPenalty: 0.15,
        notes
      };
    }

    // Caso general de selecciones distintas en el mismo partido
    notes.push(
      `Múltiples selecciones en el mismo partido (${a.matchDescription}). Riesgo de correlación bajo-moderado.`
    );
    return {
      isExcluded: false,
      hasCorrelation: true,
      correlationRisk: 'LOW',
      correlationPenalty: 0.10,
      notes
    };
  }

  private static escalateRisk(current: CorrelationRisk, candidate: CorrelationRisk): CorrelationRisk {
    const levels: Record<CorrelationRisk, number> = {
      NONE: 0,
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3
    };
    return levels[candidate] > levels[current] ? candidate : current;
  }
}
