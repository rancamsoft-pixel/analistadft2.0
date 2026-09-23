/**
 * Calculadora de mercados desde la matriz de goles Poisson.
 *
 * Todos los mercados se derivan de la misma distribución de probabilidades,
 * garantizando consistencia matemática entre mercados.
 *
 * IMPORTANTE: No se usan probabilidades de Gemini.
 * Las probabilidades son derivadas analíticamente de la matriz Poisson.
 */

import { SupportedMarket, MarketSelection } from '../prediction.interface.js';

const MAX_GOALS = 8;

// ---------------------------------------------------------------------------
// Tipo de resultado de cálculo de mercado
// ---------------------------------------------------------------------------

export interface MarketProbability {
  market: SupportedMarket;
  selection: MarketSelection;
  /** Probabilidad del modelo [0, 1] */
  probability: number;
  /** Cuota justa = 1 / probability */
  fairOdds: number;
  /** Línea si aplica (e.g. 2.5 para over/under) */
  line?: number;
}

// ---------------------------------------------------------------------------
// Probabilidades base 1X2 de la matriz
// ---------------------------------------------------------------------------

export function calc1X2Probabilities(goalMatrix: number[][]): {
  home: number;
  draw: number;
  away: number;
} {
  let home = 0;
  let draw = 0;
  let away = 0;

  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = goalMatrix[i]?.[j] ?? 0;
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
    }
  }

  // Normalización por probabilidad no cubierta en el truncamiento (goles > 8)
  const total = home + draw + away;
  if (total === 0) return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };

  return {
    home: home / total,
    draw: draw / total,
    away: away / total
  };
}

// ---------------------------------------------------------------------------
// 1X2
// ---------------------------------------------------------------------------

export function calc1X2Markets(goalMatrix: number[][]): MarketProbability[] {
  const { home, draw, away } = calc1X2Probabilities(goalMatrix);
  return [
    { market: '1X2', selection: 'home', probability: home, fairOdds: safeFairOdds(home) },
    { market: '1X2', selection: 'draw', probability: draw, fairOdds: safeFairOdds(draw) },
    { market: '1X2', selection: 'away', probability: away, fairOdds: safeFairOdds(away) }
  ];
}

// ---------------------------------------------------------------------------
// Doble Oportunidad (Double Chance)
// ---------------------------------------------------------------------------

export function calcDoubleChanceMarkets(goalMatrix: number[][]): MarketProbability[] {
  const { home, draw, away } = calc1X2Probabilities(goalMatrix);
  return [
    {
      market: 'double_chance',
      selection: 'home_draw',
      probability: clampProb(home + draw),
      fairOdds: safeFairOdds(clampProb(home + draw))
    },
    {
      market: 'double_chance',
      selection: 'home_away',
      probability: clampProb(home + away),
      fairOdds: safeFairOdds(clampProb(home + away))
    },
    {
      market: 'double_chance',
      selection: 'draw_away',
      probability: clampProb(draw + away),
      fairOdds: safeFairOdds(clampProb(draw + away))
    }
  ];
}

// ---------------------------------------------------------------------------
// Draw No Bet (DNB)
// ---------------------------------------------------------------------------

/**
 * En Draw No Bet el empate devuelve la apuesta → normalizar entre home y away.
 * P(home_dnb) = P(home) / (P(home) + P(away))
 * P(away_dnb) = P(away) / (P(home) + P(away))
 */
export function calcDrawNoBetMarkets(goalMatrix: number[][]): MarketProbability[] {
  const { home, away } = calc1X2Probabilities(goalMatrix);
  const total = home + away;
  if (total === 0) return [];

  const homeDNB = home / total;
  const awayDNB = away / total;

  return [
    {
      market: 'draw_no_bet',
      selection: 'home_dnb',
      probability: clampProb(homeDNB),
      fairOdds: safeFairOdds(clampProb(homeDNB))
    },
    {
      market: 'draw_no_bet',
      selection: 'away_dnb',
      probability: clampProb(awayDNB),
      fairOdds: safeFairOdds(clampProb(awayDNB))
    }
  ];
}

// ---------------------------------------------------------------------------
// Over/Under de goles totales
// ---------------------------------------------------------------------------

