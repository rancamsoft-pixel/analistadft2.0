# Documentación de Variables de Entorno

Este documento especifica todas las variables de entorno necesarias para la ejecución local y en producción de **Bet Analyzer Pro**.

---

## 1. Frontend (`.env` en la raíz del proyecto)

Estas variables son leídas por Vite durante la compilación y ejecución. **Sólo las variables con prefijo `VITE_` son accesibles en el navegador.**

> [!CAUTION]
> **Seguridad Crítica:** Nunca agregue claves de APIs privadas o secretas (como `GEMINI_API_KEY`, `API_FOOTBALL_KEY` o credenciales de pago) en el archivo `.env` del frontend.

| Variable | Tipo | Valor Predeterminado | Descripción |
| :--- | :--- | :--- | :--- |
| `VITE_APP_USE_MOCK_DATA` | `boolean` | `true` | Si es `true`, el cliente opera sin llamar a APIs externas ni backend, usando fixtures locales controlados. |
| `VITE_FIREBASE_API_KEY` | `string` | `demo-api-key` | API Key pública del cliente Firebase (Auth y Firestore). |
| `VITE_FIREBASE_AUTH_DOMAIN` | `string` | `demo-project.firebaseapp.com` | Dominio de autenticación de Firebase. |
| `VITE_FIREBASE_PROJECT_ID` | `string` | `demo-project` | ID del proyecto de Firebase / Google Cloud. |
| `VITE_FIREBASE_STORAGE_BUCKET` | `string` | `demo-project.appspot.com` | Bucket de almacenamiento Cloud Storage. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| `string` | `123456789` | ID de remitente de mensajería para FCM / Web Push. |
| `VITE_FIREBASE_APP_ID` | `string` | `1:123456789:web:abcdef` | Identificador de la aplicación web en Firebase. |
| `VITE_API_BASE_URL` | `string` | `""` | URL base para llamar a Cloud Functions cuando `VITE_APP_USE_MOCK_DATA=false`. |

---

## 2. Backend (`functions/.env`)

Estas variables son exclusivas del entorno de Node.js en Firebase Cloud Functions y nunca se envían al navegador.

| Variable | Tipo | Obligatoria en Prod | Descripción |
| :--- | :--- | :--- | :--- |
| `APP_USE_MOCK_DATA` | `boolean` | No (por defecto `true`) | Habilita el modo mock en el backend. Cuando es `true`, no se consumen tokens ni cuotas externas. |
| `GEMINI_API_KEY` | `string` | Sí (si `APP_USE_MOCK_DATA=false`) | Clave de API de Google Gemini para generación de análisis cuantitativo. |
| `API_FOOTBALL_KEY` | `string` | Sí (si `APP_USE_MOCK_DATA=false`) | Clave de API-Football (v3.football.api-sports.io) para eventos deportivos en vivo y estadísticas. |
| `THE_ODDS_API_KEY` | `string` | Sí (si `APP_USE_MOCK_DATA=false`) | Clave de The Odds API para cuotas de múltiples casas en tiempo real. |
| `NEWS_API_KEY` | `string` | Opcional | Clave de NewsAPI para monitor de noticias deportivas y lesiones. |

---

## 3. Configuración en Producción con Firebase Secrets

Para producción, se recomienda configurar las variables sensibles mediante Firebase Functions Secrets:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set API_FOOTBALL_KEY
firebase functions:secrets:set THE_ODDS_API_KEY
```
