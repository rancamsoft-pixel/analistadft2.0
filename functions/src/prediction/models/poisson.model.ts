/**
 * Modelo de Poisson para estimación de goles esperados.
 *
 * Referencia: Dixon & Coles (1997) — "Modelling Association Football Scores
 * and Inefficiencies in the Football Betting Market".
 *
 * La distribución de Poisson modela el número de eventos (goles) en un
 * intervalo de tiempo fijo, asumiendo independencia entre los dos equipos.
 *
 * IMPORTANTE: Este modelo produce λ (goles esperados). Las probabilidades
 * de mercado se calculan DESPUÉS en market.calculator.ts.
 */

import { PredictionFactor, TeamFormData } from '../prediction.interface.js';

// Tamaño máximo de la matriz de goles (0..MAX_GOALS inclusive)
const MAX_GOALS = 8;

// Mínimo de partidos para considerar estadística confiable
const MIN_MATCHES_RELIABLE = 5;

// ---------------------------------------------------------------------------
// Factoriales precalculados para eficiencia (0! .. 8!)
// ---------------------------------------------------------------------------
const FACTORIALS: number[] = [1, 1, 2, 6, 24, 120, 720, 5040, 40320];

/**
 * P(X = k | λ) bajo la distribución de Poisson.
 * P(X = k) = e^(-λ) * λ^k / k!
 */
export function poissonPMF(lambda: number, k: number): number {
  if (k < 0 || k > MAX_GOALS || lambda <= 0) return 0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / FACTORIALS[k];
}

/**
 * Genera la matriz de probabilidades conjuntas de goles.
 * goalMatrix[i][j] = P(home = i AND away = j)
 * Asume independencia entre goles locales y visitantes.
 */
export function buildGoalMatrix(lambdaHome: number, lambdaAway: number): number[][] {
  const matrix: number[][] = [];

  for (let i = 0; i <= MAX_GOALS; i++) {
    matrix[i] = [];
    for (let j = 0; j <= MAX_GOALS; j++) {
      matrix[i][j] = poissonPMF(lambdaHome, i) * poissonPMF(lambdaAway, j);
    }
  }

  return matrix;
}

// ---------------------------------------------------------------------------
// Estimación de λ a partir de estadísticas de forma
// ---------------------------------------------------------------------------

export interface PoissonLambdaResult {
  lambdaHome: number;
  lambdaAway: number;
  factors: PredictionFactor[];
  matchesUsed: number;
}

/**
 * Estima los goles esperados usando el modelo Dixon-Coles simplificado:
 *
 *   λ_home = attackHome * defenseAway * leagueAvgHome
 *   λ_away = attackAway * defenseHome * leagueAvgAway
 *
 * Donde:
 *   attackHome   = media goles marcados por el local en sus últimos partidos en casa
 *   defenseAway  = media goles recibidos por el visitante en sus últimos partidos fuera
 *   leagueAvgHome= media global de goles en casa en la liga (aproximación: 1.35)
 *   leagueAvgAway= media global de goles fuera en la liga (aproximación: 1.10)
 */
