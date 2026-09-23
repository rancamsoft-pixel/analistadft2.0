# Guía de Adaptadores y Proveedores Desacoplados

**Bet Analyzer Pro** implementa el patrón de diseño **Adaptador** para asegurar que el sistema nunca esté acoplado rígidamente a un proveedor de datos específico.

---

## 1. Contratos de Proveedor (Interfaces)

### A. Deportes: `SportsDataProvider`
Ubicación: `functions/src/providers/sports/sports.interface.ts`

```typescript
export interface SportsDataProvider {
  readonly providerName: string;
  getLiveMatches(competitionId?: string): Promise<SportMatch[]>;
  getUpcomingMatches(date?: string, competitionId?: string): Promise<SportMatch[]>;
  getMatchDetails(matchId: string): Promise<SportMatchDetails>;
  getCompetitions(): Promise<Competition[]>;
}
```

- **`MockSportsProvider`**: Entrega fixtures controlados, alineaciones, estadísticas xG y H2H sin llamadas HTTP.
- **`ApiFootballProvider`**: Se conecta con API-Football con reintentos automáticos y protección contra caídas.

---

### B. Cuotas: `OddsProvider`
Ubicación: `functions/src/providers/odds/odds.interface.ts`

```typescript
export interface OddsProvider {
  readonly providerName: string;
  getMatchOdds(sportKey: string, eventId: string): Promise<EventOdds>;
  getUpcomingOdds(sportKey: string): Promise<EventOdds[]>;
  getSupportedSports(): Promise<Array<{ key: string; title: string }>>;
}
```

- **`MockOddsProvider`**: Simula mercados H2H, Over/Under y márgenes realistas para Pinnacle, Bet365, 1xBet y Betfair.
- **`TheOddsApiProvider`**: Consume la API de The Odds API en regiones EU y US en formato decimal.

---

### C. Inteligencia Artificial: `AIProvider`
Ubicación: `functions/src/providers/ai/ai.interface.ts`

```typescript
export interface AIProvider {
  readonly providerName: string;
  generateMatchAnalysis(prompt: MatchAnalysisPrompt): Promise<MatchAnalysisResult>;
  evaluateBetValue(
    selection: string,
    market: string,
    currentOdds: number,
    estimatedProbability: number
  ): Promise<ExpectedValueAssessment>;
}
```

- **`MockAIProvider`**: Aplica fórmulas matemáticas rigurosas de probabilidad implícita, margen y ventaja (+EV) sin consumir tokens.
- **`GeminiProvider`**: Utiliza el modelo `gemini-1.5-flash` mediante llamadas REST con respuesta tipada en JSON estricto.

---

## 2. Cómo Agregar un Nuevo Proveedor (Ejemplo: Sportradar o Claude)

1. **Crear el adaptador implementando la interfaz:**
   Cree un archivo en `functions/src/providers/ai/claude.provider.ts`:
   ```typescript
   import { AIProvider, MatchAnalysisPrompt, MatchAnalysisResult } from './ai.interface.js';

   export class ClaudeProvider implements AIProvider {
     readonly providerName = 'ClaudeProvider';
     // Implementar métodos requeridos...
   }
   ```

2. **Registrarlo en la Factoría:**
   En `functions/src/providers/factory.ts`:
   ```typescript
   static getAIProvider(): AIProvider {
     if (config.isMockMode) return new MockAIProvider();
     if (process.env.USE_CLAUDE === 'true') return new ClaudeProvider();
     return new GeminiProvider(config.apiKeys.gemini);
   }
   ```

3. **Listo:** El resto de la aplicación (análisis, parlays, endpoints, caching y reintentos) funcionará de inmediato sin modificar una sola línea de lógica de negocio.
