/**
 * CalibrationService — Arquitectura Desacoplada de Backtesting y Calibración
 *
 * Este módulo contiene los algoritmos matemáticos para evaluar la precisión
 * probabilística de los modelos de forma independiente y aislada del flujo
 * de recomendaciones activas en vivo.
 *
 * Algoritmos implementados:
 * 1. Brier Score: Medida cuadrática de error de probabilidad calibrada.
 * 2. Log Loss: Penalización logarítmica de entropía cruzada binaria.
 * 3. Calibration Curve (Reliability Diagram): Bins de probabilidad estimada vs frecuencia observada.
 * 4. ROI Hipotético: Simulación de rendimiento plano y proporcional (Kelly / Flat Stake).
 * 5. Comparativa por Modelo: Comparación cuantitativa entre Poisson, xG y Regresión.
 */

export interface PredictionOutcomePair {
  id: string;
  probability: number; // [0, 1] estimada por el modelo
  actualOutcome: 1 | 0; // 1 si el evento ocurrió, 0 si no ocurrió
  odds?: number; // Cuota decimal de mercado al momento del pronóstico
  modelVersion?: string;
  market?: string;
}

export interface CalibrationBucket {
  binIndex: number;
  minProb: number;
  maxProb: number;
  count: number;
  meanPredictedProb: number;
  observedFrequency: number;
  deviation: number; // observedFrequency - meanPredictedProb
}

export interface HypotheticalROIReport {
  totalBets: number;
  winningBets: number;
  strikeRate: number; // win percentage
  totalStaked: number;
  totalReturn: number;
  netProfit: number;
  roiPercentage: number;
  yieldPercentage: number;
  maxDrawdown: number;
}

export interface ModelPerformanceReport {
  modelVersion: string;
  sampleSize: number;
  brierScore: number;
  logLoss: number;
  calibrationError: number;
  hypotheticalROI: HypotheticalROIReport;
  rating: 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'POOR';
}

export class CalibrationService {
  /**
   * Calcula el Brier Score: (1/N) * sum((p_i - y_i)^2)
   * Escala: 0.00 = calibración perfecta, 0.25 = azar / no informativo (50/50).
   */
  static calculateBrierScore(pairs: PredictionOutcomePair[]): number {
    if (pairs.length === 0) return 0;

    const sumSquaredErrors = pairs.reduce((acc, curr) => {
      const p = Math.max(0, Math.min(1, curr.probability));
      const y = curr.actualOutcome;
      return acc + Math.pow(p - y, 2);
    }, 0);

    return Number((sumSquaredErrors / pairs.length).toFixed(4));
  }

  /**
   * Calcula la Pérdida Logarítmica (Log Loss / Cross-Entropy)
   * Penaliza fuertemente predicciones con alta confianza que resultan erróneas.
   */
  static calculateLogLoss(pairs: PredictionOutcomePair[]): number {
    if (pairs.length === 0) return 0;

    const EPSILON = 1e-15;
    const totalLoss = pairs.reduce((acc, curr) => {
      const p = Math.max(EPSILON, Math.min(1 - EPSILON, curr.probability));
      const y = curr.actualOutcome;
      const loss = -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
      return acc + loss;
    }, 0);

    return Number((totalLoss / pairs.length).toFixed(4));
  }

