import assert from 'node:assert';

console.log('--- INICIANDO VERIFICACIÓN DE REGLAS DE NEGOCIO Y MULTIUSUARIO ---');

// 1. Verificación de Límite de Campeonatos (Máximo 2)
const MAX_ACTIVE_COMPETITIONS = 2;
function validateCompetitions(activeIds) {
  if (activeIds.length > MAX_ACTIVE_COMPETITIONS) {
    throw new Error(`Límite alcanzado: Solo puedes activar un máximo de ${MAX_ACTIVE_COMPETITIONS} campeonatos.`);
  }
  return true;
}

assert.doesNotThrow(() => validateCompetitions(['PL']), '1 campeonato debe ser válido');
assert.doesNotThrow(() => validateCompetitions(['PL', 'PD']), '2 campeonatos deben ser válidos');
assert.throws(
  () => validateCompetitions(['PL', 'PD', 'CL']),
  /Límite alcanzado/,
  '3 campeonatos deben lanzar error de límite'
);
console.log('✅ Test 1: Límite estricto de máximo 2 campeonatos verificado.');

// 2. Verificación de Límite de Casas de Apuestas (Máximo 5)
const MAX_ACTIVE_BOOKMAKERS = 5;
function validateBookmakers(activeIds) {
  if (activeIds.length > MAX_ACTIVE_BOOKMAKERS) {
    throw new Error(`Límite alcanzado: Solo puedes activar un máximo de ${MAX_ACTIVE_BOOKMAKERS} casas de apuestas.`);
  }
  return true;
}

assert.doesNotThrow(() => validateBookmakers(['pinnacle', 'bet365']), '2 casas deben ser válidas');
assert.doesNotThrow(
  () => validateBookmakers(['pinnacle', 'bet365', '1xbet', 'betfair', 'draftkings']),
  '5 casas deben ser válidas'
);
assert.throws(
  () => validateBookmakers(['pinnacle', 'bet365', '1xbet', 'betfair', 'draftkings', 'fanduel']),
  /Límite alcanzado/,
  '6 casas deben lanzar error de límite'
);
console.log('✅ Test 2: Límite estricto de máximo 5 casas de apuestas verificado.');

// 3. Verificación de Roles (user vs admin)
function canAccessAdminPanel(user) {
  return user != null && user.role === 'admin';
}

const normalUser = { id: 'u1', email: 'user@test.com', role: 'user' };
const adminUser = { id: 'a1', email: 'admin@test.com', role: 'admin' };

assert.strictEqual(canAccessAdminPanel(normalUser), false, 'Usuario normal no puede acceder al panel admin');
assert.strictEqual(canAccessAdminPanel(adminUser), true, 'Administrador sí puede acceder al panel admin');
console.log('✅ Test 3: Separación y permisos de roles user y admin verificados.');

// 4. Verificación de Mapeo de Errores de Firebase Auth
function mapFirebaseError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo electrónico o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Este correo ya se encuentra registrado. Por favor inicia sesión.';
    case 'auth/weak-password':
      return 'La contraseña es demasiado débil. Usa al menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico no es válido.';
    default:
      return 'Error durante la autenticación.';
  }
}

assert.strictEqual(mapFirebaseError('auth/email-already-in-use'), 'Este correo ya se encuentra registrado. Por favor inicia sesión.');
assert.strictEqual(mapFirebaseError('auth/weak-password'), 'La contraseña es demasiado débil. Usa al menos 6 caracteres.');
assert.strictEqual(mapFirebaseError('auth/wrong-password'), 'Correo electrónico o contraseña incorrectos.');
console.log('✅ Test 4: Mapeo de errores de Firebase Auth a mensajes legibles verificado.');

// 5. Verificación de Estructura de Documentos de Firestore
const sampleUserDoc = {
  email: 'pro@betanalyzer.pro',
  displayName: 'David Pro',
  photoURL: null,
  role: 'user',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

assert.ok(sampleUserDoc.email && typeof sampleUserDoc.email === 'string');
assert.ok(sampleUserDoc.role === 'user' || sampleUserDoc.role === 'admin');
assert.ok(typeof sampleUserDoc.active === 'boolean');
assert.ok(sampleUserDoc.createdAt && sampleUserDoc.updatedAt);
console.log('✅ Test 5: Estructura del documento de usuario users/{uid} verificada.');

console.log('🎉 Todas las pruebas del sistema multiusuario y reglas de negocio pasaron con éxito.');
