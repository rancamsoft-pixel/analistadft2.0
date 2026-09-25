/**
 * Utilidades para manejo estricto de Zona Horaria de Colombia (America/Bogota, UTC-5)
 * en el Backend de Cloud Functions / Firebase Functions.
 */

export const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * Retorna la fecha en formato YYYY-MM-DD según la zona horaria de Colombia
 */
export function getColombiaDateString(d: Date | string | number = new Date()): string {
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Retorna la fecha de HOY en Colombia (YYYY-MM-DD)
 */
export function getColombiaTodayString(): string {
  return getColombiaDateString(new Date());
}

/**
 * Retorna la fecha de MAÑANA en Colombia (YYYY-MM-DD)
 */
export function getColombiaTomorrowString(): string {
  const todayStr = getColombiaTodayString();
  const [y, m, d] = todayStr.split('-').map(Number);
  if (!y || !m || !d) return todayStr;
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  return getColombiaDateString(tomorrow);
}

/**
 * Retorna la hora formateada en Colombia (ej: "08:30 p. m." o "20:30")
 */
export function formatColombiaTime(d: Date | string | number, hour12: boolean = true): string {
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12
  });
}

/**
 * Retorna la hora numérica en Colombia (0 a 23)
 */
export function getColombiaHour(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: COLOMBIA_TIMEZONE,
    hour: 'numeric',
    hour12: false
  }).formatToParts(new Date());
  const h = parts.find(p => p.type === 'hour')?.value;
  return h ? parseInt(h, 10) : new Date().getHours();
}
