import { SavedParlay } from '../types/domain';

export type DateFilterOption = 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEKEND' | 'PACIENCIA_MULTI' | string;

/**
 * Obtiene la fecha más temprana entre las selecciones de un parlay
 */
export function getEarliestMatchDate(parlay: SavedParlay): Date {
  const times = parlay.selections
    .map(s => new Date(s.utcDate).getTime())
    .filter(t => !isNaN(t));

  if (times.length === 0) {
    return new Date(parlay.date);
  }
  return new Date(Math.min(...times));
}

/**
 * Determina si el parlay aún se puede realizar (disponible para apostar).
 * Un parlay solo se puede apostar si su primer evento aún no ha comenzado.
 */
export function isParlayAvailable(parlay: SavedParlay, refTime: number = Date.now()): boolean {
  if (parlay.status === 'WON' || parlay.status === 'LOST' || parlay.status === 'VOID') {
    return false;
  }
  const earliestTime = getEarliestMatchDate(parlay).getTime();
  // Margen de 1 minuto antes del inicio
  return earliestTime > refTime + 60 * 1000;
}

/**
 * Retorna el tiempo restante hasta el primer partido del parlay
 */
export function getTimeUntilFirstMatch(parlay: SavedParlay, refTime: number = Date.now()): string {
  const earliest = getEarliestMatchDate(parlay).getTime();
  const diffMs = earliest - refTime;

  if (diffMs <= 0) {
    return 'En juego / Cerrado';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `Inicia en ${days}d ${remHours}h`;
  }

  if (hours === 0) {
    return `Cierra en ${mins}m`;
  }

  return `Cierra en ${hours}h ${mins}m`;
}

/**
 * Verifica si las selecciones de un parlay se disputan en 2 o más días diferentes (Multi-fecha)
 */
export function isMultiDateParlay(parlay: SavedParlay): boolean {
  const dates = new Set<string>();
  parlay.selections.forEach(s => {
    try {
      const d = new Date(s.utcDate).toISOString().split('T')[0];
      if (d) dates.add(d);
    } catch {
      // ignore
    }
  });
  return dates.size > 1;
}

/**
 * Comprueba si una fecha UTC individual coincide con el filtro de fecha
 */
export function matchesMatchDateFilter(utcDate: string, filter: DateFilterOption): boolean {
  if (!filter || filter === 'ALL') return true;

  const matchDate = new Date(utcDate);
  if (isNaN(matchDate.getTime())) return true;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]!;
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0]!;

  const matchDateStr = matchDate.toISOString().split('T')[0]!;

  if (filter === 'TODAY') {
    return matchDateStr === todayStr;
  }

  if (filter === 'TOMORROW') {
    return matchDateStr === tomorrowStr;
  }

  if (filter === 'WEEKEND') {
    const day = matchDate.getDay(); // 0 Dom, 5 Vie, 6 Sab
    return day === 5 || day === 6 || day === 0;
  }

  if (filter === 'PACIENCIA_MULTI') {
    return true;
  }

  // Fecha exacta YYYY-MM-DD
  return matchDateStr === filter;
}

/**
 * Comprueba si un parlay coincide con el filtro de fecha seleccionado de manera estricta
 */
export function matchesDateFilter(parlay: SavedParlay, filter: DateFilterOption): boolean {
  if (!filter || filter === 'ALL') return true;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]!;
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0]!;

  const isMulti = isMultiDateParlay(parlay);

  if (filter === 'PACIENCIA_MULTI') {
    return parlay.type === 'PACIENCIA_PARLAY' || parlay.displayCategory === 'PACIENCIA' || isMulti;
  }

  // Si el usuario pide un día específico (Hoy, Mañana o fecha exacta), no debe mezclar parleys multi-fecha a menos que todas sus selecciones sean de esa fecha
  if (filter === 'TODAY') {
    if (isMulti) return false;
    return parlay.selections.length > 0
      ? parlay.selections.every(s => s.utcDate.startsWith(todayStr))
      : parlay.date === todayStr;
  }

  if (filter === 'TOMORROW') {
    if (isMulti) return false;
    return parlay.selections.length > 0
      ? parlay.selections.every(s => s.utcDate.startsWith(tomorrowStr))
      : parlay.date === tomorrowStr;
  }

  if (filter === 'WEEKEND') {
    return parlay.selections.every(s => {
      const day = new Date(s.utcDate).getDay(); // 0 Dom, 5 Vie, 6 Sab
      return day === 5 || day === 6 || day === 0;
    });
  }

  // Fecha exacta YYYY-MM-DD
  if (isMulti) return false;
  return parlay.selections.length > 0
    ? parlay.selections.every(s => s.utcDate.startsWith(filter))
    : parlay.date === filter;
}