export function estimatePoissonLambdas(
  homeForm: TeamFormData | undefined,
  awayForm: TeamFormData | undefined
): PoissonLambdaResult {
  // Promedios de goles de referencia de ligas europeas top
  const LEAGUE_AVG_HOME = 1.35;
  const LEAGUE_AVG_AWAY = 1.10;

  const factors: PredictionFactor[] = [];
  const homeMatchCount = homeForm?.matchCount ?? 0;
  const awayMatchCount = awayForm?.matchCount ?? 0;
  const totalMatches = Math.min(homeMatchCount, awayMatchCount);

  // ---- Ataque local -------------------------------------------------------
  let attackHome = LEAGUE_AVG_HOME;
  let attackHomeQuality: PredictionFactor['quality'] = 'INSUFFICIENT';
  if (homeForm && homeForm.goalsScored.length > 0) {
    const scored = homeForm.goalsScored.slice(0, 10);
    attackHome = scored.reduce((a, b) => a + b, 0) / scored.length;
    attackHomeQuality = scored.length >= MIN_MATCHES_RELIABLE ? 'HIGH' : 'LOW';
  }

  factors.push({
    name: 'home_attack_strength',
    value: attackHome,
    weight: 0.30,
    source: homeForm ? 'api-football' : 'derived',
    quality: attackHomeQuality,
    available: !!homeForm,
    note: !homeForm ? 'Usando promedio de liga por defecto' : undefined
  });

  // ---- Defensa visitante --------------------------------------------------
  let defenseAway = LEAGUE_AVG_HOME; // Cuánto concede el visitante = cuánto marca el local
  let defenseAwayQuality: PredictionFactor['quality'] = 'INSUFFICIENT';
  if (awayForm && awayForm.goalsConceded.length > 0) {
    const conceded = awayForm.goalsConceded.slice(0, 10);
    defenseAway = conceded.reduce((a, b) => a + b, 0) / conceded.length;
    defenseAwayQuality = conceded.length >= MIN_MATCHES_RELIABLE ? 'HIGH' : 'LOW';
  }

  factors.push({
    name: 'away_defense_weakness',
    value: defenseAway,
    weight: 0.30,
    source: awayForm ? 'api-football' : 'derived',
    quality: defenseAwayQuality,
    available: !!awayForm,
    note: !awayForm ? 'Usando promedio de liga por defecto' : undefined
  });

  // ---- Ataque visitante --------------------------------------------------
  let attackAway = LEAGUE_AVG_AWAY;
  let attackAwayQuality: PredictionFactor['quality'] = 'INSUFFICIENT';
  if (awayForm && awayForm.goalsScored.length > 0) {
    const scored = awayForm.goalsScored.slice(0, 10);
    attackAway = scored.reduce((a, b) => a + b, 0) / scored.length;
    attackAwayQuality = scored.length >= MIN_MATCHES_RELIABLE ? 'HIGH' : 'LOW';
  }

  factors.push({
    name: 'away_attack_strength',
    value: attackAway,
    weight: 0.25,
    source: awayForm ? 'api-football' : 'derived',
    quality: attackAwayQuality,
    available: !!awayForm
  });

  // ---- Defensa local -----------------------------------------------------
  let defenseHome = LEAGUE_AVG_AWAY;
  let defenseHomeQuality: PredictionFactor['quality'] = 'INSUFFICIENT';
  if (homeForm && homeForm.goalsConceded.length > 0) {
    const conceded = homeForm.goalsConceded.slice(0, 10);
    defenseHome = conceded.reduce((a, b) => a + b, 0) / conceded.length;
    defenseHomeQuality = conceded.length >= MIN_MATCHES_RELIABLE ? 'HIGH' : 'LOW';
  }

  factors.push({
    name: 'home_defense_strength',
    value: defenseHome,
    weight: 0.15,
    source: homeForm ? 'api-football' : 'derived',
    quality: defenseHomeQuality,
    available: !!homeForm
  });

  // ---- Cálculo Dixon-Coles -----------------------------------------------
  //
  // attackStrength = media_equipo / media_liga
  // defenseStrength = media_equipo / media_liga
  //
  // λ_home = attackStrength_home * defenseStrength_away * leagueAvgHome
  // λ_away = attackStrength_away * defenseStrength_home * leagueAvgAway
  //
  const attackStrengthHome = attackHome / LEAGUE_AVG_HOME;
  const defenseStrengthAway = defenseAway / LEAGUE_AVG_HOME;
  const attackStrengthAway = attackAway / LEAGUE_AVG_AWAY;
  const defenseStrengthHome = defenseHome / LEAGUE_AVG_AWAY;

  let lambdaHome = attackStrengthHome * defenseStrengthAway * LEAGUE_AVG_HOME;
  let lambdaAway = attackStrengthAway * defenseStrengthHome * LEAGUE_AVG_AWAY;

  // Clamping: λ entre 0.1 y 5.0 (valores fuera de este rango son datos anómalos)
  lambdaHome = Math.max(0.1, Math.min(5.0, lambdaHome));
  lambdaAway = Math.max(0.1, Math.min(5.0, lambdaAway));

  return { lambdaHome, lambdaAway, factors, matchesUsed: totalMatches };
}
