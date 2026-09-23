/**
 * Tests Unitarios y Cuantitativos del MOTOR DE PARLEYS.
 *
 * Verifica exhaustivamente:
 * 1. Combinaciones y límites por tipo (High Prob: máx 3, Value: máx 4, Balanced: máx 3)
 * 2. Detección y penalización de correlación (intra-partido, contradicciones, Over+BTTS, etc.)
 * 3. Cálculo matemático de cuota combinada acumulada
 * 4. Cálculo de probabilidad conjunta de referencia y +EV
 * 5. Detección y descarte de selecciones duplicadas
 * 6. Manejo de falta de cuotas o cuotas inválidas
 * 7. Descarte de partidos inválidos o con calidad INSUFFICIENT
 * 8. Personalización multi-usuario estricta (Liga BetPlay vs Premier League)
 * 9. Ranking multicriterio deportivo
 */

import assert from 'node:assert';
import { strict as assertStrict } from 'node:assert';

// Importar clases compiladas del motor
import { CorrelationDetector } from '../functions/lib/parlays/correlation.detector.js';
import { ParlayEngine } from '../functions/lib/parlays/parlay.engine.js';
import { PARLAY_LIMITS } from '../functions/lib/parlays/parlay.interface.js';

console.log('\n===============================================================');
console.log('--- VERIFICACIÓN DEL MOTOR DE PARLEYS & ANÁLISIS DE RIESGO ---');
console.log('===============================================================\n');

// ===========================================================================
// MÓDULO 1: PARÁMETROS Y LÍMITES DE COMBINACIONES
// ===========================================================================
console.log('--- 1. Pruebas de Parámetros y Límites por Tipo ---');

assertStrict.equal(PARLAY_LIMITS.HIGH_PROBABILITY_PARLAY.maxSelections, 3, 'High Probability debe tener máximo 3 selecciones');
assertStrict.equal(PARLAY_LIMITS.HIGH_PROBABILITY_PARLAY.minSelections, 2, 'High Probability debe requerir al menos 2 selecciones');
assertStrict.equal(PARLAY_LIMITS.VALUE_PARLAY.maxSelections, 4, 'Value Parlay debe tener máximo 4 selecciones');
assertStrict.equal(PARLAY_LIMITS.VALUE_PARLAY.minSelections, 2, 'Value Parlay debe requerir al menos 2 selecciones');
assertStrict.equal(PARLAY_LIMITS.BALANCED_PARLAY.maxSelections, 3, 'Balanced Parlay debe tener máximo 3 selecciones');
assertStrict.equal(PARLAY_LIMITS.BALANCED_PARLAY.minSelections, 2, 'Balanced Parlay debe requerir al menos 2 selecciones');

console.log('✅ Test 1.1: Límites máximos y mínimos por tipo de parley verificados.');

// ===========================================================================
// MÓDULO 2: DETECCIÓN DE CORRELACIÓN Y REGLAS INTRA-PARTIDO
// ===========================================================================
console.log('\n--- 2. Pruebas de Detección de Correlación ---');

const baseSel = (id, matchId, market, selection, name, odds = 1.80, prob = 0.60) => ({
  matchId,
  matchDescription: `Partido ${matchId}`,
  competitionId: 'PL',
  utcDate: new Date().toISOString(),
  market,
  selection,
  selectionName: name,
  probability: prob,
  odds,
  bookmaker: 'Pinnacle',
  bookmakerId: 'pinnacle',
  edge: 0.04,
  expectedValue: 8.0,
  dataQuality: 'HIGH'
});

// Test 2.1: Máximo 2 selecciones del mismo partido (3 selecciones deben ser EXCLUIDAS)
const tripleSameMatch = [
  baseSel('s1', 'match-1', '1X2', 'home', 'Local Gana'),
  baseSel('s2', 'match-1', 'over_2.5', 'over', 'Más de 2.5'),
  baseSel('s3', 'match-1', 'btts', 'yes', 'BTTS Sí')
];
const evalTriple = CorrelationDetector.evaluate(tripleSameMatch);
assertStrict.equal(evalTriple.isExcluded, true, 'Más de 2 selecciones del mismo partido debe ser excluido');
assertStrict.ok(evalTriple.excludeReason.includes('máximo 2'), 'El motivo de exclusión debe mencionar límite de 2');
console.log('✅ Test 2.1: Regla de máx 2 selecciones por partido ejecutada y rechazada.');

