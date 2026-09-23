"use strict";
/**
 * GeminiContextProvider — Analista de Contexto basado en Gemini API.
 *
 * CONTRATO:
 * - NUNCA inventa cuotas, lesiones, estadísticas, resultados ni probabilidades.
 * - Solo razona sobre los inputs suministrados por nuestro backend.
 * - El modelo es configurable mediante GEMINI_MODEL (nunca hardcodeado).
 * - Valida el JSON estrictamente. Intenta una reparación si falla.
 * - Si el análisis falla, el motor estadístico sigue funcionando sin interrupción.
 *
 * PROMPT DESIGN:
 * - Neutral, basado en evidencia, sin lenguaje de certeza.
 * - System instruction explícita con restricciones.
 * - Response schema estricto con confidenceAdjustment ∈ {-2, -1, 0, 1, 2}.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiContextProvider = void 0;
const context_interface_js_1 = require("./context.interface.js");
const retry_js_1 = require("../../utils/retry.js");
const logger_js_1 = require("../../utils/logger.js");
const logger = new logger_js_1.StructuredLogger('GeminiContextProvider');
// ---------------------------------------------------------------------------
// GeminiContextProvider
// ---------------------------------------------------------------------------
class GeminiContextProvider {
    providerName = 'GeminiContextProvider';
    isMock = false;
    apiKey;
    modelName;
    apiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    constructor(apiKey, modelName) {
        if (!apiKey) {
            throw new Error('[GeminiContextProvider] GEMINI_API_KEY es requerida.');
        }
        if (!modelName) {
            throw new Error('[GeminiContextProvider] GEMINI_MODEL es requerido.');
        }
        this.apiKey = apiKey;
        this.modelName = modelName;
    }
    // ---------------------------------------------------------------------------
    // Método principal
    // ---------------------------------------------------------------------------
    async analyzeContext(input) {
        const startMs = Date.now();
        logger.info(`Iniciando análisis contextual Gemini para partido ${input.matchId}`, {
            model: this.modelName
        });
        const rawOutput = await (0, retry_js_1.withRetry)(async () => {
            return this.callGeminiApi(input);
        }, { maxRetries: 2, initialDelayMs: 1500 });
        logger.info(`Análisis contextual completado para ${input.matchId}`, {
            durationMs: Date.now() - startMs
        });
        return rawOutput;
    }
    // ---------------------------------------------------------------------------
    // Llamada a la API
    // ---------------------------------------------------------------------------
    async callGeminiApi(input) {
        const url = `${this.apiBaseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;
        const body = this.buildRequestBody(input);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout
        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });
        }
        finally {
            clearTimeout(timeout);
        }
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`[GeminiContextProvider] Error HTTP ${response.status} ${response.statusText}. ${errorText.slice(0, 200)}`);
        }
        const data = await response.json();
        // Verificar error en la respuesta
        if (data.error) {
            throw new Error(`[GeminiContextProvider] Error Gemini API: ${data.error.message}`);
        }
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText || rawText.trim().length === 0) {
            throw new Error('[GeminiContextProvider] Respuesta vacía de Gemini.');
        }
        // Parsear y validar JSON
        return this.parseAndValidate(rawText, input);
    }
    // ---------------------------------------------------------------------------
    // Construcción del cuerpo de la solicitud
    // ---------------------------------------------------------------------------
    buildRequestBody(input) {
        const systemInstruction = this.buildSystemInstruction();
        const userPrompt = this.buildUserPrompt(input);
        return {
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: userPrompt }]
                }
            ],
            generationConfig: {
                temperature: 0.15, // Bajo para respuestas factuales y reproducibles
                maxOutputTokens: 1024,
                responseMimeType: 'application/json',
                responseSchema: this.buildResponseSchema()
            }
        };
    }
    // ---------------------------------------------------------------------------
    // System instruction (restricciones estrictas)
    // ---------------------------------------------------------------------------
    buildSystemInstruction() {
        return `Eres un analista de contexto deportivo. Tu función es EXCLUSIVAMENTE analizar la información que te suministra el sistema.

REGLAS ESTRICTAS — INCUMPLIRLAS INVALIDA EL ANÁLISIS:
1. NUNCA inventes cuotas, estadísticas, lesiones, resultados o probabilidades no proporcionadas.
2. NUNCA uses frases de certeza: "apuesta segura", "100% seguro", "garantizado", "definitivamente", "infalible", "no puede perder".
3. Cada afirmación debe estar respaldada en los datos que recibiste. Si no hay datos, di "información no disponible".
4. El campo "confidenceAdjustment" SOLO puede ser uno de: -2, -1, 0, 1, 2. Ningún otro valor es válido.
5. "relevantNews" solo debe incluir artículos de la lista de noticias que te suministramos. No inventes noticias.
6. No atribuyas hechos si la fuente no los proporciona explícitamente.
7. Tu análisis es de contexto, no una recomendación de apuesta.
8. Responde ÚNICAMENTE con el JSON canónico especificado. Sin texto adicional, sin markdown.`;
    }
    // ---------------------------------------------------------------------------
    // Prompt de usuario con datos del partido
    // ---------------------------------------------------------------------------
    buildUserPrompt(input) {
        const sections = [];
        sections.push(`=== PARTIDO ===`);
        sections.push(`${input.homeTeam} vs ${input.awayTeam}`);
        sections.push(`Competición: ${input.competition}`);
        sections.push(`Fecha UTC: ${input.utcDate}`);
        sections.push(`Importancia: ${input.matchImportance ?? 'REGULAR'}`);
        // Forma reciente
        sections.push(`\n=== FORMA RECIENTE ===`);
        sections.push(`${input.homeTeam}: ${input.homeRecentForm?.join(',') ?? 'Sin datos'}`);
        sections.push(`${input.awayTeam}: ${input.awayRecentForm?.join(',') ?? 'Sin datos'}`);
        // Lesiones
        if (input.homeInjuries && input.homeInjuries.length > 0) {
            sections.push(`\n=== LESIONES ${input.homeTeam.toUpperCase()} ===`);
            input.homeInjuries.slice(0, 8).forEach(inj => {
                sections.push(`- ${inj.playerName} (${inj.position}): ${inj.status}`);
            });
        }
        else {
            sections.push(`\n=== LESIONES ${input.homeTeam.toUpperCase()} ===\nSin información de lesiones`);
        }
        if (input.awayInjuries && input.awayInjuries.length > 0) {
            sections.push(`\n=== LESIONES ${input.awayTeam.toUpperCase()} ===`);
            input.awayInjuries.slice(0, 8).forEach(inj => {
                sections.push(`- ${inj.playerName} (${inj.position}): ${inj.status}`);
            });
        }
        else {
            sections.push(`\n=== LESIONES ${input.awayTeam.toUpperCase()} ===\nSin información de lesiones`);
        }
        // Clasificación
        sections.push(`\n=== CLASIFICACIÓN ===`);
        if (input.homeStandingRank !== undefined) {
            sections.push(`${input.homeTeam}: posición ${input.homeStandingRank}/${input.totalTeamsInTable ?? '?'}`);
        }
        else {
            sections.push(`${input.homeTeam}: posición en tabla no disponible`);
        }
        if (input.awayStandingRank !== undefined) {
            sections.push(`${input.awayTeam}: posición ${input.awayStandingRank}/${input.totalTeamsInTable ?? '?'}`);
        }
        else {
            sections.push(`${input.awayTeam}: posición en tabla no disponible`);
        }
        // Descanso
        sections.push(`\n=== DESCANSO ===`);
        sections.push(`${input.homeTeam}: ${input.homeRestDays !== undefined ? `${input.homeRestDays} días` : 'No disponible'}`);
        sections.push(`${input.awayTeam}: ${input.awayRestDays !== undefined ? `${input.awayRestDays} días` : 'No disponible'}`);
        // H2H
        if (input.h2hSummary) {
            sections.push(`\n=== ENFRENTAMIENTOS DIRECTOS (H2H) ===`);
            sections.push(input.h2hSummary);
        }
        // Noticias relevantes (con fuente trazable)
        if (input.relevantNews && input.relevantNews.length > 0) {
            sections.push(`\n=== NOTICIAS RELEVANTES ===`);
            input.relevantNews.slice(0, 5).forEach((n, i) => {
                sections.push(`[${i + 1}] "${n.title}" — ${n.publisher} (${n.publishedAt})`);
                sections.push(`    URL: ${n.url}`);
            });
        }
        else {
            sections.push(`\n=== NOTICIAS RELEVANTES ===\nNo hay noticias disponibles del partido`);
        }
        // Probabilidades del motor estadístico (Gemini las ve pero NO las modifica)
        sections.push(`\n=== PROBABILIDADES DEL MOTOR ESTADÍSTICO (REFERENCIA SOLO) ===`);
        sections.push(`Local (${input.homeTeam}): ${(input.statisticalProbabilities.home * 100).toFixed(1)}%`);
        sections.push(`Empate: ${(input.statisticalProbabilities.draw * 100).toFixed(1)}%`);
        sections.push(`Visitante (${input.awayTeam}): ${(input.statisticalProbabilities.away * 100).toFixed(1)}%`);
        sections.push(`Calidad del dato: ${input.statisticalProbabilities.dataQuality}`);
        sections.push(`NOTA: Estas probabilidades son del modelo estadístico. Tu análisis de contexto es complementario, NO las reemplaza.`);
        // Cuotas de mercado
        if (input.marketOdds) {
            sections.push(`\n=== CUOTAS DE MERCADO (REFERENCIA SOLO) ===`);
            sections.push(`Fuente: ${input.marketOdds.provider} (${input.marketOdds.fetchedAt})`);
            sections.push(`Local: ${input.marketOdds.home} | Empate: ${input.marketOdds.draw} | Visitante: ${input.marketOdds.away}`);
        }
        sections.push(`\n=== TAREA ===`);
        sections.push(`Analiza SOLAMENTE el contexto del partido usando los datos anteriores.`);
        sections.push(`Genera el JSON de análisis contextual.`);
        sections.push(`confidenceAdjustment debe ser un entero en {-2, -1, 0, 1, 2}.`);
        return sections.join('\n');
    }
    // ---------------------------------------------------------------------------
    // Schema de respuesta para Gemini
    // ---------------------------------------------------------------------------
    buildResponseSchema() {
        return {
            type: 'object',
            properties: {
                summary: { type: 'string', description: 'Resumen del contexto del partido (máx. 200 chars)' },
                positiveFactors: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Factores favorables basados solo en datos suministrados'
                },
                negativeFactors: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Factores negativos o de riesgo basados solo en datos suministrados'
                },
                risks: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Riesgos específicos detectados'
                },
                relevantNews: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            publisher: { type: 'string' },
                            url: { type: 'string' },
                            publishedAt: { type: 'string' },
                            retrievedAt: { type: 'string' }
                        },
                        required: ['title', 'publisher', 'url', 'publishedAt', 'retrievedAt']
                    }
                },
                sourceQuality: {
                    type: 'string',
                    enum: ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT']
                },
                recommendationContext: {
                    type: 'string',
                    description: 'Descripción neutral del contexto competitivo. NO es recomendación de apuesta.'
                },
                confidenceAdjustment: {
                    type: 'integer',
                    enum: [-2, -1, 0, 1, 2],
                    description: 'Ajuste de confianza contextual. SOLO -2, -1, 0, 1 ó 2.'
                },
                reasoning: {
                    type: 'string',
                    description: 'Cadena de razonamiento que justifica el confidenceAdjustment'
                }
            },
            required: [
                'summary',
                'positiveFactors',
                'negativeFactors',
                'risks',
                'relevantNews',
                'sourceQuality',
                'recommendationContext',
                'confidenceAdjustment',
                'reasoning'
            ]
        };
    }
    // ---------------------------------------------------------------------------
    // Validación y reparación del JSON
    // ---------------------------------------------------------------------------
    /**
     * Parsea el texto JSON, valida estructura y aplica correcciones defensivas.
     * Si el JSON es inválido: intenta reparación estructurada una sola vez.
     * Si falla de nuevo: lanza error (el servicio captura y continúa sin IA).
     */
    parseAndValidate(rawText, input) {
        let parsed;
        // 1. Intentar parsear directamente
        try {
            // Limpiar posibles delimitadores markdown que Gemini a veces añade pese al schema
            const clean = rawText
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();
            parsed = JSON.parse(clean);
        }
        catch (_firstError) {
            logger.warn(`JSON inválido de Gemini para ${input.matchId}. Intentando reparación...`);
            // Intento de reparación: extraer el primer objeto JSON del texto
            parsed = this.attemptJsonRepair(rawText);
        }
        return this.normalizeOutput(parsed, input);
    }
    /**
     * Intento de reparación estructurada.
     * Extrae el primer bloque {...} del texto.
     */
    attemptJsonRepair(rawText) {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (!match) {
            throw new Error('[GeminiContextProvider] No se encontró objeto JSON en la respuesta.');
        }
        try {
            return JSON.parse(match[0]);
        }
        catch {
            throw new Error('[GeminiContextProvider] Reparación JSON fallida. Respuesta no procesable.');
        }
    }
    /**
     * Normaliza y valida el output de Gemini aplicando controles estrictos:
     * - confidenceAdjustment debe ser un valor permitido
     * - Lenguaje prohibido detectado y eliminado
     * - relevantNews solo de las fuentes suministradas
     * - Arrays no nulos
     */
    normalizeOutput(parsed, input) {
        const raw = parsed;
        // Validar confidenceAdjustment
        const rawAdj = raw['confidenceAdjustment'];
        const adj = Number(rawAdj);
        let confidenceAdjustment = 0;
        if (context_interface_js_1.VALID_CONFIDENCE_ADJUSTMENTS.includes(adj)) {
            confidenceAdjustment = adj;
        }
        else {
            logger.warn(`confidenceAdjustment inválido (${rawAdj}). Forzando a 0.`);
        }
        // Sanear arrays
        const positiveFactors = this.sanitizeStringArray(raw['positiveFactors']);
        const negativeFactors = this.sanitizeStringArray(raw['negativeFactors']);
        const risks = this.sanitizeStringArray(raw['risks']);
        // Filtrar lenguaje prohibido
        const summary = this.sanitizeText(String(raw['summary'] ?? ''));
        const reasoning = this.sanitizeText(String(raw['reasoning'] ?? ''));
        const recommendationContext = this.sanitizeText(String(raw['recommendationContext'] ?? ''));
        // Validar relevantNews: solo puede referenciar noticias que el backend suministró
        const suppliedUrls = new Set(input.relevantNews?.map(n => n.url) ?? []);
        const relevantNews = (Array.isArray(raw['relevantNews']) ? raw['relevantNews'] : [])
            .filter((n) => {
            if (!n || typeof n !== 'object')
                return false;
            const obj = n;
            // Solo incluir si la URL estaba en las noticias suministradas
            return typeof obj['url'] === 'string' && (suppliedUrls.has(obj['url']) || suppliedUrls.size === 0);
        })
            .map((n) => ({
            title: String(n.title ?? ''),
            publisher: String(n.publisher ?? ''),
            url: String(n.url ?? ''),
            publishedAt: String(n.publishedAt ?? ''),
            retrievedAt: String(n.retrievedAt ?? new Date().toISOString())
        }));
        // sourceQuality
        const validSourceQualities = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT'];
        const sourceQuality = validSourceQualities.includes(String(raw['sourceQuality']))
            ? raw['sourceQuality']
            : 'LOW';
        return {
            summary: summary.slice(0, 500),
            positiveFactors: positiveFactors.slice(0, 8),
            negativeFactors: negativeFactors.slice(0, 8),
            risks: risks.slice(0, 6),
            relevantNews,
            sourceQuality,
            recommendationContext: recommendationContext.slice(0, 600),
            confidenceAdjustment,
            reasoning: reasoning.slice(0, 800)
        };
    }
    sanitizeStringArray(value) {
        if (!Array.isArray(value))
            return [];
        return value
            .filter(item => typeof item === 'string' && item.trim().length > 0)
            .map(item => this.sanitizeText(item));
    }
    sanitizeText(text) {
        let result = text;
        for (const phrase of context_interface_js_1.PROHIBITED_LANGUAGE) {
            // Reemplazar lenguaje prohibido con una frase neutral
            const regex = new RegExp(phrase, 'gi');
            result = result.replace(regex, '[término no permitido eliminado]');
        }
        return result.trim();
    }
}
exports.GeminiContextProvider = GeminiContextProvider;
//# sourceMappingURL=gemini.context.provider.js.map