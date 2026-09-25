import { COLOMBIA_TIMEZONE } from './colombiaDate';

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('es-CO', {
      timeZone: COLOMBIA_TIMEZONE,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('es-CO', {
      timeZone: COLOMBIA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency
  }).format(amount);
}