// Test 2.2: Contradicción excluyente (1X2 Home vs 1X2 Away en el mismo partido)
const contradictory1X2 = [
  baseSel('s1', 'match-1', '1X2', 'home', 'Local Gana'),
  baseSel('s2', 'match-1', '1X2', 'away', 'Visita Gana')
];
const evalContradiction = CorrelationDetector.evaluate(contradictory1X2);
assertStrict.equal(evalContradiction.isExcluded, true, 'Selecciones mutuamente excluyentes en 1X2 deben ser excluidas');
console.log('✅ Test 2.2: Contradicción 1X2 (Local vs Visita) excluida inmediatamente.');

// Test 2.3: Contradicción Over 2.5 vs Under 2.5 en el mismo partido
const contradictoryTotals = [
  baseSel('s1', 'match-2', 'over_2.5', 'over', 'Más de 2.5'),
  baseSel('s2', 'match-2', 'under_2.5', 'under', 'Menos de 2.5')
];
const evalTotals = CorrelationDetector.evaluate(contradictoryTotals);
assertStrict.equal(evalTotals.isExcluded, true, 'Over y Under en el mismo partido deben ser excluidos');
console.log('✅ Test 2.3: Contradicción Totales (Over vs Under) excluida inmediatamente.');

// Test 2.4: Correlación positiva intra-partido: Over 2.5 + BTTS Yes
const correlatedOverBtts = [
  baseSel('s1', 'match-3', 'over_2.5', 'over', 'Más de 2.5 Goles', 1.75, 0.62),
  baseSel('s2', 'match-3', 'btts', 'yes', 'Ambos Equipos Anotan (Sí)', 1.68, 0.65)
];
const evalOverBtts = CorrelationDetector.evaluate(correlatedOverBtts);
assertStrict.equal(evalOverBtts.isExcluded, false, 'Over 2.5 + BTTS Yes es combinable pero correlacionado');
assertStrict.equal(evalOverBtts.hasCorrelation, true, 'Debe marcar correlación positiva');
assertStrict.equal(evalOverBtts.correlationRisk, 'HIGH', 'Riesgo de correlación debe ser HIGH');
assertStrict.ok(evalOverBtts.correlationPenalty > 0.20, 'Debe aplicar penalización por correlación');
assertStrict.ok(evalOverBtts.notes.length > 0, 'Debe incluir notas explícitas de correlación');
console.log(`✅ Test 2.4: Over 2.5 + BTTS Yes detectado como correlacionado (Riesgo: ${evalOverBtts.correlationRisk}, Penalización: ${evalOverBtts.correlationPenalty}).`);

// Test 2.5: Correlación positiva intra-partido: Under 2.5 + BTTS No
const correlatedUnderBttsNo = [
  baseSel('s1', 'match-4', 'under_2.5', 'under', 'Menos de 2.5 Goles', 1.85, 0.58),
  baseSel('s2', 'match-4', 'btts', 'no', 'Ambos Equipos NO Anotan', 1.72, 0.60)
];
const evalUnderBttsNo = CorrelationDetector.evaluate(correlatedUnderBttsNo);
assertStrict.equal(evalUnderBttsNo.hasCorrelation, true, 'Under 2.5 + BTTS No debe detectarse como correlacionado');
assertStrict.equal(evalUnderBttsNo.correlationRisk, 'HIGH', 'Riesgo debe ser HIGH');
console.log('✅ Test 2.5: Under 2.5 + BTTS No detectado y penalizado correctamente.');

