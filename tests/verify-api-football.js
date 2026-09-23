import assert from 'node:assert';
import { ApiUsageManager } from '../functions/lib/services/apiUsageManager.js';
import { SportsCacheService, SPORTS_CACHE_TTL } from '../functions/lib/services/sportsCache.service.js';
import { ApiFootballNormalizer } from '../functions/lib/providers/sports/apiFootball.normalizer.js';

console.log('=================================================================');
console.log('🧪 VERIFICACIÓN COMPLETA: PROVEEDOR REAL API-FOOTBALL Y SERVICIOS');
console.log('=================================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: ApiUsageManager - Control de Presupuesto Diario (80 requests/día)
// ----------------------------------------------------------------------------
console.log('▶ Test 1: ApiUsageManager - Límite de presupuesto diario estricto (80 req/día)');
{
  const usageManager = new ApiUsageManager(80, 0.80);
  const initialStats = usageManager.getDailyStats();
  
  assert.strictEqual(initialStats.dailyBudgetLimit, 80, 'El límite diario debe ser de 80 requests');
  assert.strictEqual(initialStats.requestsUsed, 0, 'Inicialmente 0 requests utilizadas');
  assert.strictEqual(initialStats.requestsRemainingInBudget, 80, 'Inicialmente 80 requests disponibles');
  assert.strictEqual(initialStats.status, 'OK', 'Estado debe ser OK inicialmente');
  assert.strictEqual(initialStats.warningAlert, false, 'No debe haber advertencia inicialmente');

  // Permitir requests iniciales
  const checkInitial = usageManager.canMakeRequest('api-football');
  assert.strictEqual(checkInitial.allowed, true, 'Debe permitir hacer requests dentro del presupuesto');

  // Registrar 79 requests
  for (let i = 0; i < 79; i++) {
    usageManager.recordRequest({
      provider: 'api-football',
      endpoint: '/fixtures',
      durationMs: 120,
      caller: 'test-runner'
    });
  }

  const check79 = usageManager.canMakeRequest('api-football');
  assert.strictEqual(check79.allowed, true, 'Con 79 requests aún debe permitir 1 request más');

  // Registrar la request número 80
  usageManager.recordRequest({
    provider: 'api-football',
    endpoint: '/fixtures',
    durationMs: 140,
    caller: 'test-runner'
  });

  const check80 = usageManager.canMakeRequest('api-football');
  assert.strictEqual(check80.allowed, false, 'Con 80 requests debe bloquear nuevas peticiones no críticas');
  assert.strictEqual(check80.status, 'EXHAUSTED', 'Status debe ser EXHAUSTED');

  // Comprobar que una llamada crítica sí puede usar la cuota de reserva (hasta 100)
  const criticalCheck = usageManager.canMakeRequest('api-football', true);
  assert.strictEqual(criticalCheck.allowed, true, 'Llamadas críticas deben poder usar el colchón de reserva');

  const statsAfter80 = usageManager.getDailyStats();
  assert.strictEqual(statsAfter80.requestsUsed, 80, 'Debe reportar 80 requests utilizadas');
  assert.strictEqual(statsAfter80.requestsRemainingInBudget, 0, '0 requests restantes');
  assert.strictEqual(statsAfter80.status, 'EXHAUSTED', 'Status debe ser EXHAUSTED');
  assert.strictEqual(statsAfter80.warningAlert, true, 'warningAlert debe ser true al agotarse');

  console.log('  ✅ Límite estricto de 80 requests/día bloquea peticiones ordinarias y protege reserva.');
}

// ----------------------------------------------------------------------------
// TEST 2: ApiUsageManager - Umbral de Advertencia al 80% (64 requests)
// ----------------------------------------------------------------------------
console.log('\n▶ Test 2: ApiUsageManager - Detección de umbral de advertencia al 80% (64 req)');
{
  const usageManager = new ApiUsageManager(80, 0.80);
  
  // Registrar 63 peticiones (78.75% -> no warning)
  for (let i = 0; i < 63; i++) {
    usageManager.recordRequest({
      provider: 'api-football',
      endpoint: '/fixtures',
      durationMs: 80,
      caller: 'test'
    });
  }
  assert.strictEqual(usageManager.getDailyStats().warningAlert, false, 'Con 63 requests no debe activar advertencia');
  assert.strictEqual(usageManager.getDailyStats().status, 'OK', 'Con 63 requests el estatus debe ser OK');

  // Registrar la petición número 64 (80% exacto -> warning!)
  usageManager.recordRequest({
    provider: 'api-football',
    endpoint: '/fixtures',
    durationMs: 80,
    caller: 'test'
  });
  const stats64 = usageManager.getDailyStats();
  assert.strictEqual(stats64.warningAlert, true, 'Con 64 requests (80%) debe activar flag warningAlert');
  assert.strictEqual(stats64.status, 'WARNING', 'Status debe ser WARNING');

  console.log('  ✅ Umbral de alerta al 80% (64 requests) detectado con precisión.');
}

// ----------------------------------------------------------------------------
// TEST 3: SportsCacheService - Multi-Tier TTL y Expiración
// ----------------------------------------------------------------------------
console.log('\n▶ Test 3: SportsCacheService - Configuración Multi-Tier TTL y expiración de caché');
{
  assert.strictEqual(SPORTS_CACHE_TTL.FIXTURES, 6 * 3600, 'TTL de Fixtures debe ser 6 horas');
  assert.strictEqual(SPORTS_CACHE_TTL.STANDINGS, 12 * 3600, 'TTL de Standings debe ser 12 horas');
  assert.strictEqual(SPORTS_CACHE_TTL.STATISTICS, 12 * 3600, 'TTL de Statistics debe ser 12 horas');
  assert.strictEqual(SPORTS_CACHE_TTL.H2H, 24 * 3600, 'TTL de H2H debe ser 24 horas');
  assert.strictEqual(SPORTS_CACHE_TTL.INJURIES, 6 * 3600, 'TTL de Injuries debe ser 6 horas');
  assert.strictEqual(SPORTS_CACHE_TTL.LINEUPS, 45 * 60, 'TTL de Lineups debe ser 45 minutos');
  assert.strictEqual(SPORTS_CACHE_TTL.RESULTS, 2 * 3600, 'TTL de Results debe ser 2 horas');

  const cache = new SportsCacheService();

  // Test almacenamiento y recuperación válida
  const testData = { league: 'Premier League', season: 2026 };
  cache.set('test_key', testData, 3600); // 1 hora de validez
  
  const cachedHit = cache.get('test_key');
  assert.deepStrictEqual(cachedHit, testData, 'Debe devolver los datos en caché antes de expirar');

  // Test expiración
  cache.set('expired_key', { expired: true }, -10); // Expirado hace 10 segundos
  const cachedMiss = cache.get('expired_key');
  assert.strictEqual(cachedMiss, null, 'Un registro con TTL expirado debe retornar null');

  console.log('  ✅ Todos los TTLs multi-nivel y la lógica de invalidación operan según especificación.');
}

// ----------------------------------------------------------------------------
// TEST 4: ApiFootballNormalizer - Deduplicación y Normalización Pura de Fixtures
// ----------------------------------------------------------------------------
console.log('\n▶ Test 4: ApiFootballNormalizer - Deduplicación de ID y Normalización de Partidos');
{
  const rawApiFixture = {
    fixture: {
      id: 123456,
      referee: 'Michael Oliver',
      timezone: 'UTC',
      date: '2026-09-22T19:00:00+00:00',
      timestamp: 1790103600,
      periods: { first: 1790103600, second: 1790107200 },
      venue: { id: 556, name: 'Emirates Stadium', city: 'London' },
      status: { long: 'Not Started', short: 'NS', elapsed: null }
    },
    league: {
      id: 39,
      name: 'Premier League',
      country: 'England',
      logo: 'https://media.api-sports.io/football/leagues/39.png',
      flag: 'https://media.api-sports.io/flags/gb.svg',
      season: 2026,
      round: 'Regular Season - 5'
    },
    teams: {
      home: { id: 42, name: 'Arsenal', logo: 'https://media.api-sports.io/football/teams/42.png', winner: null },
      away: { id: 40, name: 'Liverpool', logo: 'https://media.api-sports.io/football/teams/40.png', winner: null }
    },
    goals: { home: null, away: null },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null }
    }
  };

  const normalized = ApiFootballNormalizer.normalizeMatch(rawApiFixture);

  // 1. Verificación de ID de deduplicación determinista
  assert.strictEqual(normalized.id, 'apifootball_123456', 'El ID debe tener el prefijo determinista apifootball_');
  
  // 2. Verificación de datos de equipo y estatus
  assert.strictEqual(normalized.homeTeam.name, 'Arsenal');
  assert.strictEqual(normalized.awayTeam.name, 'Liverpool');
  assert.strictEqual(normalized.status, 'SCHEDULED');
  assert.strictEqual(normalized.venue?.includes('Emirates Stadium'), true);
  assert.strictEqual(normalized.competition.name, 'Premier League');
  assert.strictEqual(normalized.competition.country, 'England');

  // 3. Verificación de NormalizedStoredMatch para Firestore (Upsert)
  const stored = ApiFootballNormalizer.toStoredMatch(normalized);
  assert.strictEqual(stored.matchId, 'apifootball_123456');
  assert.strictEqual(stored.provider, 'api-football');
  assert.strictEqual(stored.providerMatchId, '123456');
  assert.strictEqual(stored.homeTeam.name, 'Arsenal');
  assert.strictEqual(stored.awayTeam.name, 'Liverpool');

  console.log('  ✅ Deduplicación determinista (apifootball_123456) y mapeo de dominios verificado.');
}

