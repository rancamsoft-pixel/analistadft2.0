"use strict";
/**
 * MockContextProvider — Proveedor mock del análisis contextual.
 *
 * Usado en modo MOCK o cuando GEMINI_API_KEY no está disponible.
 * Devuelve un análisis neutral estructurado sin llamar a la API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockContextProvider = void 0;
class MockContextProvider {
    providerName = 'MockContextProvider';
    isMock = true;
    async analyzeContext(input) {
        const hasInjuries = (input.homeInjuries && input.homeInjuries.length > 0) ||
            (input.awayInjuries && input.awayInjuries.length > 0);
        const hasNews = input.relevantNews && input.relevantNews.length > 0;
        const positiveFactors = [];
        const negativeFactors = [];
        const risks = [];
        // Generar factores basados en datos reales suministrados
        if (input.homeRestDays !== undefined && input.awayRestDays !== undefined) {
            if (input.homeRestDays > input.awayRestDays + 1) {
                positiveFactors.push(`${input.homeTeam} tiene ${input.homeRestDays} días de descanso vs ${input.awayRestDays} del visitante`);
            }
            else if (input.awayRestDays > input.homeRestDays + 1) {
                negativeFactors.push(`${input.awayTeam} llega con más descanso (${input.awayRestDays}d vs ${input.homeRestDays}d)`);
            }
        }
        if (input.homeStandingRank !== undefined && input.awayStandingRank !== undefined) {
            if (input.homeStandingRank < input.awayStandingRank) {
                positiveFactors.push(`${input.homeTeam} está mejor posicionado en la tabla (${input.homeStandingRank}° vs ${input.awayStandingRank}°)`);
            }
            else if (input.awayStandingRank < input.homeStandingRank) {
                negativeFactors.push(`${input.awayTeam} ocupa mejor posición en la tabla (${input.awayStandingRank}° vs ${input.homeStandingRank}°)`);
            }
        }
        if (hasInjuries) {
            const homeCount = input.homeInjuries?.length ?? 0;
            const awayCount = input.awayInjuries?.length ?? 0;
            if (homeCount > 0) {
                risks.push(`${input.homeTeam} presenta ${homeCount} baja(s) conocida(s)`);
            }
            if (awayCount > 0) {
                risks.push(`${input.awayTeam} presenta ${awayCount} baja(s) conocida(s)`);
            }
        }
        // confidenceAdjustment neutral en modo mock
        const adjustment = 0;
        return {
            summary: `[MOCK] Análisis contextual para ${input.homeTeam} vs ${input.awayTeam}. ` +
                `Las probabilidades estadísticas indican ${(input.statisticalProbabilities.home * 100).toFixed(1)}% ` +
                `de victoria local. Este análisis de contexto es simulado.`,
            positiveFactors: positiveFactors.length > 0 ? positiveFactors : ['Sin factores positivos identificables con los datos disponibles'],
            negativeFactors: negativeFactors.length > 0 ? negativeFactors : ['Sin factores negativos relevantes con los datos disponibles'],
            risks,
            relevantNews: input.relevantNews ?? [],
            sourceQuality: hasNews ? 'MEDIUM' : 'LOW',
            recommendationContext: `Análisis mock generado para ${input.matchId}. ` +
                `Calidad del dato estadístico: ${input.statisticalProbabilities.dataQuality}. ` +
                `Este no es un análisis real de Gemini.`,
            confidenceAdjustment: adjustment,
            reasoning: '[MOCK] Sin razonamiento real. Proveedor mock activo. Configura GEMINI_API_KEY para análisis real.'
        };
    }
}
exports.MockContextProvider = MockContextProvider;
//# sourceMappingURL=mock.context.provider.js.map