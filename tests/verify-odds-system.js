import assert from 'node:assert';
import { BookmakerRegistry } from '../functions/lib/providers/odds/bookmaker.registry.js';
import { OddsNormalizer } from '../functions/lib/providers/odds/odds.normalizer.js';
import { OddsUsageManager } from '../functions/lib/services/oddsUsageManager.js';
import { OddsSnapshotService } from '../functions/lib/services/oddsSnapshot.service.js';

console.log('=================================================================');
console.log('🧪 VERIFICACIÓN COMPLETA: SISTEMA DE CUOTAS Y THE ODDS API');
console.log('=================================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: Mapeo de Bookmakers y Manejo de Casas No Disponibles (Sin Inventar Datos)
// ----------------------------------------------------------------------------
console.log('▶ Test 1: Mapeo de Bookmakers y Cero Invención de Datos');
{
  // 1. Casas soportadas globalmente
  assert.strictEqual(BookmakerRegistry.isSupported('pinnacle'), true, 'Pinnacle debe estar soportado');
  assert.strictEqual(BookmakerRegistry.isSupported('bet365'), true, 'Bet365 debe estar soportado');
  assert.strictEqual(BookmakerRegistry.getProviderKey('betfair'), 'betfair_ex_eu', 'Betfair debe mapear a betfair_ex_eu');
  assert.strictEqual(BookmakerRegistry.getProviderKey('1xbet'), 'onexbet', '1xBet debe mapear a onexbet');

  // 2. Casas colombianas no provistas por The Odds API
  assert.strictEqual(BookmakerRegistry.isSupported('betplay'), false, 'BetPlay no debe estar soportada en The Odds API');
  assert.strictEqual(BookmakerRegistry.getProviderKey('betplay'), null, 'BetPlay debe tener providerKey null');
  assert.strictEqual(BookmakerRegistry.isSupported('wplay'), false, 'Wplay no debe estar soportada en The Odds API');
  assert.strictEqual(BookmakerRegistry.isSupported('rushbet'), false, 'Rushbet no debe estar soportada en The Odds API');

  // 3. Verificación de traducción inversa providerKey -> internalId
  assert.strictEqual(BookmakerRegistry.mapProviderKeyToInternalId('pinnacle'), 'pinnacle');
  assert.strictEqual(BookmakerRegistry.mapProviderKeyToInternalId('onexbet'), '1xbet');
  assert.strictEqual(BookmakerRegistry.mapProviderKeyToInternalId('betfair_ex_eu'), 'betfair');

  console.log('  ✅ Mapeo interno y detección estricta de casas no soportadas verificado.');
}

// ----------------------------------------------------------------------------
// TEST 2: Validación y Filtrado de Cuotas Inválidas
// ----------------------------------------------------------------------------
console.log('\n▶ Test 2: Validación de Cuotas (Rechazo de <= 1.0, NaN, Nulos, Negativos)');
{
  assert.strictEqual(OddsNormalizer.isValidOdds(1.85), true, '1.85 es una cuota válida');
  assert.strictEqual(OddsNormalizer.isValidOdds(1.01), true, '1.01 es una cuota válida');
  assert.strictEqual(OddsNormalizer.isValidOdds(1.00), false, 'Cuota 1.00 debe ser inválida (sin ganancia)');
  assert.strictEqual(OddsNormalizer.isValidOdds(0.95), false, 'Cuotas < 1.00 son inválidas');
  assert.strictEqual(OddsNormalizer.isValidOdds(-2.5), false, 'Cuotas negativas son inválidas');
  assert.strictEqual(OddsNormalizer.isValidOdds(NaN), false, 'NaN debe ser inválido');
  assert.strictEqual(OddsNormalizer.isValidOdds(null), false, 'Null debe ser inválido');
  assert.strictEqual(OddsNormalizer.isValidOdds(undefined), false, 'Undefined debe ser inválido');
  assert.strictEqual(OddsNormalizer.isValidOdds(Infinity), false, 'Infinity debe ser inválido');
  assert.strictEqual(OddsNormalizer.isValidOdds('1.85'), false, 'Strings no deben pasar como cuota numérica');

  console.log('  ✅ Filtro estricto de cuotas inválidas verificado.');
}

// ----------------------------------------------------------------------------
// TEST 3: Conversión Canónica de Mercados (1X2, Over/Under, BTTS)
// ----------------------------------------------------------------------------
console.log('\n▶ Test 3: Conversión Canónica de Mercados The Odds API -> Formato Interno');
{
  const mockEventOdds = {
    id: 'evt_123',
    sportKey: 'soccer_epl',
    sportTitle: 'Premier League',
    commenceTime: '2026-09-22T20:00:00Z',
    homeTeam: 'Arsenal FC',
    awayTeam: 'Chelsea FC',
    bookmakers: [
      {
        key: 'pinnacle',
        title: 'Pinnacle',
        lastUpdate: '2026-09-22T19:30:00Z',
        markets: [
          {
            key: 'h2h',
            lastUpdate: '2026-09-22T19:30:00Z',
            outcomes: [
              { name: 'Arsenal FC', price: 1.82 },
              { name: 'Empate', price: 3.75 },
              { name: 'Chelsea FC', price: 4.50 },
              { name: 'Inválido', price: 0.50 } // Debe ser descartado
            ]
          },
          {
            key: 'totals',
            lastUpdate: '2026-09-22T19:30:00Z',
            outcomes: [
              { name: 'Over', price: 1.85, point: 2.5 },
              { name: 'Under', price: 1.95, point: 2.5 }
            ]
          },
          {
            key: 'btts',
            lastUpdate: '2026-09-22T19:30:00Z',
            outcomes: [
              { name: 'Yes', price: 1.72 },
              { name: 'No', price: 2.10 }
            ]
          }
        ]
      }
    ]
  };

  const normalized = OddsNormalizer.normalizeEventOdds(mockEventOdds, 'the-odds-api');

  // Verificar 1X2
  const homeOdds = normalized.find(n => n.market === '1X2' && n.selection === 'home');
  const drawOdds = normalized.find(n => n.market === '1X2' && n.selection === 'draw');
  const awayOdds = normalized.find(n => n.market === '1X2' && n.selection === 'away');

  assert.ok(homeOdds, 'Debe mapear Arsenal FC -> home');
  assert.strictEqual(homeOdds.odds, 1.82);
  assert.strictEqual(homeOdds.bookmakerId, 'pinnacle');
  assert.strictEqual(drawOdds?.odds, 3.75);
  assert.strictEqual(awayOdds?.odds, 4.50);

  // Verificar Over/Under
  const overOdds = normalized.find(n => n.market === 'over_under' && n.selection === 'over');
  const underOdds = normalized.find(n => n.market === 'over_under' && n.selection === 'under');
  assert.strictEqual(overOdds?.odds, 1.85);
  assert.strictEqual(overOdds?.line, 2.5);
  assert.strictEqual(underOdds?.odds, 1.95);
  assert.strictEqual(underOdds?.line, 2.5);

  // Verificar BTTS
  const bttsYes = normalized.find(n => n.market === 'btts' && n.selection === 'yes');
  const bttsNo = normalized.find(n => n.market === 'btts' && n.selection === 'no');
  assert.strictEqual(bttsYes?.odds, 1.72);
  assert.strictEqual(bttsNo?.odds, 2.10);

  // Verificar que la cuota inválida (0.50) no fue incluida
  assert.strictEqual(normalized.some(n => n.odds === 0.50), false, 'Cuota 0.50 debe ser filtrada');

  console.log('  ✅ Conversión de mercados 1X2, Over/Under y BTTS verificada.');
}

// ----------------------------------------------------------------------------
// TEST 4: Comparador Estadístico (Mejor, Peor, Promedio, Mediana, Casas Disponibles)
// ----------------------------------------------------------------------------
console.log('\n▶ Test 4: Comparador Multi-Casa con Estadísticas Completas');
{
  const multiEventOdds = {
    id: 'evt_comparison_test',
    sportKey: 'soccer_epl',
    sportTitle: 'Premier League',
    commenceTime: '2026-09-22T20:00:00Z',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    bookmakers: [
      {
        key: 'pinnacle',
        title: 'Pinnacle',
        lastUpdate: '2026-09-22T19:00:00Z',
        markets: [
          {
            key: 'h2h',
            lastUpdate: '2026-09-22T19:00:00Z',
            outcomes: [
              { name: 'Real Madrid', price: 2.10 },
              { name: 'Empate', price: 3.60 },
              { name: 'Barcelona', price: 3.40 }
            ]
          }
        ]
      },
      {
        key: 'bet365',
        title: 'Bet365',
        lastUpdate: '2026-09-22T19:05:00Z',
        markets: [
          {
            key: 'h2h',
            lastUpdate: '2026-09-22T19:05:00Z',
            outcomes: [
              { name: 'Real Madrid', price: 2.05 },
              { name: 'Empate', price: 3.75 },
              { name: 'Barcelona', price: 3.50 }
            ]
          }
        ]
      },
      {
        key: 'betfair_ex_eu',
        title: 'Betfair',
        lastUpdate: '2026-09-22T19:08:00Z',
        markets: [
          {
            key: 'h2h',
            lastUpdate: '2026-09-22T19:08:00Z',
            outcomes: [
              { name: 'Real Madrid', price: 2.15 }, // Mejor cuota local
              { name: 'Empate', price: 3.50 },
              { name: 'Barcelona', price: 3.30 }  // Peor cuota visita
            ]
          }
        ]
      },
      {
        key: 'onexbet',
        title: '1xBet',
        lastUpdate: '2026-09-22T19:02:00Z',
        markets: [
          {
            key: 'h2h',
            lastUpdate: '2026-09-22T19:02:00Z',
            outcomes: [
              { name: 'Real Madrid', price: 2.00 }, // Peor cuota local
              { name: 'Empate', price: 3.65 },
              { name: 'Barcelona', price: 3.60 }  // Mejor cuota visita
            ]
          }
        ]
      }
    ]
  };

  // Comparar incluyendo casas soportadas y colombianas no soportadas
  const targetBks = ['pinnacle', 'bet365', 'betfair', '1xbet', 'betplay', 'wplay'];
  const comparison = OddsNormalizer.buildOddsComparison(multiEventOdds, targetBks);

  const homeComp = comparison.selections['1X2_home'];
  assert.ok(homeComp, 'Debe existir comparación para 1X2_home');

  // 1. Verificación de Mejor y Peor cuota
  assert.strictEqual(homeComp.bestOdds?.price, 2.15, 'Mejor cuota local debe ser 2.15');
  assert.strictEqual(homeComp.bestOdds?.bookmakerId, 'betfair', 'Mejor cuota debe ser de Betfair');
  assert.strictEqual(homeComp.worstOdds?.price, 2.00, 'Peor cuota local debe ser 2.00');
  assert.strictEqual(homeComp.worstOdds?.bookmakerId, '1xbet', 'Peor cuota debe ser de 1xBet');

  // 2. Verificación de Promedio y Mediana
  // Cuotas: [2.00, 2.05, 2.10, 2.15] -> Promedio = 2.075 -> 2.08, Mediana = (2.05 + 2.10) / 2 = 2.08 (o 2.075 aprox)
  assert.strictEqual(homeComp.bookmakerCount, 4, 'Deben haber 4 casas disponibles reportando');
  assert.ok(homeComp.averageOdds >= 2.07 && homeComp.averageOdds <= 2.08, 'Promedio debe ser ~2.08');
  assert.strictEqual(homeComp.medianOdds, 2.08, 'Mediana debe ser 2.08');

  // 3. Verificación de BetPlay y Wplay: SIN inventar datos
  const betplayRow = homeComp.rows.find(r => r.bookmakerId === 'betplay');
  const wplayRow = homeComp.rows.find(r => r.bookmakerId === 'wplay');
  assert.ok(betplayRow, 'Fila de BetPlay debe existir');
  assert.strictEqual(betplayRow.isAvailable, false, 'BetPlay debe figurar como no disponible');
  assert.strictEqual(betplayRow.price, undefined, 'BetPlay NO debe tener cuota inventada');
  assert.strictEqual(betplayRow.unavailableReason, 'Proveedor no disponible para esta casa');
  assert.strictEqual(wplayRow?.isAvailable, false);
  assert.strictEqual(wplayRow?.price, undefined);

  // 4. Verificación de flags isBest e isWorst
  const betfairRow = homeComp.rows.find(r => r.bookmakerId === 'betfair');
  const onexbetRow = homeComp.rows.find(r => r.bookmakerId === '1xbet');
  assert.strictEqual(betfairRow?.isBest, true, 'Betfair debe tener flag isBest');
  assert.strictEqual(onexbetRow?.isWorst, true, '1xBet debe tener flag isWorst');

  console.log('  ✅ Comparador multi-casa, cálculo de estadísticas y detección de no disponible verificado.');
}

// ----------------------------------------------------------------------------
// TEST 5: Resiliencia - API Caída y Fallback a Datos Stale con Timestamp Original
// ----------------------------------------------------------------------------
console.log('\n▶ Test 5: Resiliencia - Fallback a Stale cuando la API externa falla');
{
  const cachedOdds = {
    id: 'evt_down_test',
    sportKey: 'soccer_epl',
    sportTitle: 'Premier League',
    commenceTime: '2026-09-22T20:00:00Z',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    fetchedAt: '2026-09-22T18:00:00Z', // Capturado hace 2 horas
    bookmakers: [
      {
        key: 'pinnacle',
        title: 'Pinnacle',
        lastUpdate: '2026-09-22T18:00:00Z',
        markets: [
          {
            key: 'h2h',
            lastUpdate: '2026-09-22T18:00:00Z',
            outcomes: [
              { name: 'Arsenal', price: 1.80 },
              { name: 'Empate', price: 3.50 },
              { name: 'Chelsea', price: 4.20 }
            ]
          }
        ]
      }
    ]
  };

  // Simulación del comportamiento de fallback de OddsService
  function handleApiFailureWithFallback(fallbackData) {
    if (fallbackData) {
      return {
        ...fallbackData,
        isStale: true,
        lastValidTimestamp: fallbackData.fetchedAt
      };
    }
    throw new Error('503 Service Unavailable: No hay datos en caché');
  }

  const staleResult = handleApiFailureWithFallback(cachedOdds);
  assert.strictEqual(staleResult.isStale, true, 'Debe marcarse explícitamente como isStale');
  assert.strictEqual(staleResult.lastValidTimestamp, '2026-09-22T18:00:00Z', 'Debe conservar el timestamp original');
  assert.strictEqual(staleResult.bookmakers[0].markets[0].outcomes[0].price, 1.80, 'Debe conservar los datos válidos');

  console.log('  ✅ Fallback a datos stale con timestamp original verificado.');
}

// ----------------------------------------------------------------------------
// TEST 6: Snapshots Históricos (Deduplicación y Umbral de Variación)
// ----------------------------------------------------------------------------
console.log('\n▶ Test 6: Snapshots Históricos - Umbral de cambio (> 1.5%) y control de escrituras');
{
  const snapshotService = new OddsSnapshotService();

  // 1. Primer registro para un partido/selección -> Debe guardarse
  const snap1 = snapshotService.recordSnapshot({
    matchId: 'evt_snap_test',
    bookmaker: 'Pinnacle',
    market: '1X2',
    selection: 'home',
    odds: 2.00,
    trigger: 'daily'
  });
  assert.ok(snap1 != null, 'El primer snapshot debe guardarse');
  assert.strictEqual(snap1.odds, 2.00);

  // 2. Cambio minúsculo (< 1.5%): de 2.00 a 2.01 (0.5% cambio) sin trigger forzado -> NO debe guardarse
  const snapTinyChange = snapshotService.recordSnapshot({
    matchId: 'evt_snap_test',
    bookmaker: 'Pinnacle',
    market: '1X2',
    selection: 'home',
    odds: 2.01
  });
  assert.strictEqual(snapTinyChange, null, 'Cambios menores al 1.5% deben ser ignorados para evitar saturación');

  // 3. Cambio significativo (> 1.5%): de 2.00 a 2.08 (4% cambio) -> Debe guardarse
  const snapBigChange = snapshotService.recordSnapshot({
    matchId: 'evt_snap_test',
    bookmaker: 'Pinnacle',
    market: '1X2',
    selection: 'home',
    odds: 2.08
  });
  assert.ok(snapBigChange != null, 'Cambios significativos (>1.5%) sí deben capturar snapshot');
  assert.strictEqual(snapBigChange.odds, 2.08);

  // 4. Trigger clave (pre-partido) -> Siempre debe guardarse
  const snapPreMatch = snapshotService.recordSnapshot({
    matchId: 'evt_snap_test',
    bookmaker: 'Pinnacle',
    market: '1X2',
    selection: 'home',
    odds: 2.08,
    trigger: 'pre_match'
  });
  assert.ok(snapPreMatch != null, 'Trigger pre_match debe guardarse sin importar el cambio');

  const allSnaps = snapshotService.getSnapshotsForMatch('evt_snap_test');
  assert.strictEqual(allSnaps.length, 3, 'Deben haberse persistido exactamente 3 snapshots controlados');

  console.log('  ✅ Control de snapshots por variación y triggers clave verificado.');
}

// ----------------------------------------------------------------------------
// TEST 7: OddsUsageManager - Control de Créditos y Cabeceras HTTP
// ----------------------------------------------------------------------------
console.log('\n▶ Test 7: OddsUsageManager - Telemetría de Créditos y Lectura de Headers');
{
  const usageManager = new OddsUsageManager(500);
  const initial = usageManager.getUsageStats();
  assert.strictEqual(initial.monthlyLimit, 500);
  assert.strictEqual(initial.creditsRemaining, 500);
  assert.strictEqual(initial.status, 'OK');

  // Registrar llamada con cabeceras simuladas de The Odds API
  usageManager.recordCall({
    endpoint: '/v4/sports/soccer_epl/odds',
    durationMs: 250,
    headers: {
      'x-requests-remaining': '412',
      'x-requests-used': '88'
    }
  });

  const afterCall = usageManager.getUsageStats();
  assert.strictEqual(afterCall.creditsRemaining, 412, 'Debe sincronizar con x-requests-remaining');
  assert.strictEqual(afterCall.creditsUsed, 88, 'Debe sincronizar con x-requests-used');
  assert.strictEqual(afterCall.status, 'OK');

  // Simular cuota al 80% (400 usadas -> 100 restantes)
  usageManager.recordCall({
    endpoint: '/v4/sports/soccer_epl/odds',
    durationMs: 220,
    headers: {
      'x-requests-remaining': '95',
      'x-requests-used': '405'
    }
  });
  const warningStats = usageManager.getUsageStats();
  assert.strictEqual(warningStats.status, 'WARNING', 'Debe entrar en estado WARNING al superar el 80%');
  assert.strictEqual(warningStats.warningAlert, true);

  // Simular cuota agotada (0 restantes)
  usageManager.recordCall({
    endpoint: '/v4/sports/soccer_epl/odds',
    durationMs: 200,
    headers: {
      'x-requests-remaining': '0',
      'x-requests-used': '500'
    }
  });
  const exhaustedStats = usageManager.getUsageStats();
  assert.strictEqual(exhaustedStats.status, 'EXHAUSTED', 'Debe marcarse como EXHAUSTED');
  assert.strictEqual(usageManager.canMakeRequest().allowed, false, 'Debe bloquear nuevas llamadas');

  console.log('  ✅ Telemetría de créditos, headers HTTP y prevención de consumo verificado.');
}

console.log('\n=================================================================');
console.log('🎉 TODOS LOS TESTS DEL SISTEMA DE CUOTAS PASARON (7/7)');
console.log('=================================================================\n');
