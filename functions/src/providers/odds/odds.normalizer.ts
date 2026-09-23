import { BookmakerRegistry } from './bookmaker.registry.js';
import {
  CanonicalMarket,
  CanonicalSelection,
  EventOdds,
  MatchOddsComparison,
  NormalizedOddsItem,
  SelectionOddsComparison,
  BookmakerComparisonRow
} from './odds.interface.js';

export class OddsNormalizer {
  /**
   * Valida si una cuota decimal es válida (> 1.00, número finito y no NaN)
   */
  static isValidOdds(price: any): price is number {
    return typeof price === 'number' && !isNaN(price) && isFinite(price) && price > 1.0;
  }

  /**
   * Calcula la mediana estadística de una lista de cuotas numéricas
   */
  static calculateMedian(values: number[]): number {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return Number(sorted[mid]!.toFixed(2));
    }
    return Number(((sorted[mid - 1]! + sorted[mid]!) / 2).toFixed(2));
  }

  /**
   * Normaliza un EventOdds a una lista plana de NormalizedOddsItem
   */
  static normalizeEventOdds(
    event: EventOdds,
    provider: 'the-odds-api' | 'mock' = 'the-odds-api'
  ): NormalizedOddsItem[] {
    const items: NormalizedOddsItem[] = [];
    const fetchedAt = new Date().toISOString();

    for (const b of event.bookmakers || []) {
      const internalBookmakerId = BookmakerRegistry.mapProviderKeyToInternalId(b.key);
      const bookmakerDef = BookmakerRegistry.getBookmaker(internalBookmakerId);

      for (const m of b.markets || []) {
        let canonicalMarket: CanonicalMarket | null = null;
        if (m.key === 'h2h') canonicalMarket = '1X2';
        else if (m.key === 'totals') canonicalMarket = 'over_under';
        else if (m.key === 'btts') canonicalMarket = 'btts';

        if (!canonicalMarket) continue;

        for (const outcome of m.outcomes || []) {
          if (!this.isValidOdds(outcome.price)) continue;

          let selection: CanonicalSelection | null = null;
          let line: number | undefined = outcome.point;

          if (canonicalMarket === '1X2') {
            const outName = (outcome.name || '').toLowerCase();
            const homeName = (event.homeTeam || '').toLowerCase();
            const awayName = (event.awayTeam || '').toLowerCase();

            if (outName === homeName || outName.includes(homeName) || outName === 'home' || outName === '1') {
              selection = 'home';
            } else if (outName === awayName || outName.includes(awayName) || outName === 'away' || outName === '2') {
              selection = 'away';
            } else if (outName === 'draw' || outName.includes('empate') || outName === 'x') {
              selection = 'draw';
            }
          } else if (canonicalMarket === 'over_under') {
            const outName = (outcome.name || '').toLowerCase();
            if (outName.startsWith('over') || outName.includes('más')) {
              selection = 'over';
            } else if (outName.startsWith('under') || outName.includes('menos')) {
              selection = 'under';
            }
          } else if (canonicalMarket === 'btts') {
            const outName = (outcome.name || '').toLowerCase();
            if (outName === 'yes' || outName === 'sí' || outName === 'si') {
              selection = 'yes';
            } else if (outName === 'no') {
              selection = 'no';
            }
          }

          if (selection) {
            const id = `${event.id}_${internalBookmakerId}_${canonicalMarket}_${selection}${line ? `_${line}` : ''}`;
            items.push({
              id,
              matchId: event.id,
              bookmakerId: internalBookmakerId,
              bookmakerName: bookmakerDef.name,
              provider,
              market: canonicalMarket,
              selection,
              odds: Number(outcome.price.toFixed(2)),
              line,
              timestamp: b.lastUpdate || fetchedAt,
              fetchedAt,
              isStale: event.isStale
            });
          }
        }
      }
    }

    return items;
  }

  /**
   * Construye el comparador estadístico completo para un partido
   */
  static buildOddsComparison(
    event: EventOdds,
    targetBookmakerIds: string[] = ['pinnacle', 'bet365', 'betfair', '1xbet', 'betplay', 'wplay']
  ): MatchOddsComparison {
    const normalizedItems = this.normalizeEventOdds(event, event.isMock ? 'mock' : 'the-odds-api');

    // Identificar las selecciones a comparar
    const selectionKeys: Array<{ market: CanonicalMarket; selection: CanonicalSelection; line?: number; key: string }> = [
      { market: '1X2', selection: 'home', key: '1X2_home' },
      { market: '1X2', selection: 'draw', key: '1X2_draw' },
      { market: '1X2', selection: 'away', key: '1X2_away' },
      { market: 'over_under', selection: 'over', line: 2.5, key: 'over_under_over_2.5' },
      { market: 'over_under', selection: 'under', line: 2.5, key: 'over_under_under_2.5' },
      { market: 'btts', selection: 'yes', key: 'btts_yes' },
      { market: 'btts', selection: 'no', key: 'btts_no' }
    ];

    const selections: Record<string, SelectionOddsComparison> = {};

    for (const sel of selectionKeys) {
      const rows: BookmakerComparisonRow[] = [];

      for (const bkId of targetBookmakerIds) {
        const bkDef = BookmakerRegistry.getBookmaker(bkId);

        // 1. Si la casa no está soportada por el proveedor, marcar explícitamente sin inventar datos
        if (!BookmakerRegistry.isSupported(bkId)) {
          rows.push({
            bookmakerId: bkId,
            bookmakerName: bkDef.name,
            isAvailable: false,
            unavailableReason: 'Proveedor no disponible para esta casa',
            price: undefined
          });
          continue;
        }

        // 2. Si la casa está soportada, buscar si reportó cuota para esta selección
        const matchingItem = normalizedItems.find(
          item =>
            item.bookmakerId === bkId &&
            item.market === sel.market &&
            item.selection === sel.selection &&
            (sel.line === undefined || item.line === sel.line)
        );

        if (matchingItem && this.isValidOdds(matchingItem.odds)) {
          rows.push({
            bookmakerId: bkId,
            bookmakerName: bkDef.name,
            isAvailable: true,
            price: matchingItem.odds,
            lastUpdate: matchingItem.timestamp
          });
        } else {
          rows.push({
            bookmakerId: bkId,
            bookmakerName: bkDef.name,
            isAvailable: false,
            unavailableReason: 'Cuota no disponible para este evento',
            price: undefined
          });
        }
      }

      // Calcular estadísticas solo sobre las casas que sí tienen cuotas válidas
      const validRows = rows.filter(r => r.isAvailable && typeof r.price === 'number');
      const validPrices = validRows.map(r => r.price as number);

      let bestOdds: { price: number; bookmakerId: string; bookmakerName: string } | null = null;
      let worstOdds: { price: number; bookmakerId: string; bookmakerName: string } | null = null;
      let averageOdds = 0;
      let medianOdds = 0;

      if (validPrices.length > 0) {
        const maxPrice = Math.max(...validPrices);
        const minPrice = Math.min(...validPrices);

        const bestRow = validRows.find(r => r.price === maxPrice);
        const worstRow = validRows.find(r => r.price === minPrice);

        if (bestRow) {
          bestOdds = { price: maxPrice, bookmakerId: bestRow.bookmakerId, bookmakerName: bestRow.bookmakerName };
        }
        if (worstRow) {
          worstOdds = { price: minPrice, bookmakerId: worstRow.bookmakerId, bookmakerName: worstRow.bookmakerName };
        }

        const sum = validPrices.reduce((acc, p) => acc + p, 0);
        averageOdds = Number((sum / validPrices.length).toFixed(2));
        medianOdds = this.calculateMedian(validPrices);

        // Marcar flags isBest e isWorst en las filas
        for (const r of rows) {
          if (r.price === maxPrice) r.isBest = true;
          if (r.price === minPrice) r.isWorst = true;
        }
      }

      selections[sel.key] = {
        market: sel.market,
        selection: sel.selection,
        line: sel.line,
        bestOdds,
        worstOdds,
        averageOdds,
        medianOdds,
        bookmakerCount: validPrices.length,
        rows
      };
    }

    return {
      matchId: event.id,
      sportKey: event.sportKey,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      commenceTime: event.commenceTime,
      fetchedAt: new Date().toISOString(),
      isStale: !!event.isStale,
      provider: event.isMock ? 'MockOddsProvider' : 'TheOddsApiProvider',
      selections,
      activeBookmakersEvaluated: targetBookmakerIds
    };
  }
}
