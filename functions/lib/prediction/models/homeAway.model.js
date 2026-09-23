"use strict";
/**
 * Modelo de Ajuste Local/Visitante (Home/Away Advantage).
 *
 * La ventaja de jugar en casa es uno de los factores más robustos en fútbol.
 * Referencia: Clarke & Norman (1995) — "Home Ground Advantage of Individual Clubs".
 *
 * ESTRATEGIA:
 * 1. Si hay tasa de victorias en casa de la liga disponible (leagueHomeWinRate),
 *    se usa directamente para calibrar el ajuste.
 * 2. Si hay datos de forma diferenciados (casa vs. fuera), se comparan directamente.
 * 3. Si no hay datos suficientes, se aplica un ajuste conservador de referencia (0.10 λ).
 *
 * El modelo produce multiplicadores sobre λ_home y λ_away.
 * Rango restringido a [0.90, 1.25] para evitar distorsiones.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHomeAwayAdjustment = calculateHomeAwayAdjustment;
// Tasa de victorias en casa media de referencia en ligas europeas top
const LEAGUE_REFERENCE_HOME_WIN_RATE = 0.46;
// Ajuste lambda por diferencia relativa a la referencia
const HOME_ADVANTAGE_BASE_BOOST = 1.08; // +8% sobre λ local por defecto
const AWAY_ADVANTAGE_BASE_PENALTY = 0.92; // -8% sobre λ visitante por defecto
/**
 * Calcula el ajuste de ventaja local/visitante.
 */
function calculateHomeAwayAdjustment(input) {
    const factors = [];
    let homeMult = HOME_ADVANTAGE_BASE_BOOST;
    let awayMult = AWAY_ADVANTAGE_BASE_PENALTY;
    // ---- Factor 1: Tasa histórica de victorias en casa de la liga ---------
    if (input.leagueHomeWinRate !== undefined) {
        // Cuánto se desvía la liga de la referencia global
        const deviation = input.leagueHomeWinRate - LEAGUE_REFERENCE_HOME_WIN_RATE;
        // Cada punto porcentual de diferencia = 0.5% de ajuste en λ
        const adjustment = 1 + deviation * 0.5;
        homeMult *= Math.max(0.90, Math.min(1.25, adjustment));
        awayMult *= Math.max(0.90, Math.min(1.10, 2 - adjustment));
        factors.push({
            name: 'league_home_win_rate',
            value: input.leagueHomeWinRate,
            weight: 0.40,
            source: 'api-football',
            quality: 'HIGH',
            available: true,
            note: `Liga: ${(input.leagueHomeWinRate * 100).toFixed(1)}% victorias locales (ref: ${(LEAGUE_REFERENCE_HOME_WIN_RATE * 100).toFixed(1)}%)`
        });
    }
    else {
        factors.push({
            name: 'league_home_win_rate',
            value: LEAGUE_REFERENCE_HOME_WIN_RATE,
            weight: 0.40,
            source: 'derived',
            quality: 'LOW',
            available: false,
            note: 'Usando referencia global (no hay datos de liga)'
        });
    }
    // ---- Factor 2: Posición en clasificación ---------------------------------
    if (input.standings) {
        const standingFactor = calculateStandingFactor(input.standings);
        factors.push({
            name: 'standings_advantage',
            value: standingFactor,
            weight: 0.35,
            source: 'api-football',
            quality: 'MEDIUM',
            available: true
        });
        // El equipo en mejor posición tiene un pequeño boost
        // standingFactor > 1 = local está mejor posicionado → boost home
        homeMult *= Math.max(0.95, Math.min(1.10, standingFactor));
        awayMult *= Math.max(0.90, Math.min(1.05, 2 - standingFactor));
    }
    // ---- Factor 3: Descanso -------------------------------------------------
    if (input.homeRestDays !== undefined && input.awayRestDays !== undefined) {
        const restFactor = calculateRestFactor(input.homeRestDays, input.awayRestDays);
        factors.push({
            name: 'rest_advantage',
            value: restFactor,
            weight: 0.15,
            source: 'api-football',
            quality: 'MEDIUM',
            available: true,
            note: `Home: ${input.homeRestDays}d descanso, Away: ${input.awayRestDays}d descanso`
        });
        homeMult *= Math.max(0.95, Math.min(1.08, restFactor));
        awayMult *= Math.max(0.92, Math.min(1.05, 2 - restFactor));
    }
    // ---- Factor 4: Lesiones relevantes --------------------------------------
    if (input.injuries) {
        const injuryFactor = calculateInjuryFactor(input.injuries);
        factors.push({
            name: 'injury_impact',
            value: injuryFactor,
            weight: 0.10,
            source: 'injuries',
            quality: 'MEDIUM',
            available: true,
            note: `Home: ${input.injuries.homeInjuryCount} bajas (${input.injuries.homeKeyPlayersInjured} clave), Away: ${input.injuries.awayInjuryCount} bajas (${input.injuries.awayKeyPlayersInjured} clave)`
        });
        // injuryFactor < 1 = más lesiones en el local → penalización home
        homeMult *= Math.max(0.92, Math.min(1.05, injuryFactor));
        awayMult *= Math.max(0.95, Math.min(1.08, 2 - injuryFactor));
    }
    // ---- Factor 5: Alineación confirmada ------------------------------------
    if (input.lineupsAvailable) {
        factors.push({
            name: 'lineups_available',
            value: 1.0,
            weight: 0.05,
            source: 'lineups',
            quality: 'VERY_HIGH',
            available: true,
            note: 'Alineación confirmada (mejora calidad del dato pero no ajusta λ)'
        });
    }
    // Clamping final
    homeMult = Math.max(0.88, Math.min(1.22, homeMult));
    awayMult = Math.max(0.85, Math.min(1.12, awayMult));
    return { homeLambdaMultiplier: homeMult, awayLambdaMultiplier: awayMult, factors };
}
/**
 * Factor de posición en tabla: ratio entre la posición relativa del local vs. visitante.
 * Neutral = 1.0. > 1.0 = local mejor posicionado.
 */