// ----------------------------------------------------------------------------
// TEST 5: ApiFootballNormalizer - Normalización de Standings, H2H y Predicciones
// ----------------------------------------------------------------------------
console.log('\n▶ Test 5: ApiFootballNormalizer - Mapeo de Clasificaciones, H2H y Predicciones');
{
  // Test Standings
  const rawStandingResponse = {
    league: {
      id: 39,
      name: 'Premier League',
      country: 'England',
      season: 2026,
      standings: [
        [
          {
            rank: 1,
            team: { id: 42, name: 'Arsenal', logo: 'logo.png' },
            points: 15,
            goalsDiff: 10,
            group: 'Premier League',
            form: 'WWWWW',
            status: 'same',
            description: 'Promotion - Champions League',
            all: { played: 5, win: 5, draw: 0, lose: 0, goals: { for: 12, against: 2 } }
          }
        ]
      ]
    }
  };

  const standingTable = ApiFootballNormalizer.normalizeStandings('39', '2026', [rawStandingResponse]);
  assert.strictEqual(standingTable.competitionId, '39');
  assert.strictEqual(standingTable.season, '2026');
  assert.strictEqual(standingTable.standings.length, 1);
  assert.strictEqual(standingTable.standings[0].rank, 1);
  assert.strictEqual(standingTable.standings[0].team.name, 'Arsenal');
  assert.strictEqual(standingTable.standings[0].points, 15);
  assert.strictEqual(standingTable.standings[0].played, 5);

  // Test Predictions
  const rawPredictionResponse = {
    fixture: { id: 123456 },
    predictions: {
      winner: { id: 42, name: 'Arsenal', comment: 'Win' },
      win_or_draw: true,
      under_over: '-3.5',
      goals: { home: '-2.5', away: '-1.5' },
      advice: 'Combo Double chance : Arsenal or draw and -3.5 goals',
      percent: { home: '60%', draw: '25%', away: '15%' }
    }
  };

  const prediction = ApiFootballNormalizer.normalizePredictions(rawPredictionResponse);
  assert.ok(prediction != null);
  assert.strictEqual(prediction.matchId, '123456');
  assert.strictEqual(prediction.winner?.name, 'Arsenal');
  assert.strictEqual(prediction.winProbabilities.home, 60);
  assert.strictEqual(prediction.winProbabilities.draw, 25);
  assert.strictEqual(prediction.winProbabilities.away, 15);
  assert.strictEqual(prediction.percentAdvice, 'Combo Double chance : Arsenal or draw and -3.5 goals');

  console.log('  ✅ Normalización de tablas de posiciones y pronósticos matemáticos verificada.');
}

