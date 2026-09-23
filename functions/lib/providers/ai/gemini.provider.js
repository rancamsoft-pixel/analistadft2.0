"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const retry_js_1 = require("../../utils/retry.js");
class GeminiProvider {
    providerName = 'GeminiProvider';
    apiKey;
    modelName = 'gemini-1.5-flash';
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('[GeminiProvider] GEMINI_API_KEY es requerida para el proveedor real.');
        }
        this.apiKey = apiKey;
    }
    async evaluateBetValue(selection, market, currentOdds, estimatedProbability) {
        const impliedProbability = Number((1 / currentOdds).toFixed(4));
        const ev = Number((((estimatedProbability * currentOdds) - 1) * 100).toFixed(2));
        const isValue = ev > 3.0;
        let recommendation = 'NEGATIVE_VALUE';
        if (ev > 8.0)
            recommendation = 'STRONG_VALUE';
        else if (ev > 3.0)
            recommendation = 'MODERATE_VALUE';
        else if (ev >= -2.0)
            recommendation = 'FAIR_MARKET';
        return {
            selection,
            market,
            currentOdds,
            estimatedProbability,
            impliedProbability,
            expectedValuePercentage: ev,
            isValueBet: isValue,
            confidenceScore: Math.min(95, Math.max(50, Math.round(estimatedProbability * 100 + 10))),
            recommendation
        };
    }
    async generateMatchAnalysis(prompt) {
        return (0, retry_js_1.withRetry)(async () => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
            const systemInstruction = `Eres un analista cuantitativo experto en probabilidades deportivas y Expected Value (EV). 
Genera un análisis riguroso, objetivo y probabilístico en formato JSON estricto para el evento deportivo proporcionado.
Debes responder ÚNICAMENTE con el objeto JSON sin delimitadores de markdown.`;
            const userContent = JSON.stringify(prompt);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: `${systemInstruction}\n\nDatos del partido:\n${userContent}` }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: 'application/json'
                    }
                })
            });
            if (!response.ok) {
                throw new Error(`[GeminiProvider] Error HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error('[GeminiProvider] Respuesta vacía de Gemini.');
            }
            const parsed = JSON.parse(text);
            const homeOdds = prompt.oddsSummary?.homeWin || 1.80;
            const homeEstimatedProb = (parsed.winProbabilities?.home || 50) / 100;
            const valueHome = await this.evaluateBetValue(`Victoria ${prompt.homeTeam}`, '1X2 Match Winner', homeOdds, homeEstimatedProb);
            return {
                matchId: prompt.matchId,
                summary: parsed.summary || 'Análisis generado por Gemini.',
                keyTacticalInsights: parsed.keyTacticalInsights || [],
                projectedScore: parsed.projectedScore || { home: 1, away: 0 },
                winProbabilities: parsed.winProbabilities || { home: 50, draw: 25, away: 25 },
                valueBets: [valueHome],
                riskFactor: parsed.riskFactor || 'MEDIUM',
                disclaimer: 'Análisis asistido por inteligencia artificial generativa (Gemini). No constituye garantía de resultado.',
                provider: this.providerName,
                isMock: false,
                generatedAt: new Date().toISOString()
            };
        });
    }
}
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=gemini.provider.js.map