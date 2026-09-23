export interface ParlayLeg {
  id: string;
  matchId: string;
  matchDescription: string;
  selection: string;
  odds: number;
  estimatedProbability?: number; // 0.0 - 1.0
}

export interface ParlayCalculationResult {
  totalOddsDecimal: number;
  totalOddsAmerican: string;
  impliedProbabilityPercent: number;
  estimatedJointProbabilityPercent: number;
  expectedValuePercentage: number;
  potentialPayout: (stake: number) => number;
  potentialProfit: (stake: number) => number;
  warnings: string[];
  isRecommended: boolean;
}

export class ParlayCalculator {
  static decimalToAmerican(decimal: number): string {
    if (decimal <= 1.0) return '+0';
    if (decimal >= 2.0) {
      const am = Math.round((decimal - 1) * 100);
      return `+${am}`;
    } else {
      const am = Math.round(-100 / (decimal - 1));
      return `${am}`;
    }
  }

  static calculate(legs: ParlayLeg[], _defaultStake: number = 10): ParlayCalculationResult {
    if (legs.length === 0) {
      throw new Error('El parlay debe contener al menos una selección.');
    }

    const warnings: string[] = [];
    const matchIds = new Set<string>();

    // Verificar correlaciones / selecciones del mismo partido
    for (const leg of legs) {
      if (matchIds.has(leg.matchId)) {
        warnings.push(`Advertencia: Múltiples selecciones para el partido '${leg.matchDescription}'. Las cuotas correlacionadas pueden ser ajustadas por la casa de apuestas.`);
      }
      matchIds.add(leg.matchId);
    }

    // Cuota combinada = producto de cuotas
    const totalOddsDecimal = Number(
      legs.reduce((acc, leg) => acc * leg.odds, 1).toFixed(3)
    );

    // Probabilidad implícita en cuota
    const impliedProb = 1 / totalOddsDecimal;

    // Probabilidad conjunta estimada por modelos (asumiendo independencia condicional)
    let estimatedJointProb = 1;
    for (const leg of legs) {
      const prob = leg.estimatedProbability || (1 / leg.odds * 0.95); // fallback sin margen
      estimatedJointProb *= prob;
    }

    // Expected Value = (JointProb * TotalOdds - 1) * 100
    const ev = Number((((estimatedJointProb * totalOddsDecimal) - 1) * 100).toFixed(2));

    if (legs.length > 5) {
      warnings.push('Precaución: Parlays con más de 5 selecciones tienen un margen de la casa significativamente acumulado.');
    }

    return {
      totalOddsDecimal,
      totalOddsAmerican: this.decimalToAmerican(totalOddsDecimal),
      impliedProbabilityPercent: Number((impliedProb * 100).toFixed(2)),
      estimatedJointProbabilityPercent: Number((estimatedJointProb * 100).toFixed(2)),
      expectedValuePercentage: ev,
      potentialPayout: (stake: number) => Number((stake * totalOddsDecimal).toFixed(2)),
      potentialProfit: (stake: number) => Number((stake * (totalOddsDecimal - 1)).toFixed(2)),
      warnings,
      isRecommended: ev > 2.0 && legs.length <= 4
    };
  }
}