  /**
   * Genera los cubos de calibración (Reliability Diagram)
   * Agrupa en intervalos iguales y compara la probabilidad media contra el porcentaje real de aciertos.
   */
  static generateCalibrationCurve(
    pairs: PredictionOutcomePair[],
    numBuckets: number = 10
  ): CalibrationBucket[] {
    const buckets: CalibrationBucket[] = [];
    const step = 1 / numBuckets;

    for (let i = 0; i < numBuckets; i++) {
      const minProb = i * step;
      const maxProb = (i + 1) * step;

      const itemsInBin = pairs.filter(p =>
        i === numBuckets - 1
          ? p.probability >= minProb && p.probability <= maxProb
          : p.probability >= minProb && p.probability < maxProb
      );

      const count = itemsInBin.length;
      if (count === 0) {
        buckets.push({
          binIndex: i,
          minProb,
          maxProb,
          count: 0,
          meanPredictedProb: (minProb + maxProb) / 2,
          observedFrequency: 0,
          deviation: 0
        });
        continue;
      }

      const meanPredictedProb =
        itemsInBin.reduce((sum, item) => sum + item.probability, 0) / count;
      const observedWins = itemsInBin.filter(item => item.actualOutcome === 1).length;
      const observedFrequency = observedWins / count;

      buckets.push({
        binIndex: i,
        minProb,
        maxProb,
        count,
        meanPredictedProb: Number(meanPredictedProb.toFixed(3)),
        observedFrequency: Number(observedFrequency.toFixed(3)),
        deviation: Number((observedFrequency - meanPredictedProb).toFixed(3))
      });
    }

    return buckets;
  }

  /**
   * Simula el Retorno de Inversión (ROI) hipotético bajo estrategia de apuesta fija (Flat Stake)
   */
  static calculateHypotheticalROI(
    pairs: PredictionOutcomePair[],
    flatStake: number = 10
  ): HypotheticalROIReport {
    if (pairs.length === 0) {
      return {
        totalBets: 0,
        winningBets: 0,
        strikeRate: 0,
        totalStaked: 0,
        totalReturn: 0,
        netProfit: 0,
        roiPercentage: 0,
        yieldPercentage: 0,
        maxDrawdown: 0
      };
    }

    let totalStaked = 0;
    let totalReturn = 0;
    let winningBets = 0;
    let peakProfit = 0;
    let maxDrawdown = 0;
    let currentBankroll = 0;

    for (const pair of pairs) {
      const odds = pair.odds && pair.odds > 1 ? pair.odds : 1.90;
      totalStaked += flatStake;

      if (pair.actualOutcome === 1) {
        winningBets++;
        const betReturn = flatStake * odds;
        totalReturn += betReturn;
        currentBankroll += betReturn - flatStake;
      } else {
        currentBankroll -= flatStake;
      }

      if (currentBankroll > peakProfit) {
        peakProfit = currentBankroll;
      } else {
        const drawdown = peakProfit - currentBankroll;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }

    const netProfit = totalReturn - totalStaked;
    const roiPercentage = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0;
    const strikeRate = (winningBets / pairs.length) * 100;

    return {
      totalBets: pairs.length,
      winningBets,
      strikeRate: Number(strikeRate.toFixed(1)),
      totalStaked: Number(totalStaked.toFixed(2)),
      totalReturn: Number(totalReturn.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      roiPercentage: Number(roiPercentage.toFixed(2)),
      yieldPercentage: Number(roiPercentage.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2))
    };
  }

  /**
   * Genera un informe comparativo completo del rendimiento de un modelo
   */
  static evaluateModelPerformance(
    modelVersion: string,
    pairs: PredictionOutcomePair[]
  ): ModelPerformanceReport {
    const brierScore = this.calculateBrierScore(pairs);
    const logLoss = this.calculateLogLoss(pairs);
    const hypotheticalROI = this.calculateHypotheticalROI(pairs);

    // Error de calibración esperado medio (ECE)
    const buckets = this.generateCalibrationCurve(pairs, 5);
    const totalWeightedDev = buckets.reduce((acc, b) => {
      return acc + (b.count / (pairs.length || 1)) * Math.abs(b.deviation);
    }, 0);

    let rating: ModelPerformanceReport['rating'] = 'NEUTRAL';
    if (brierScore < 0.18 && hypotheticalROI.roiPercentage > 5) {
      rating = 'EXCELLENT';
    } else if (brierScore < 0.22 && hypotheticalROI.roiPercentage >= 0) {
      rating = 'GOOD';
    } else if (brierScore > 0.26 || hypotheticalROI.roiPercentage < -10) {
      rating = 'POOR';
    }

    return {
      modelVersion,
      sampleSize: pairs.length,
      brierScore,
      logLoss,
      calibrationError: Number(totalWeightedDev.toFixed(4)),
      hypotheticalROI,
      rating
    };
  }
}
