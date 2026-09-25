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

import {
  getColombiaDateString,
  getColombiaTodayString,
  getColombiaTomorrowString,
  isColombiaWeekend
} from './colombiaDate';

/**
 * Verifica si las selecciones de un parlay se disputan en 2 o más días diferentes (Multi-fecha) según hora Colombia
 */
export function isMultiDateParlay(parlay: SavedParlay): boolean {
  const dates = new Set<string>();
  parlay.selections.forEach(s => {
    try {
      const d = getColombiaDateString(s.utcDate);
      if (d) dates.add(d);
    } catch {
      // ignore
    }
  });
  return dates.size > 1;
}

/**
 * Comprueba si una fecha individual coincide con el filtro de fecha según hora Colombia (America/Bogota)
 */
export function matchesMatchDateFilter(utcDate: string, filter: DateFilterOption): boolean {
  if (!filter || filter === 'ALL') return true;

  const matchDateStr = getColombiaDateString(utcDate);
  if (!matchDateStr) return true;

  const todayStr = getColombiaTodayString();
  const tomorrowStr = getColombiaTomorrowString();

  if (filter === 'TODAY') {
    return matchDateStr === todayStr;
  }

  if (filter === 'TOMORROW') {
    return matchDateStr === tomorrowStr;
  }

  if (filter === 'WEEKEND') {
    return isColombiaWeekend(utcDate);
  }

  if (filter === 'PACIENCIA_MULTI') {
    return true;
  }

  // Fecha exacta YYYY-MM-DD
  return matchDateStr === filter;
}

/**
 * Comprueba si un parlay coincide con el filtro de fecha seleccionado de manera estricta según hora Colombia
 */
export function matchesDateFilter(parlay: SavedParlay, filter: DateFilterOption): boolean {
  if (!filter || filter === 'ALL') return true;

  const todayStr = getColombiaTodayString();
  const tomorrowStr = getColombiaTomorrowString();
  const isMulti = isMultiDateParlay(parlay);

  if (filter === 'PACIENCIA_MULTI') {
    return parlay.type === 'PACIENCIA_PARLAY' || parlay.displayCategory === 'PACIENCIA' || isMulti;
  }

  // Si el usuario pide un día específico (Hoy, Mañana o fecha exacta), no debe mezclar parleys multi-fecha
  if (filter === 'TODAY') {
    if (isMulti) return false;
    return parlay.selections.length > 0
      ? parlay.selections.every(s => getColombiaDateString(s.utcDate) === todayStr)
      : (parlay.date === todayStr || getColombiaDateString(parlay.date) === todayStr);
  }

  if (filter === 'TOMORROW') {
    if (isMulti) return false;
    return parlay.selections.length > 0
      ? parlay.selections.every(s => getColombiaDateString(s.utcDate) === tomorrowStr)
      : (parlay.date === tomorrowStr || getColombiaDateString(parlay.date) === tomorrowStr);
  }

  if (filter === 'WEEKEND') {
    return parlay.selections.every(s => isColombiaWeekend(s.utcDate));
  }

  // Fecha exacta YYYY-MM-DD
  if (isMulti) return false;
  return parlay.selections.length > 0
    ? parlay.selections.every(s => getColombiaDateString(s.utcDate) === filter)
    : (parlay.date === filter || getColombiaDateString(parlay.date) === filter);
}
