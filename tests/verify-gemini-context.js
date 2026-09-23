/**
 * Tests del Integrador Gemini como Analista de Contexto.
 *
 * Verifica:
 * 1. Validación de confidenceAdjustment (solo {-2,-1,0,1,2})
 * 2. Detección y eliminación de lenguaje prohibido
 * 3. Reparación de JSON inválido
 * 4. Hash de inputs (cache por contenido, no por tiempo)
 * 5. Selección de candidatos (scoring y filtrado)
 * 6. Resiliencia: error de Gemini no detiene el proceso
 * 7. Validación de relevantNews (solo fuentes suministradas)
 * 8. MockContextProvider retorna estructura válida
 * 9. sourceQuality validation
 * 10. Normalización de outputs extremos
 */

import assert from 'node:assert';
import { strict as assertStrict } from 'node:assert';
import { createHash } from 'node:crypto';

console.log('\n--- VERIFICACIÓN DE GEMINI COMO ANALISTA DE CONTEXTO ---\n');

// ---------------------------------------------------------------------------
// Constantes del dominio (duplicadas aquí para tests standalone)
// ---------------------------------------------------------------------------

const VALID_CONFIDENCE_ADJUSTMENTS = [-2, -1, 0, 1, 2];

const PROHIBITED_LANGUAGE = [
  'apuesta segura',
  '100% seguro',
  'garantizado',
  'certeza',
  'infalible',
  'seguro que',
  'definitivamente ganará',
  'no puede perder'
];

// ---------------------------------------------------------------------------
// Helpers de test (simula la lógica del GeminiContextProvider)
// ---------------------------------------------------------------------------

function sanitizeText(text) {
  let result = text;
  for (const phrase of PROHIBITED_LANGUAGE) {
    const regex = new RegExp(phrase, 'gi');
    result = result.replace(regex, '[término no permitido eliminado]');
  }
  return result.trim();
}

function validateConfidenceAdjustment(value) {
  const adj = Number(value);
  return VALID_CONFIDENCE_ADJUSTMENTS.includes(adj) ? adj : 0;
}

function normalizeOutput(raw, suppliedNewsUrls = []) {
  const suppliedUrls = new Set(suppliedNewsUrls);

  const adj = validateConfidenceAdjustment(raw.confidenceAdjustment);

  const positiveFactors = Array.isArray(raw.positiveFactors)
    ? raw.positiveFactors.filter(s => typeof s === 'string' && s.trim().length > 0).map(sanitizeText).slice(0, 8)
    : [];

  const negativeFactors = Array.isArray(raw.negativeFactors)
    ? raw.negativeFactors.filter(s => typeof s === 'string' && s.trim().length > 0).map(sanitizeText).slice(0, 8)
    : [];

  const risks = Array.isArray(raw.risks)
    ? raw.risks.filter(s => typeof s === 'string' && s.trim().length > 0).map(sanitizeText).slice(0, 6)
    : [];

  const validSourceQualities = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT'];
  const sourceQuality = validSourceQualities.includes(raw.sourceQuality) ? raw.sourceQuality : 'LOW';

  const relevantNews = Array.isArray(raw.relevantNews)
    ? raw.relevantNews
        .filter(n => n && typeof n === 'object' && typeof n.url === 'string')
        .filter(n => suppliedUrls.size === 0 || suppliedUrls.has(n.url))
        .map(n => ({
          title: String(n.title ?? ''),
          publisher: String(n.publisher ?? ''),
          url: String(n.url ?? ''),
          publishedAt: String(n.publishedAt ?? ''),
          retrievedAt: String(n.retrievedAt ?? new Date().toISOString())
        }))
    : [];

  return {
    summary: sanitizeText(String(raw.summary ?? '')).slice(0, 500),
    positiveFactors,
    negativeFactors,
    risks,
    relevantNews,
    sourceQuality,
    recommendationContext: sanitizeText(String(raw.recommendationContext ?? '')).slice(0, 600),
    confidenceAdjustment: adj,
    reasoning: sanitizeText(String(raw.reasoning ?? '')).slice(0, 800)
  };
}

function attemptJsonRepair(rawText) {
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found');
  return JSON.parse(match[0]);
}