/**
 * P(total goles > line) = sum sobre goalMatrix donde i+j > line
 * P(total goles < line) = sum sobre goalMatrix donde i+j < line
 *
 * NOTA: Se usa joint probability de la matriz, no independencia falsa.
 */
export function calcOverUnderMarkets(goalMatrix: number[][]): MarketProbability[] {
  const lines = [0.5, 1.5, 2.5, 3.5, 4.5] as const;
  const results: MarketProbability[] = [];

  for (const line of lines) {
    let overProb = 0;
    let underProb = 0;

    for (let i = 0; i <= MAX_GOALS; i++) {
      for (let j = 0; j <= MAX_GOALS; j++) {
        const totalGoals = i + j;
        const p = goalMatrix[i]?.[j] ?? 0;
        if (totalGoals > line) overProb += p;
        else underProb += p;
      }
    }

    const total = overProb + underProb;
    if (total > 0) {
      overProb /= total;
      underProb /= total;
    }

    // Over markets soportados
    const overKey = `over_${line}` as SupportedMarket;
    if (['over_0.5', 'over_1.5', 'over_2.5', 'over_3.5'].includes(overKey)) {
      results.push({
        market: overKey,
        selection: 'over',
        probability: clampProb(overProb),
        fairOdds: safeFairOdds(clampProb(overProb)),
        line
      });
    }

    // Under markets soportados
    const underKey = `under_${line}` as SupportedMarket;
    if (['under_2.5', 'under_3.5', 'under_4.5'].includes(underKey)) {
      results.push({
        market: underKey,
        selection: 'under',
        probability: clampProb(underProb),
        fairOdds: safeFairOdds(clampProb(underProb)),
        line
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// BTTS (Both Teams To Score)
// ---------------------------------------------------------------------------

/**
 * P(BTTS = yes) = P(home ≥ 1) * P(away ≥ 1)
 *
 * Asumiendo independencia de Poisson:
 *   P(home ≥ 1) = 1 - P(home = 0)  = 1 - e^(-λ_home)
 *   P(away ≥ 1) = 1 - P(away = 0)  = 1 - e^(-λ_away)
 *
 * Equivalente en la matriz: sum donde i >= 1 AND j >= 1
 */
export function calcBTTSMarkets(goalMatrix: number[][]): MarketProbability[] {
  let bttsYes = 0;

  for (let i = 1; i <= MAX_GOALS; i++) {
    for (let j = 1; j <= MAX_GOALS; j++) {
      bttsYes += goalMatrix[i]?.[j] ?? 0;
    }
  }

  // Normalizar
  let bttsNo = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      if (i === 0 || j === 0) bttsNo += goalMatrix[i]?.[j] ?? 0;
    }
  }

  const total = bttsYes + bttsNo;
  if (total > 0) {
    bttsYes /= total;
    bttsNo /= total;
  }

  return [
    {
      market: 'btts',
      selection: 'yes',
      probability: clampProb(bttsYes),
      fairOdds: safeFairOdds(clampProb(bttsYes))
    },
    {
      market: 'btts',
      selection: 'no',
      probability: clampProb(bttsNo),
      fairOdds: safeFairOdds(clampProb(bttsNo))
    }
  ];
}

// ---------------------------------------------------------------------------
// Calculadora completa de todos los mercados soportados
// ---------------------------------------------------------------------------

export function calculateAllMarkets(goalMatrix: number[][]): MarketProbability[] {
  return [
    ...calc1X2Markets(goalMatrix),
    ...calcDoubleChanceMarkets(goalMatrix),
    ...calcDrawNoBetMarkets(goalMatrix),
    ...calcOverUnderMarkets(goalMatrix),
    ...calcBTTSMarkets(goalMatrix)
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cuota justa con protección contra probabilidad cero */
function safeFairOdds(probability: number): number {
  if (probability <= 0) return 99.99;
  if (probability >= 1) return 1.001;
  return parseFloat((1 / probability).toFixed(3));
}

/** Asegura que la probabilidad esté en [0.01, 0.99] */
function clampProb(p: number): number {
  return Math.max(0.01, Math.min(0.99, p));
}