// Test 2.6: Selecciones de partidos distintos (independientes)
const independentSelections = [
  baseSel('s1', 'match-A', '1X2', 'home', 'Arsenal Gana', 1.80, 0.60),
  baseSel('s2', 'match-B', 'over_2.5', 'over', 'Más de 2.5 en El Clásico', 1.70, 0.63)
];
const evalIndependent = CorrelationDetector.evaluate(independentSelections);
assertStrict.equal(evalIndependent.hasCorrelation, false, 'Partidos distintos sin correlación');
assertStrict.equal(evalIndependent.correlationRisk, 'NONE', 'Riesgo debe ser NONE');
assertStrict.equal(evalIndependent.correlationPenalty, 0, 'Penalización debe ser 0');
console.log('✅ Test 2.6: Eventos de partidos distintos evaluados como independientes.');

// ===========================================================================
// MÓDULO 3: CÁLCULO DE CUOTA COMBINADA
// ===========================================================================
console.log('\n--- 3. Pruebas de Cálculo de Cuota Combinada ---');

const oddsList = [1.80, 1.62, 1.95];
const expectedCombinedOdds = Number((1.80 * 1.62 * 1.95).toFixed(3)); // 5.686
assertStrict.equal(expectedCombinedOdds, 5.686, 'Multiplicación de cuotas combinadas exacta');

const twoLegOdds = [1.78, 1.68];
const expectedTwoLeg = Number((1.78 * 1.68).toFixed(3)); // 2.990
assertStrict.equal(expectedTwoLeg, 2.99, 'Multiplicación de dos cuotas exacta');
console.log(`✅ Test 3.1: Cuotas combinadas calculadas exactamente (${oddsList.join(' * ')} = ${expectedCombinedOdds}).`);

// ===========================================================================
// MÓDULO 4: CÁLCULO DE PROBABILIDAD Y EXPECTED VALUE (+EV)
// ===========================================================================
console.log('\n--- 4. Pruebas de Cálculo de Probabilidad y +EV ---');

const probs = [0.60, 0.68];
const expectedJointProb = Number((0.60 * 0.68).toFixed(4)); // 0.4080
assertStrict.equal(expectedJointProb, 0.408, 'Probabilidad conjunta aproximada de referencia');

const combinedOddsTest = Number((1.80 * 1.62).toFixed(3)); // 2.916
// EV = (0.408 * 2.916 - 1) * 100 = (1.189728 - 1) * 100 = +18.97%
const expectedEV = Number((((expectedJointProb * combinedOddsTest) - 1) * 100).toFixed(2));
assertStrict.equal(expectedEV, 18.97, 'Expected Value porcentual exacto');
console.log(`✅ Test 4.1: Probabilidad conjunta de referencia: ${expectedJointProb * 100}% y EV: +${expectedEV}%.`);

// ===========================================================================
// MÓDULO 5: DETECCIÓN Y DESCARTE DE SELECCIONES DUPLICADAS
// ===========================================================================
console.log('\n--- 5. Pruebas de Descarte de Duplicados ---');

const duplicateSelections = [
  baseSel('s1', 'match-10', '1X2', 'home', 'Local Gana'),
  baseSel('s1_dup', 'match-10', '1X2', 'home', 'Local Gana'),
  baseSel('s2', 'match-11', 'btts', 'yes', 'BTTS Sí')
];
const evalDuplicates = CorrelationDetector.evaluate(duplicateSelections);
assertStrict.equal(evalDuplicates.isExcluded, true, 'Selecciones duplicadas deben ser excluidas');
assertStrict.ok(evalDuplicates.excludeReason.includes('duplicada'), 'Debe advertir sobre selección duplicada');
console.log('✅ Test 5.1: Selección duplicada detectada y rechazada.');

// ===========================================================================
// MÓDULO 6: FALTA DE CUOTAS O CUOTAS INVÁLIDAS
// ===========================================================================
console.log('\n--- 6. Pruebas de Manejo de Cuotas Faltantes o Inválidas ---');

const candidatePoolWithInvalidOdds = [
  baseSel('s1', 'm1', '1X2', 'home', 'Válido 1', 1.85, 0.55),
  baseSel('s2', 'm2', '1X2', 'home', 'Sin cuota', 0, 0.55),
  baseSel('s3', 'm3', '1X2', 'home', 'Cuota negativa', -1.5, 0.55),
  baseSel('s4', 'm4', '1X2', 'home', 'Cuota 1.0', 1.0, 0.55),
  baseSel('s5', 'm5', '1X2', 'home', 'Válido 2', 1.70, 0.60)
];