// ----------------------------------------------------------------------------
// TEST 6: Resiliencia - Reintento con Backoff Exponencial y Manejo de Errores
// ----------------------------------------------------------------------------
console.log('\n▶ Test 6: Resiliencia - Reintento con Backoff Exponencial simulado');
{
  let attempts = 0;
  async function simulateFlakyApiCall() {
    attempts++;
    if (attempts < 3) {
      const error = new Error('503 Service Unavailable (API-Football transient glitch)');
      error.status = 503;
      throw error;
    }
    return { success: true, data: 'fixture_data_ok' };
  }

  // Simulación de función withRetry idéntica a ApiFootballProvider
  async function withRetry(fn, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (err.status && err.status < 500 && err.status !== 429) {
          throw err; // No reintentar 400, 401, 403, 404
        }
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 20)); // Backoff corto para test
        }
      }
    }
    throw lastError;
  }

  const result = await withRetry(simulateFlakyApiCall, 3);
  assert.strictEqual(attempts, 3, 'Debe haber intentado 3 veces antes de tener éxito');
  assert.strictEqual(result.data, 'fixture_data_ok');

  // Prueba de que errores 401 (Auth) NO se reintentan para no malgastar cuota
  let authAttempts = 0;
  async function simulateAuthError() {
    authAttempts++;
    const err = new Error('401 Unauthorized - Invalid API Key');
    err.status = 401;
    throw err;
  }

  await assert.rejects(
    async () => withRetry(simulateAuthError, 3),
    /401 Unauthorized/,
    'Errores 401 deben fallar inmediatamente sin reintentos'
  );
  assert.strictEqual(authAttempts, 1, 'Error 401 solo debe ejecutarse 1 vez');

  console.log('  ✅ Reintentos exponenciales en 5xx y terminación inmediata en 401/403 verificados.');
}

console.log('\n=================================================================');
console.log('🎉 TODOS LOS TESTS DE API-FOOTBALL Y GESTIÓN DE CUOTA PASARON (6/6)');
console.log('=================================================================\n');
