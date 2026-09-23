import { ParlayCalculationResult, ParlayLeg } from '../types/domain';
import { decimalToAmerican } from './odds';

export class ParlayCalculator {
  static calculate(legs: ParlayLeg[], defaultStake: number = 10): ParlayCalculationResult {
    if (legs.length === 0) {
      return {
        totalOddsDecimal: 1.0,
        totalOddsAmerican: '+0',
        impliedProbabilityPercent: 0,
        estimatedJointProbabilityPercent: 0,
        expectedValuePercentage: 0,
        potentialPayout: () => 0,
        potentialProfit: () => 0,
        warnings: [],
        isRecommended: false
      };
    }

    const warnings: string[] = [];
    const matchIds = new Set<string>();

    for (const leg of legs) {
      if (matchIds.has(leg.matchId)) {
        warnings.push(`Múltiples selecciones para el mismo partido (${leg.matchDescription}). Las casas pueden limitar o ajustar estas cuotas correlacionadas.`);
      }
      matchIds.add(leg.matchId);
    }

    const totalOddsDecimal = Number(
      legs.reduce((acc, leg) => acc * leg.odds, 1).toFixed(3)
    );

    const impliedProb = totalOddsDecimal > 1 ? 1 / totalOddsDecimal : 0;

    let estimatedJointProb = 1;
    for (const leg of legs) {
      const prob = leg.estimatedProbability || (leg.odds > 1 ? (1 / leg.odds) * 0.96 : 0.5);
      estimatedJointProb *= prob;
    }

    const ev = Number((((estimatedJointProb * totalOddsDecimal) - 1) * 100).toFixed(2));

    if (legs.length > 5) {
      warnings.push('Alerta: Parlays de más de 5 selecciones tienen un margen de la casa muy acumulado.');
    }

    return {
      totalOddsDecimal,
      totalOddsAmerican: decimalToAmerican(totalOddsDecimal),
      impliedProbabilityPercent: Number((impliedProb * 100).toFixed(1)),
      estimatedJointProbabilityPercent: Number((estimatedJointProb * 100).toFixed(1)),
      expectedValuePercentage: ev,
      potentialPayout: (stake: number = defaultStake) => Number((stake * totalOddsDecimal).toFixed(2)),
      potentialProfit: (stake: number = defaultStake) => Number((stake * (totalOddsDecimal - 1)).toFixed(2)),
      warnings,
      isRecommended: ev > 2.0 && legs.length <= 4
    };
  }
}