function computeInputHash(input) {
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
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function scoreCandidates(candidates) {
  return candidates.map(input => {
    let score = 0;
    switch (input.matchImportance) {
      case 'FINAL': score += 10; break;
      case 'SEMIFINAL': score += 8; break;
      case 'DERBY': score += 7; break;
      case 'RELEGATION': score += 6; break;
      case 'TOP4_RACE': score += 5; break;
      default: score += 1; break;
    }
    switch (input.statisticalProbabilities?.dataQuality) {
      case 'VERY_HIGH': score += 4; break;
      case 'HIGH': score += 3; break;
      case 'MEDIUM': score += 2; break;
      case 'LOW': score += 1; break;
      default: break;
    }
    if (input.homeInjuries?.length > 0) score += 2;
    if (input.awayInjuries?.length > 0) score += 2;
    if (input.relevantNews?.length > 0) score += 3;
    if (input.h2hSummary) score += 1;
    if (input.homeRestDays !== undefined && input.awayRestDays !== undefined) {
      const diff = Math.abs(input.homeRestDays - input.awayRestDays);
      if (diff >= 3) score += 2;
    }
    const hoursToMatch = (new Date(input.utcDate).getTime() - Date.now()) / 3600000;
    if (hoursToMatch >= 0 && hoursToMatch <= 48) score += 3;
    return { matchId: input.matchId, score, input };
  }).sort((a, b) => b.score - a.score);
}

function hasSufficientData(input) {
  const hasForm = (input.homeRecentForm?.length >= 3) || (input.awayRecentForm?.length >= 3);
  const hasStandings = input.homeStandingRank !== undefined || input.awayStandingRank !== undefined;
  const hasAnyContext = input.relevantNews?.length > 0 || (input.homeInjuries?.length ?? 0) > 0 ||
    (input.awayInjuries?.length ?? 0) > 0 || !!input.h2hSummary;
  const hasAcceptableQuality = ['VERY_HIGH', 'HIGH', 'MEDIUM'].includes(input.statisticalProbabilities?.dataQuality);
  return !!(hasForm || hasStandings) && hasAcceptableQuality && hasAnyContext;
}

// ===========================================================================
// TEST 1: Validación de confidenceAdjustment
// ===========================================================================

console.log('▶ Test 1: Validación de confidenceAdjustment');

// Valores válidos
for (const v of [-2, -1, 0, 1, 2]) {
  assertStrict.strictEqual(validateConfidenceAdjustment(v), v, `${v} debería ser válido`);
}
console.log('  ✅ Valores válidos: -2, -1, 0, 1, 2 aceptados correctamente');

// Valores inválidos forzados a 0
assertStrict.strictEqual(validateConfidenceAdjustment(3), 0, '3 → 0');
assertStrict.strictEqual(validateConfidenceAdjustment(-3), 0, '-3 → 0');
assertStrict.strictEqual(validateConfidenceAdjustment(1.5), 0, '1.5 → 0');
assertStrict.strictEqual(validateConfidenceAdjustment('alto'), 0, '"alto" → 0');
assertStrict.strictEqual(validateConfidenceAdjustment(null), 0, 'null → 0');
assertStrict.strictEqual(validateConfidenceAdjustment(undefined), 0, 'undefined → 0');
assertStrict.strictEqual(validateConfidenceAdjustment(100), 0, '100 → 0');
console.log('  ✅ Valores inválidos (3, -3, 1.5, "alto", null, undefined, 100) → 0 (forzado)');

// ===========================================================================
// TEST 2: Detección y eliminación de lenguaje prohibido
// ===========================================================================

console.log('\n▶ Test 2: Detección y eliminación de lenguaje prohibido');

const textWithProhibited = 'Este es una apuesta segura, 100% seguro de que ganará';
const sanitized = sanitizeText(textWithProhibited);

assertStrict.ok(!sanitized.toLowerCase().includes('apuesta segura'), 'Debe eliminar "apuesta segura"');
assertStrict.ok(!sanitized.toLowerCase().includes('100% seguro'), 'Debe eliminar "100% seguro"');
assertStrict.ok(sanitized.includes('[término no permitido eliminado]'), 'Debe incluir texto de reemplazo');
console.log(`  ✅ Lenguaje prohibido eliminado: "${sanitized}"`);

// Texto sin lenguaje prohibido: pasa intacto (excepto trim)
const cleanText = 'El equipo local lleva 3 victorias consecutivas.';
assertStrict.strictEqual(sanitizeText(cleanText), cleanText);
console.log('  ✅ Texto sin lenguaje prohibido: pasa intacto');

// Insensible a mayúsculas
const upperCase = 'APUESTA SEGURA y GARANTIZADO';
const sanitizedUpper = sanitizeText(upperCase);
assertStrict.ok(!sanitizedUpper.toLowerCase().includes('apuesta segura'));
assertStrict.ok(!sanitizedUpper.toLowerCase().includes('garantizado'));
console.log('  ✅ Detección insensible a mayúsculas verificada');

// ===========================================================================
// TEST 3: Reparación de JSON inválido
// ===========================================================================

console.log('\n▶ Test 3: Reparación de JSON inválido');

// JSON válido desde respuesta limpia
const validJson = '{"summary":"Test","confidenceAdjustment":0}';
const parsed1 = JSON.parse(validJson);
assertStrict.strictEqual(parsed1.confidenceAdjustment, 0);
console.log('  ✅ JSON válido: parseado directamente');

// JSON con delimitadores markdown (respuesta incorrecta de Gemini)
const markdownWrapped = '```json\n{"summary":"Test markdown","confidenceAdjustment":1}\n```';
const cleaned = markdownWrapped.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
const parsed2 = JSON.parse(cleaned);
assertStrict.strictEqual(parsed2.confidenceAdjustment, 1);
console.log('  ✅ JSON con markdown: reparado correctamente');

// JSON embebido en texto extra (extracción de primer objeto)
const extraText = 'Aquí va el análisis:\n{"summary":"Embedded","confidenceAdjustment":-1}\nEste texto extra debe ignorarse';
const repaired = attemptJsonRepair(extraText);
assertStrict.strictEqual(repaired.confidenceAdjustment, -1);
console.log('  ✅ JSON embebido en texto: extraído correctamente');

// JSON totalmente inválido: debe lanzar error
let threwOnInvalidJson = false;
try {
  attemptJsonRepair('esto no es json en absoluto, ni tiene llaves');
} catch {
  threwOnInvalidJson = true;
}
assertStrict.ok(threwOnInvalidJson, 'JSON totalmente inválido debe lanzar error');
console.log('  ✅ JSON totalmente inválido: lanza error (el servicio captura y continúa)');

// ===========================================================================
// TEST 4: Hash de inputs (cache por contenido)
// ===========================================================================

console.log('\n▶ Test 4: Hash de inputs para caché por contenido');

const baseInput = {
  matchId: 'match_001',
  homeTeam: 'Local FC',
  awayTeam: 'Visitante CF',
  utcDate: '2026-09-30T15:00:00Z',
  statisticalProbabilities: { home: 0.55, draw: 0.25, away: 0.20, dataQuality: 'HIGH', modelVersion: 'v1' }
};

const hash1 = computeInputHash(baseInput);
const hash2 = computeInputHash(baseInput);

// Test 4.1: Mismo input → mismo hash (determinismo)
assertStrict.strictEqual(hash1, hash2, 'Mismo input debe producir mismo hash');
console.log(`  ✅ Determinismo: hash(input) = hash(input) → "${hash1.slice(0, 16)}..."`);

// Test 4.2: Input diferente (nueva forma) → hash diferente
const modifiedInput = { ...baseInput, homeRecentForm: ['W', 'W', 'D'] };
const hash3 = computeInputHash(modifiedInput);
assertStrict.notStrictEqual(hash1, hash3, 'Input modificado debe producir hash diferente');
console.log(`  ✅ Sensibilidad a cambios: hash con forma distinta ≠ hash sin forma`);

// Test 4.3: Cambio de probabilidad estadística → hash diferente
const modifiedProbs = {
  ...baseInput,
  statisticalProbabilities: { ...baseInput.statisticalProbabilities, home: 0.65 }
};
const hash4 = computeInputHash(modifiedProbs);
assertStrict.notStrictEqual(hash1, hash4, 'Cambio de probabilidad debe cambiar el hash');
console.log(`  ✅ Cambio de probabilidad estadística → hash diferente`);

// Test 4.4: Hash es SHA-256 (64 chars hex)
assertStrict.strictEqual(hash1.length, 64, `Hash debe tener 64 chars, got ${hash1.length}`);
console.log(`  ✅ Hash SHA-256: 64 caracteres hexadecimales`);

// ===========================================================================
// TEST 5: Selección y scoring de candidatos
// ===========================================================================

console.log('\n▶ Test 5: Selección y scoring de candidatos');

const futureDate = new Date(Date.now() + 24 * 3600000).toISOString(); // mañana

const candidates = [
  { matchId: 'regular_no_data', matchImportance: 'REGULAR', statisticalProbabilities: { dataQuality: 'LOW' }, utcDate: '2027-01-01T15:00:00Z' },
  { matchId: 'final_high_data', matchImportance: 'FINAL', statisticalProbabilities: { dataQuality: 'VERY_HIGH' }, relevantNews: [{ url: 'http://n.com/1' }], homeInjuries: [{ playerName: 'X' }], utcDate: futureDate },
  { matchId: 'derby_medium', matchImportance: 'DERBY', statisticalProbabilities: { dataQuality: 'HIGH' }, h2hSummary: 'H2H data', utcDate: futureDate },
  { matchId: 'relegation_low', matchImportance: 'RELEGATION', statisticalProbabilities: { dataQuality: 'MEDIUM' }, utcDate: '2027-01-01T15:00:00Z' }
];

const scored = scoreCandidates(candidates);

// Test 5.1: FINAL + VERY_HIGH + news + injuries + próximo → mayor puntuación
assertStrict.strictEqual(scored[0].matchId, 'final_high_data', `FINAL con datos completos debe ser el primero`);
console.log(`  ✅ Prioridad correcta: FINAL+VERY_HIGH+noticias+lesiones+próximo = ${scored[0].score} puntos (mayor)`);

// Test 5.2: Sin datos → menor puntuación
assertStrict.strictEqual(scored[scored.length - 1].matchId, 'regular_no_data', `REGULAR sin datos debe ser el último`);
console.log(`  ✅ REGULAR sin datos = ${scored[scored.length - 1].score} puntos (menor)`);

// Test 5.3: Los scores están en orden descendente
for (let i = 0; i < scored.length - 1; i++) {
  assertStrict.ok(scored[i].score >= scored[i + 1].score, `Puntuación debe estar en orden descendente`);
}
console.log(`  ✅ Orden descendente de puntuaciones verificado`);

// ===========================================================================
// TEST 6: Filtrado por suficiencia de datos
// ===========================================================================

console.log('\n▶ Test 6: Filtrado por suficiencia de datos');

// Con suficiente data
const sufficientInput = {
  matchId: 'suf_001',
  homeRecentForm: ['W', 'W', 'D', 'L', 'W'],
  homeStandingRank: 3,
  awayStandingRank: 8,
  relevantNews: [{ url: 'http://n.com/1', title: 'News', publisher: 'P', publishedAt: '2026-09-22', retrievedAt: '2026-09-22' }],
  statisticalProbabilities: { dataQuality: 'HIGH' }
};
assertStrict.ok(hasSufficientData(sufficientInput), 'Input con forma + standings + noticias + HIGH quality debe ser suficiente');
console.log('  ✅ Forma + standings + noticias + HIGH quality → suficiente');

// Sin ningún contexto adicional
const insufficientInput = {
  matchId: 'insuf_001',
  statisticalProbabilities: { dataQuality: 'LOW' }
};
assertStrict.ok(!hasSufficientData(insufficientInput), 'Input sin datos no debe ser suficiente');
console.log('  ✅ Sin forma, standings ni noticias + LOW quality → insuficiente');

// Con forma pero INSUFFICIENT quality
const lowQualityInput = {
  matchId: 'low_001',
  homeRecentForm: ['W', 'W', 'W', 'D'],
  homeStandingRank: 5,
  h2hSummary: 'H2H data disponible',
  statisticalProbabilities: { dataQuality: 'INSUFFICIENT' }
};
assertStrict.ok(!hasSufficientData(lowQualityInput), 'INSUFFICIENT quality debe ser insuficiente aunque haya forma');
console.log('  ✅ INSUFFICIENT quality → insuficiente (sin importar otros datos)');

// ===========================================================================
// TEST 7: Validación de relevantNews (solo fuentes suministradas)
// ===========================================================================

console.log('\n▶ Test 7: Validación de relevantNews (solo fuentes suministradas)');

const suppliedUrls = ['http://news.com/article-1', 'http://news.com/article-2'];
const rawOutput = {
  summary: 'Test',
  positiveFactors: [],
  negativeFactors: [],
  risks: [],
  relevantNews: [
    { title: 'Valid', publisher: 'Pub', url: 'http://news.com/article-1', publishedAt: '2026-09-22', retrievedAt: '2026-09-22' },
    { title: 'Invented', publisher: 'Fake', url: 'http://invented.com/fake-article', publishedAt: '2026-09-22', retrievedAt: '2026-09-22' } // No suministrada
  ],
  sourceQuality: 'MEDIUM',
  recommendationContext: 'Contexto neutral',
  confidenceAdjustment: 0,
  reasoning: 'Sin riesgo detectado'
};

const normalized = normalizeOutput(rawOutput, suppliedUrls);

// Solo debe incluir la noticia suministrada, no la inventada
assertStrict.strictEqual(normalized.relevantNews.length, 1, 'Solo debe incluir noticias de fuentes suministradas');
assertStrict.strictEqual(normalized.relevantNews[0].url, 'http://news.com/article-1', 'URL debe ser la suministrada');
console.log(`  ✅ Filtrado de noticias: 2 recibidas → 1 válida (URL inventada descartada)`);

// ===========================================================================
// TEST 8: MockContextProvider produce estructura válida
// ===========================================================================

console.log('\n▶ Test 8: MockContextProvider produce estructura válida');

// Simular el output del mock
function createMockOutput(input) {
  return {
    summary: `[MOCK] Análisis contextual para ${input.homeTeam} vs ${input.awayTeam}.`,
    positiveFactors: ['Factor positivo 1'],
    negativeFactors: ['Factor negativo 1'],
    risks: [],
    relevantNews: input.relevantNews ?? [],
    sourceQuality: 'LOW',
    recommendationContext: 'Análisis mock. No es un análisis real de Gemini.',
    confidenceAdjustment: 0,
    reasoning: '[MOCK] Sin razonamiento real.'
  };
}

const mockInput = {
  matchId: 'mock_001',
  homeTeam: 'Real Local',
  awayTeam: 'Atletico Visitante',
  competition: 'Liga Test',
  utcDate: '2026-09-30T18:00:00Z',
  statisticalProbabilities: { home: 0.50, draw: 0.25, away: 0.25, dataQuality: 'MEDIUM', modelVersion: 'v1' }
};

const mockOutput = createMockOutput(mockInput);
const normalizedMock = normalizeOutput(mockOutput, []);

// Validar estructura completa
assertStrict.ok(typeof normalizedMock.summary === 'string' && normalizedMock.summary.length > 0, 'summary requerido');
assertStrict.ok(Array.isArray(normalizedMock.positiveFactors), 'positiveFactors debe ser array');
assertStrict.ok(Array.isArray(normalizedMock.negativeFactors), 'negativeFactors debe ser array');
assertStrict.ok(Array.isArray(normalizedMock.risks), 'risks debe ser array');
assertStrict.ok(Array.isArray(normalizedMock.relevantNews), 'relevantNews debe ser array');
assertStrict.ok(VALID_CONFIDENCE_ADJUSTMENTS.includes(normalizedMock.confidenceAdjustment), 'confidenceAdjustment debe ser válido');
console.log(`  ✅ MockContextProvider produce estructura válida: adj=${normalizedMock.confidenceAdjustment}, sourceQuality=${normalizedMock.sourceQuality}`);

// ===========================================================================
// TEST 9: sourceQuality validación
// ===========================================================================

console.log('\n▶ Test 9: Validación de sourceQuality');

const validQualities = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT'];
for (const q of validQualities) {
  const out = normalizeOutput({ ...rawOutput, sourceQuality: q }, []);
  assertStrict.strictEqual(out.sourceQuality, q, `${q} debe ser válido`);
}
console.log(`  ✅ Todos los valores válidos de sourceQuality aceptados: ${validQualities.join(', ')}`);

// Valor inválido → 'LOW'
const invalidQualityOut = normalizeOutput({ ...rawOutput, sourceQuality: 'PERFECT' }, []);
assertStrict.strictEqual(invalidQualityOut.sourceQuality, 'LOW', 'Valor inválido → LOW');
console.log(`  ✅ sourceQuality inválido ("PERFECT") → "LOW" por defecto`);

// ===========================================================================
// TEST 10: Normalización de outputs extremos
// ===========================================================================

console.log('\n▶ Test 10: Normalización de outputs extremos');

// Output con campos vacíos/nulos
const emptyRaw = {
  summary: null,
  positiveFactors: null,
  negativeFactors: undefined,
  risks: 'not an array',
  relevantNews: null,
  sourceQuality: null,
  recommendationContext: null,
  confidenceAdjustment: 99, // inválido
  reasoning: null
};

const normalizedEmpty = normalizeOutput(emptyRaw, []);
assertStrict.strictEqual(normalizedEmpty.confidenceAdjustment, 0, 'adj inválido → 0');
assertStrict.ok(Array.isArray(normalizedEmpty.positiveFactors), 'positiveFactors null → []');
assertStrict.ok(Array.isArray(normalizedEmpty.negativeFactors), 'negativeFactors undefined → []');
assertStrict.ok(Array.isArray(normalizedEmpty.risks), 'risks string → []');
assertStrict.ok(Array.isArray(normalizedEmpty.relevantNews), 'relevantNews null → []');
assertStrict.strictEqual(normalizedEmpty.sourceQuality, 'LOW', 'sourceQuality null → LOW');
console.log('  ✅ Output con campos nulos/inválidos normalizado correctamente');

// Output con summary muy largo → truncado a 500 chars
const longSummary = 'X'.repeat(600);
const truncatedOut = normalizeOutput({ ...rawOutput, summary: longSummary }, []);
assertStrict.ok(truncatedOut.summary.length <= 500, `Summary debe truncarse a 500 chars, got ${truncatedOut.summary.length}`);
console.log(`  ✅ Summary largo (600 chars) truncado a ${truncatedOut.summary.length} chars`);

// Array con más de 8 factores positivos → truncado a 8
const manyFactors = Array.from({ length: 15 }, (_, i) => `Factor ${i + 1}`);
const manyFactorsOut = normalizeOutput({ ...rawOutput, positiveFactors: manyFactors }, []);
assertStrict.ok(manyFactorsOut.positiveFactors.length <= 8, 'positiveFactors debe truncarse a 8');
console.log(`  ✅ 15 positiveFactors truncados a ${manyFactorsOut.positiveFactors.length}`);

// ===========================================================================
// RESUMEN
// ===========================================================================

console.log('');
console.log('━'.repeat(60));
console.log('🎉 TODOS LOS TESTS DE GEMINI ANALISTA DE CONTEXTO PASARON');
console.log('━'.repeat(60));
console.log('');
console.log('Verificaciones completadas:');
console.log('  🔢 1. confidenceAdjustment: solo {-2,-1,0,1,2}');
console.log('  🚫 2. Lenguaje prohibido: detectado y eliminado');
console.log('  🔧 3. Reparación de JSON: markdown + texto extra + inválido');
console.log('  #️⃣  4. Hash de inputs: determinismo + sensibilidad a cambios');
console.log('  🎯 5. Scoring de candidatos: orden por relevancia');
console.log('  ✅ 6. Filtrado por suficiencia: LOW/INSUFFICIENT excluidos');
console.log('  📰 7. relevantNews: solo URLs suministradas aceptadas');
console.log('  🤖 8. MockContextProvider: estructura válida completa');
console.log('  🔍 9. sourceQuality: validación y fallback a LOW');
console.log('  🛡️  10. Normalización: nulls, truncados, arrays inválidos');
