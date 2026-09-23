import assert from 'node:assert';

// 1. Verificación de Conversión de Cuotas
function decimalToAmerican(decimal) {
  if (decimal <= 1.0) return '+0';
  if (decimal >= 2.0) {
    return `+${Math.round((decimal - 1) * 100)}`;
  } else {
    return `${Math.round(-100 / (decimal - 1))}`;
  }
}

function calculateEV(odds, estimatedProb) {
  return Number((((estimatedProb * odds) - 1) * 100).toFixed(2));
}

function calculateParlayOdds(oddsList) {
  return Number(oddsList.reduce((acc, curr) => acc * curr, 1).toFixed(3));
}

console.log('--- Iniciando Verificación de Algoritmos Cuantitativos ---');

// Test 1: American odds conversion
assert.strictEqual(decimalToAmerican(2.0), '+100');
assert.strictEqual(decimalToAmerican(1.78), '-128');
assert.strictEqual(decimalToAmerican(3.50), '+250');
console.log('✅ Test 1: Conversión de cuotas decimales a americanas correcta.');

// Test 2: Expected Value (+EV) calculation
// Cuota 2.10 con probabilidad 55%: (0.55 * 2.10 - 1) * 100 = (1.155 - 1) * 100 = +15.5%
const evTest = calculateEV(2.10, 0.55);
assert.strictEqual(evTest, 15.5);

// Cuota 1.80 con probabilidad 50%: (0.50 * 1.80 - 1) * 100 = (0.90 - 1) * 100 = -10.0%
const evNegative = calculateEV(1.80, 0.50);
assert.strictEqual(evNegative, -10.0);
console.log('✅ Test 2: Cálculo matemático de Valor Esperado (+EV) exacto.');

// Test 3: Parlay multiplication
const parlayOdds = calculateParlayOdds([1.78, 1.68]);
assert.strictEqual(parlayOdds, 2.99);
console.log('✅ Test 3: Cuota combinada acumulada exacta.');

// Test 4: Sliding Window Rate Limiter
class SlidingWindowRateLimiter {
  constructor(options = { windowMs: 1000, maxRequests: 3 }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.requests = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const windowStart = now - this.windowMs;
    const validTimestamps = timestamps.filter(ts => ts > windowStart);

    if (validTimestamps.length >= this.maxRequests) {
      return { allowed: false };
    }
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return { allowed: true };
  }
}

const limiter = new SlidingWindowRateLimiter({ windowMs: 1000, maxRequests: 2 });
assert.strictEqual(limiter.isAllowed('user1').allowed, true);
assert.strictEqual(limiter.isAllowed('user1').allowed, true);
assert.strictEqual(limiter.isAllowed('user1').allowed, false); // Excedido
console.log('✅ Test 4: Rate Limiter de ventana deslizante verificado.');

// Test 5: Circuit Breaker State Machine
class SimpleCircuitBreaker {
  constructor(threshold = 2) {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.threshold = threshold;
  }
  recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
}

const breaker = new SimpleCircuitBreaker(2);
assert.strictEqual(breaker.state, 'CLOSED');
breaker.recordFailure();
assert.strictEqual(breaker.state, 'CLOSED');
breaker.recordFailure();
assert.strictEqual(breaker.state, 'OPEN');
breaker.recordSuccess();
assert.strictEqual(breaker.state, 'CLOSED');
console.log('✅ Test 5: Máquina de estados del Circuit Breaker verificada.');

console.log('🎉 Todos los tests del motor cuantitativo y de resiliencia pasaron con éxito.');
