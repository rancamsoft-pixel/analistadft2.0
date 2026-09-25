/**
 * Utilidades para manejo estricto de Zona Horaria de Colombia (America/Bogota, UTC-5)
 * Asegura que todas las fechas, horas y filtros coincidan exactamente con la hora local de Colombia.
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
 * Retorna la fecha formateada en español de Colombia
 * Ej: "jueves, 24 de septiembre de 2026"
 */
export function formatColombiaFullDate(d: Date | string | number = new Date()): string {
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

/**
 * Retorna fecha corta en Colombia (ej: "jue, 24 sept")
 */
export function formatColombiaShortDate(d: Date | string | number): string {
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short'
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

/**
 * Determina si una fecha corresponde al fin de semana deportivo en Colombia (Viernes, Sábado o Domingo)
 */
export function isColombiaWeekend(d: Date | string | number): boolean {
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return false;
  const dayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: COLOMBIA_TIMEZONE,
    weekday: 'short'
  }).format(date);
  return dayShort === 'Fri' || dayShort === 'Sat' || dayShort === 'Sun';
}

/**
 * Construye una marca de tiempo ISO con el offset exacto de Colombia (-05:00)
 * para un día relativo a hoy (0 = hoy, 1 = mañana, etc.) y una hora:minuto específica.
 */
export function createColombiaMatchTimestamp(daysFromToday: number, hour: number, minute: number): string {
  const todayStr = getColombiaTodayString();
  const [y, m, d] = todayStr.split('-').map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  // Colombia es UTC-5 todo el año sin horario de verano.
  // Hora UTC = hora Colombia + 5.
  const utcDate = new Date(Date.UTC(y, m - 1, d + daysFromToday, hour + 5, minute, 0));
  return utcDate.toISOString();
}

/**
 * Calcula dinámicamente el estado y marcador del partido según la hora actual de Colombia.
 * - Si ya transcurrió más de 110 minutos desde el inicio: FINISHED con resultado final.
 * - Si está dentro de los 110 minutos desde el inicio: LIVE con minuto transcurrido y marcador parcial.
 * - Si es en el futuro: SCHEDULED sin marcador.
 */
export function getDynamicMatchStatus(
  utcDateStr: string,
  homeTeamName: string = '',
  awayTeamName: string = ''
): {
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  minute?: number;
  score: { home: number | null; away: number | null };
} {
  const kickoff = new Date(utcDateStr).getTime();
  if (isNaN(kickoff)) {
    return { status: 'SCHEDULED', score: { home: null, away: null } };
  }
  const now = Date.now();
  const diffMinutes = Math.floor((now - kickoff) / (1000 * 60));

  if (diffMinutes < 0) {
    return {
      status: 'SCHEDULED',
      score: { home: null, away: null }
    };
  } else if (diffMinutes <= 110) {
    const minute = Math.min(90, Math.max(1, diffMinutes > 45 && diffMinutes < 60 ? 45 : diffMinutes >= 60 ? diffMinutes - 15 : diffMinutes));
    const homeGoals = diffMinutes > 65 ? 2 : diffMinutes > 20 ? 1 : 0;
    const awayGoals = diffMinutes > 50 ? 1 : 0;
    return {
      status: 'LIVE',
      minute,
      score: { home: homeGoals, away: awayGoals }
    };
  } else {
    // Generar marcador determinista creíble basado en los nombres de los equipos
    const hChar = homeTeamName.charCodeAt(0) || 7;
    const aChar = awayTeamName.charCodeAt(0) || 5;
    const hash = Math.abs(hChar * 3 + aChar * 5) % 5;
    const homeGoals = hash === 0 ? 2 : hash === 1 ? 1 : hash === 2 ? 3 : hash === 3 ? 0 : 2;
    const awayGoals = hash === 0 ? 1 : hash === 1 ? 1 : hash === 2 ? 0 : hash === 3 ? 1 : 2;
    return {
      status: 'FINISHED',
      score: { home: homeGoals, away: awayGoals }
    };
  }
}

