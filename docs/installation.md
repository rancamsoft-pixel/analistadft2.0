# Guía de Instalación y Entorno Local

Esta guía describe el procedimiento paso a paso para configurar el entorno de desarrollo local de **Bet Analyzer Pro**.

---

## 1. Requisitos Previos

- **Node.js:** Versión 20.x o superior (`node -v`).
- **NPM:** Versión 10.x o superior (`npm -v`).
- **Firebase CLI (Opcional para emulador local):** `npm install -g firebase-tools`.

---

## 2. Clonación y Estructura

Asegúrese de estar en la raíz del proyecto:
```bash
cd "a:/app en curso/bet_analicer"
```

---

## 3. Instalación de Dependencias

### Frontend (Raíz)
```bash
npm install
```

### Backend (Functions)
```bash
cd functions
npm install
cd ..
```

---

## 4. Configuración de Entorno

Copie la plantilla de variables de entorno del frontend:
```bash
cp .env.example .env
```
*(Por defecto `VITE_APP_USE_MOCK_DATA=true`, permitiendo el arranque inmediato sin dependencias externas).*

Si desea probar el backend de Cloud Functions localmente, copie también:
```bash
cp functions/.env.example functions/.env
```

---

## 5. Scripts de Ejecución Disponibles

### Frontend en Modo Desarrollo (Vite HMR)
```bash
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### Verificación de Tipos Estricta
```bash
npm run typecheck
```

### Compilación para Producción
```bash
npm run build
```
Genera la carpeta optimizada `dist/` con el Service Worker PWA pre-configurado.

### Compilar Cloud Functions (Backend)
```bash
npm run functions:build
```
Genera los archivos compilados en `functions/lib/`.