function calculateStandingFactor(standings) {
    if (standings.totalTeams === 0)
        return 1.0;
    // Posición invertida: rank 1 = mejor → normalizar como (totalTeams - rank + 1) / totalTeams
    const homeStrength = (standings.totalTeams - standings.homeRank + 1) / standings.totalTeams;
    const awayStrength = (standings.totalTeams - standings.awayRank + 1) / standings.totalTeams;
    const total = homeStrength + awayStrength;
    if (total === 0)
        return 1.0;
    // Factor 1.0 = equilibrado, > 1.0 = local superior
    return 0.85 + (homeStrength / total) * 0.30;
}
/**
 * Factor de descanso: si el local tiene más descanso, tiene ventaja.
 * Neutral = 1.0. > 1.0 = local con más descanso.
 * Penalización aplicada cuando diferencia > 3 días (fatiga acumulada).
 */
function calculateRestFactor(homeRestDays, awayRestDays) {
    const diff = homeRestDays - awayRestDays;
    if (Math.abs(diff) < 1)
        return 1.0; // Sin diferencia significativa
    // Cada día de diferencia = ±1.5% de factor (máx ±5%)
    return Math.max(0.95, Math.min(1.05, 1.0 + diff * 0.015));
}
/**
 * Factor de lesiones: cuánto impacto relativo tienen las lesiones de cada equipo.
 * < 1.0 = más lesiones en el local, > 1.0 = más lesiones en el visitante.
 * Un jugador clave lesionado impacta más que un suplente.
 */
function calculateInjuryFactor(injuries) {
    const homeImpact = injuries.homeInjuryCount * 0.5 + injuries.homeKeyPlayersInjured * 1.5;
    const awayImpact = injuries.awayInjuryCount * 0.5 + injuries.awayKeyPlayersInjured * 1.5;
    const totalImpact = homeImpact + awayImpact;
    if (totalImpact === 0)
        return 1.0;
    // Factor < 1 = más impacto en local (perjudica al local)
    const relativeAwayImpact = awayImpact / totalImpact;
    return 0.92 + relativeAwayImpact * 0.16; // Rango [0.92, 1.08]
}
//# sourceMappingURL=homeAway.model.js.map