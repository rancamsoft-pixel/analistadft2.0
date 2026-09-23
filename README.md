# Bet Analyzer Pro ⚽📊

> Plataforma web PWA profesional, escalable y multiusuario diseñada para el análisis cuantitativo de cuotas deportivas, cálculo de valor esperado (+EV), detección de discrepancias entre casas de apuestas y optimización de apuestas combinadas (parlays).

---

## 🌟 Características Principales

- **Frontend Mobile-First PWA:** Desarrollado con React 19, TypeScript estricto, Vite y React Router v7. Interfaz dark-mode estilo terminal financiero/analítico con micro-animaciones y soporte offline mediante Service Worker.
- **Backend Firebase Cloud Functions 2nd Gen:** Funciones desacopladas con TypeScript, CORS, validación de esquemas con Zod y endpoints HTTP/Callables.
- **Arquitectura de Resiliencia Industrial:**
  - **Rate Limiting:** Limitador de ventana deslizante por minuto para proteger cuotas de APIs externas.
  - **Circuit Breaker:** Máquina de estados (CLOSED, OPEN, HALF_OPEN) que aísla fallos en proveedores externos.
  - **TTL In-Memory Cache:** Reducción drástica de costos y llamadas redundantes a APIs externas.
  - **Retries con Backoff Exponencial y Jitter:** Tolerancia a fallos transitorios en peticiones de red.
  - **Structured Logging:** Logs estructurados en JSON listos para Google Cloud Logging.
- **Patrón Adaptador & Proveedores Agnósticos:**
  - **Deportes:** `SportsDataProvider` (`ApiFootballProvider` & `MockSportsProvider`).
  - **Cuotas:** `OddsProvider` (`TheOddsApiProvider` & `MockOddsProvider`).
  - **Noticias:** `NewsProvider` (`NewsApiProvider` & `MockNewsProvider`).
  - **Inteligencia Artificial:** `AIProvider` (`GeminiProvider` & `MockAIProvider`).
- **Modo Mock Desacoplado (`APP_USE_MOCK_DATA=true`):**
  - Permite desarrollar, probar y desplegar la aplicación completa sin gastar un solo centavo en cuotas de proveedores de pago o tokens de IA.
  - Todos los datos generados en este modo están explícitamente etiquetados (`isMock: true`).
- **Seguridad Garantizada:** Cero API keys expuestas en el bundle del cliente.

---

## 📁 Estructura del Repositorio

```
bet_analicer/
├── .env.example               # Plantilla de variables de entorno para frontend
├── firebase.json              # Configuración de Hosting, Functions y Emuladores
├── firestore.rules            # Reglas de seguridad granulares para Firestore
├── index.html                 # Punto de entrada HTML PWA con tipografía y meta tags
├── package.json               # Dependencias de frontend y scripts de workspace
├── tsconfig.json              # TypeScript estricto para frontend
├── vite.config.ts             # Configuración de Vite con VitePWA y alias @/*
├── docs/                      # Documentación arquitectónica completa
│   ├── architecture.md
│   ├── environment-variables.md
│   ├── providers.md
│   ├── installation.md
│   └── deployment.md
├── src/                       # Frontend React
│   ├── app/                   # App, router y providers
│   ├── components/ui/         # Componentes UI reutilizables (Button, Card, Badge, Modal, Input, Loader)
│   ├── layouts/               # MainLayout con barra móvil PWA y sidebar de escritorio
│   ├── features/              # Arquitectura orientada a dominio
│   │   ├── auth/              # Autenticación multiusuario
│   │   ├── dashboard/         # KPIs, partidos en vivo, cuotas +EV
│   │   ├── matches/           # Lista de partidos y detalle con H2H
│   │   ├── analysis/          # Laboratorio predictivo cuantitativo e IA
│   │   ├── parlays/           # Constructor de combinadas con EV
│   │   ├── bookmakers/        # Comparador de márgenes y payout
│   │   ├── competitions/      # Explorador de ligas
│   │   ├── history/           # Historial y cálculo de Yield/ROI
│   │   ├── notifications/     # Alertas de mercado
│   │   └── settings/          # Formato de cuotas y estado del sistema
│   ├── services/              # Cliente API y fixtures controlados
│   ├── types/                 # Modelos tipados de dominio
│   └── utils/                 # Calculadoras de cuotas, formatos y fechas
└── functions/                 # Backend Firebase Cloud Functions 2nd Gen
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── src/
        ├── index.ts           # Exportación de Cloud Functions
        ├── config/            # Validación de variables con Zod
        ├── providers/         # Adaptadores desacoplados (sports, odds, news, ai)
        ├── services/          # Orquestación de negocio con cache y circuit breaker
        ├── analysis/          # Motor unificado de análisis cuantitativo
        ├── parlays/           # Calculador matemático de combinadas
        ├── jobs/              # Tareas programadas (Cloud Scheduler)
        ├── notifications/     # Servicio de mensajería FCM
        └── utils/             # Logger estructurado, circuit breaker, rate limiter, reintentos
```

---

## 🚀 Puesta en Marcha Rápida (Desarrollo Local)

### 1. Requisitos Previos
- Node.js >= 20.x
- NPM >= 10.x

### 2. Instalación de Dependencias
```bash
# Instalar dependencias del frontend
npm install

# Instalar dependencias de Cloud Functions
cd functions && npm install && cd ..
```

### 3. Configuración de Entorno
Crea tu archivo `.env` en la raíz copiando `.env.example`:
```bash
cp .env.example .env
```
*(Por defecto `VITE_APP_USE_MOCK_DATA=true`, por lo que no necesitas configurar claves externas para comenzar a trabajar).*

### 4. Ejecutar Frontend
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

### 5. Compilar Backend Functions
```bash
npm run functions:build
```

---

## 📚 Documentación Detallada

- [Documentación de Arquitectura](file:///a:/app%20en%20curso/bet_analicer/docs/architecture.md)
- [Guía de Variables de Entorno](file:///a:/app%20en%20curso/bet_analicer/docs/environment-variables.md)
- [Guía de Adaptadores y Proveedores](file:///a:/app%20en%20curso/bet_analicer/docs/providers.md)
- [Guía de Instalación Paso a Paso](file:///a:/app%20en%20curso/bet_analicer/docs/installation.md)
- [Guía de Despliegue en Producción](file:///a:/app%20en%20curso/bet_analicer/docs/deployment.md)

---

## 🛡️ Licencia
Uso privado y profesional. Todos los derechos reservados.
