import { AIProvider, ExpectedValueAssessment, MatchAnalysisPrompt, MatchAnalysisResult } from './ai.interface.js';

export class MockAIProvider implements AIProvider {
  readonly providerName = 'MockAIProvider';

  async evaluateBetValue(
    selection: string,
    market: string,
    currentOdds: number,
    estimatedProbability: number
  ): Promise<ExpectedValueAssessment> {
    const impliedProbability = Number((1 / currentOdds).toFixed(4));
    const ev = Number((((estimatedProbability * currentOdds) - 1) * 100).toFixed(2));
    const isValue = ev > 3.0; // 3% edge threshold

    let recommendation: ExpectedValueAssessment['recommendation'] = 'NEGATIVE_VALUE';
    if (ev > 8.0) recommendation = 'STRONG_VALUE';
    else if (ev > 3.0) recommendation = 'MODERATE_VALUE';
    else if (ev >= -2.0) recommendation = 'FAIR_MARKET';

    return Promise.resolve({
      selection,
      market,
      currentOdds,
      estimatedProbability,
      impliedProbability,
      expectedValuePercentage: ev,
      isValueBet: isValue,
      confidenceScore: Math.min(95, Math.max(50, Math.round(estimatedProbability * 100 + 10))),
      recommendation
    });
  }

  async generateMatchAnalysis(prompt: MatchAnalysisPrompt): Promise<MatchAnalysisResult> {
    const homeOdds = prompt.oddsSummary?.homeWin || 1.85;
    const drawOdds = prompt.oddsSummary?.draw || 3.60;
    const awayOdds = prompt.oddsSummary?.awayWin || 4.20;

    // Calcular probabilidades implícitas normalizadas eliminando margen sintético
    const rawHomeProb = 1 / homeOdds;
    const rawDrawProb = 1 / drawOdds;
    const rawAwayProb = 1 / awayOdds;
    const totalMargin = rawHomeProb + rawDrawProb + rawAwayProb;

    // Probabilidades justas estimadas por el modelo Mock (+/- ligero sesgo cuantitativo)
    const fairHomeProb = Number(((rawHomeProb / totalMargin) + 0.03).toFixed(3));
    const fairAwayProb = Number(((rawAwayProb / totalMargin) - 0.01).toFixed(3));
    const fairDrawProb = Number((1 - fairHomeProb - fairAwayProb).toFixed(3));

    const valueHome = await this.evaluateBetValue(
      `Victoria ${prompt.homeTeam}`,
      '1X2 Match Winner',
      homeOdds,
      fairHomeProb
    );

    const valueOver = await this.evaluateBetValue(
      'Más de 2.5 Goles',
      'Totals (Over/Under)',
      1.85,
      0.58
    );

    return Promise.resolve({
      matchId: prompt.matchId,
      summary: `Análisis cuantitativo para ${prompt.homeTeam} vs ${prompt.awayTeam} en ${prompt.competition}. Los modelos de Poisson y regresión ponderada otorgan una ventaja posicional y de generación de xG (goles esperados) a ${prompt.homeTeam}.`,
      keyTacticalInsights: [
        `${prompt.homeTeam} exhibe un 61% de posesión promedio en casa y un xG generado de 1.94 por partido.`,
        `${prompt.awayTeam} concede un 38% más de tiros concedidos a balón parado frente a rivales de bloque alto.`,
        'Tendencia histórica: En 7 de los últimos 10 enfrentamientos directos se superó la línea de 2.5 goles totales.'
      ],
      projectedScore: {
        home: fairHomeProb > 0.5 ? 2 : 1,
        away: 1
      },
      winProbabilities: {
        home: Number((fairHomeProb * 100).toFixed(1)),
        draw: Number((fairDrawProb * 100).toFixed(1)),
        away: Number((fairAwayProb * 100).toFixed(1))
      },
      valueBets: [valueHome, valueOver],
      riskFactor: 'MEDIUM',
      disclaimer: 'Datos generados por MockAIProvider para fines de desarrollo y verificación arquitectónica. El análisis no constituye asesoramiento financiero.',
      provider: this.providerName,
      isMock: true,
      generatedAt: new Date().toISOString()
    });
  }
}