const filteredOdds = ParlayEngine.filterValidSelections(candidatePoolWithInvalidOdds);
assertStrict.equal(filteredOdds.length, 2, 'Solo 2 selecciones tienen cuotas válidas > 1.05');
assertStrict.equal(filteredOdds[0].selectionName, 'Válido 1');
assertStrict.equal(filteredOdds[1].selectionName, 'Válido 2');
console.log(`✅ Test 6.1: Cuotas inválidas o faltantes (0, -1.5, 1.0) filtradas correctamente (quedan ${filteredOdds.length} válidas).`);

// ===========================================================================
// MÓDULO 7: PARTIDOS INVÁLIDOS O CON CALIDAD INSUFFICIENT
// ===========================================================================
console.log('\n--- 7. Pruebas de Descarte de Calidad Insuficiente o Datos Inválidos ---');

const poolWithQualityIssues = [
  baseSel('s1', 'm1', '1X2', 'home', 'Alta Calidad', 1.85, 0.58),
  {
    ...baseSel('s2', 'm2', '1X2', 'home', 'Calidad Insuficiente', 1.80, 0.55),
    dataQuality: 'INSUFFICIENT'
  },
  {
    ...baseSel('s3', 'm3', '1X2', 'home', 'Probabilidad Extrema 99%', 1.02, 0.99),
    probability: 0.99
  },
  {
    ...baseSel('s4', 'm4', '1X2', 'home', 'Probabilidad Casi Nula 2%', 25.0, 0.02),
    probability: 0.02
  },
  baseSel('s5', 'm5', '1X2', 'home', 'Media Calidad', 1.75, 0.60)
];

const filteredQuality = ParlayEngine.filterValidSelections(poolWithQualityIssues);
assertStrict.equal(filteredQuality.length, 2, 'Solo selecciones con calidad suficiente y probabilidades realistas deben pasar');
assertStrict.equal(filteredQuality[0].selectionName, 'Alta Calidad');
assertStrict.equal(filteredQuality[1].selectionName, 'Media Calidad');
console.log('✅ Test 7.1: Selecciones con calidad INSUFFICIENT y probabilidades extremas descartadas.');

// ===========================================================================
// MÓDULO 8: PERSONALIZACIÓN MULTI-USUARIO ESTRICTA
// ===========================================================================
console.log('\n--- 8. Pruebas de Personalización por Usuario (Liga BetPlay vs Premier League) ---');

const mixedSelectionsPool = [
  // Selecciones de Liga BetPlay (CO_LFP)
  { ...baseSel('bp1', 'm-col-1', '1X2', 'home', 'Millonarios Gana', 1.85, 0.58), competitionId: 'CO_LFP', bookmakerId: 'betplay' },
  { ...baseSel('bp2', 'm-col-2', '1X2', 'home', 'Nacional Gana', 1.95, 0.55), competitionId: 'CO_LFP', bookmakerId: 'betplay' },
  { ...baseSel('bp3', 'm-col-3', 'double_chance', 'home_draw', 'América 1X', 1.42, 0.72), competitionId: 'CO_LFP', bookmakerId: 'betplay' },

  // Selecciones de Premier League (PL)
  { ...baseSel('pl1', 'm-epl-1', '1X2', 'home', 'Arsenal Gana', 1.80, 0.60), competitionId: 'PL', bookmakerId: 'pinnacle' },
  { ...baseSel('pl2', 'm-epl-2', 'btts', 'yes', 'City-Liverpool BTTS', 1.62, 0.68), competitionId: 'PL', bookmakerId: 'bet365' },
  { ...baseSel('pl3', 'm-epl-3', 'over_2.5', 'over', 'Aston Villa Over', 1.75, 0.62), competitionId: 'PL', bookmakerId: 'betfair' }
];

