import { OddsFormat } from '../types/domain';

export function decimalToAmerican(decimal: number): string {
  if (decimal <= 1.0) return '+0';
  if (decimal >= 2.0) {
    const am = Math.round((decimal - 1) * 100);
    return `+${am}`;
  } else {
    const am = Math.round(-100 / (decimal - 1));
    return `${am}`;
  }
}

export function decimalToFractional(decimal: number): string {
  if (decimal <= 1.0) return '0/1';
  const tolerance = 1.0e-4;
  let h1 = 1;
  let h2 = 0;
  let k1 = 0;
  let k2 = 1;
  let b = decimal - 1;
  do {
    const a = Math.floor(b);
    let aux = h1;
    h1 = a * h1 + h2;
    h2 = aux;
    aux = k1;
    k1 = a * k1 + k2;
    k2 = aux;
    b = 1 / (b - a);
  } while (Math.abs(decimal - 1 - h1 / k1) > (decimal - 1) * tolerance && k1 < 100);

  return `${h1}/${k1}`;
}

export function formatOdds(decimal: number, format: OddsFormat = 'decimal'): string {
  if (!decimal || isNaN(decimal)) return '-';
  switch (format) {
    case 'american':
      return decimalToAmerican(decimal);
    case 'fractional':
      return decimalToFractional(decimal);
    case 'decimal':
    default:
      return decimal.toFixed(2);
  }
}

export function calculateImpliedProbability(decimal: number): number {
  if (!decimal || decimal <= 1) return 0;
  return Number(((1 / decimal) * 100).toFixed(1));
}

export function calculateExpectedValue(odds: number, estimatedProbability: number): number {
  if (!odds || !estimatedProbability) return 0;
  return Number((((estimatedProbability * odds) - 1) * 100).toFixed(2));
}

export function calculateParlayOdds(oddsList: number[]): number {
  if (oddsList.length === 0) return 1.0;
  return Number(oddsList.reduce((acc, curr) => acc * curr, 1).toFixed(3));
}
