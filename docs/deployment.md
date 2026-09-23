# Guía de Despliegue en Producción

Instrucciones para desplegar el frontend en **Firebase Hosting** y el backend en **Firebase Cloud Functions (2nd Gen)**.

---

## 1. Inicio de Sesión y Selección de Proyecto

Inicie sesión en Firebase CLI y vincule su proyecto:
```bash
firebase login
firebase use --add
```
Seleccione el ID de su proyecto de Firebase (por ejemplo `bet-analyzer-prod`).

---

## 2. Configurar Secretos del Backend (Cloud Functions)

Para que el backend consuma los proveedores reales sin exponer claves:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set API_FOOTBALL_KEY
firebase functions:secrets:set THE_ODDS_API_KEY
```

En `functions/.env` de producción o en la consola de Firebase asegúrese de tener:
```env
APP_USE_MOCK_DATA=false
```

---

## 3. Despliegue del Backend (Cloud Functions)

Compile y despliegue las funciones de segunda generación:

```bash
# Compilar TypeScript
cd functions && npm run build && cd ..

# Desplegar únicamente Cloud Functions
firebase deploy --only functions
```

Esto desplegará los endpoints:
- `healthCheck` (onRequest)
- `getMatches` (onRequest)
- `getMatchOdds` (onRequest)
- `getMatchAnalysis` (onRequest)
- `calculateParlay` (onRequest)
- `syncOddsJob` (onSchedule - Cloud Scheduler)

---

## 4. Despliegue del Frontend (Firebase Hosting)

1. En el archivo `.env` de frontend configure:
   ```env
   VITE_APP_USE_MOCK_DATA=false
   VITE_FIREBASE_API_KEY=<su-api-key>
   VITE_FIREBASE_AUTH_DOMAIN=<su-project-id>.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=<su-project-id>
   VITE_API_BASE_URL=https://us-central1-<su-project-id>.cloudfunctions.net
   ```

2. Compile el bundle de producción de Vite:
   ```bash
   npm run build
   ```

3. Despliegue en Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

---

## 5. Despliegue Completo (Hosting + Functions + Firestore Rules)

Para desplegar todo el stack unificado:
```bash
firebase deploy
```