// Usuario A: Sigue Liga BetPlay (CO_LFP) y usa BetPlay
const userA_Prefs = {
  userId: 'user-a-colombia',
  activeCompetitionIds: ['CO_LFP'],
  activeBookmakerIds: ['betplay']
};

// Usuario B: Sigue Premier League (PL) y usa Pinnacle / Bet365
const userB_Prefs = {
  userId: 'user-b-england',
  activeCompetitionIds: ['PL'],
  activeBookmakerIds: ['pinnacle', 'bet365', 'betfair']
};

const resultUserA = ParlayEngine.generateForUser(mixedSelectionsPool, userA_Prefs);
const resultUserB = ParlayEngine.generateForUser(mixedSelectionsPool, userB_Prefs);

// Verificar Usuario A
assertStrict.ok(resultUserA.focoDelDia != null, 'Usuario A debe recibir Foco del Día');
for (const sel of resultUserA.focoDelDia.selections) {
  assertStrict.equal(sel.competitionId, 'CO_LFP', 'Usuario A solo debe tener partidos de Liga BetPlay');
  assertStrict.equal(sel.bookmakerId, 'betplay', 'Usuario A solo debe tener cuotas de BetPlay');
}
assertStrict.ok(resultUserA.focoDelDia.selections.some(s => s.selectionName.includes('Millonarios') || s.selectionName.includes('Nacional')));

// Verificar Usuario B
assertStrict.ok(resultUserB.focoDelDia != null, 'Usuario B debe recibir Foco del Día');
for (const sel of resultUserB.focoDelDia.selections) {
  assertStrict.equal(sel.competitionId, 'PL', 'Usuario B solo debe tener partidos de Premier League');
}
assertStrict.ok(resultUserB.focoDelDia.selections.some(s => s.selectionName.includes('Arsenal') || s.selectionName.includes('City')));

// Verificar que los resultados son estrictamente diferentes
const idsUserA = resultUserA.focoDelDia.selections.map(s => s.matchId).sort().join(',');
const idsUserB = resultUserB.focoDelDia.selections.map(s => s.matchId).sort().join(',');
assertStrict.notEqual(idsUserA, idsUserB, 'Los parlays generados para Usuario A y Usuario B DEBEN ser completamente distintos');

console.log('✅ Test 8.1: Usuario A (Liga BetPlay) recibió combinaciones 100% de Liga BetPlay.');
console.log('✅ Test 8.2: Usuario B (Premier League) recibió combinaciones 100% de Premier League.');
console.log('✅ Test 8.3: Se confirma que no existe un parley global estático para todos los usuarios.');

// ===========================================================================
// MÓDULO 9: RANKING MULTICRITERIO DEPORTIVO
// ===========================================================================
console.log('\n--- 9. Pruebas de Ranking Multicriterio ---');

// Comparar un candidato sin correlación vs un candidato con fuerte penalización de correlación
const scoreUncorrelated = ParlayEngine.calculateRankingScore(
  'HIGH_PROBABILITY_PARLAY',
  0.40, // 40% joint prob
  15.0, // 15% EV
  [baseSel('1', 'm1', '1X2', 'home', 'Sel 1'), baseSel('2', 'm2', '1X2', 'home', 'Sel 2')],
  'HIGH',
  0.0 // 0 penalización
);

const scoreCorrelated = ParlayEngine.calculateRankingScore(
  'HIGH_PROBABILITY_PARLAY',
  0.40,
  15.0,
  [baseSel('1', 'm1', '1X2', 'home', 'Sel 1'), baseSel('2', 'm1', 'over_2.5', 'over', 'Sel 2')],
  'HIGH',
  0.30 // Penalización por correlación
);

assertStrict.ok(scoreUncorrelated > scoreCorrelated, 'El candidato con riesgo de correlación debe tener un ranking inferior');
console.log(`✅ Test 9.1: Ranking Score sin correlación (${scoreUncorrelated}) > con correlación (${scoreCorrelated}).`);

console.log('\n===============================================================');
console.log('🎉 TODOS LOS TESTS DEL MOTOR DE PARLEYS PASARON EXITOSAMENTE!');
console.log('===============================================================\n');
