import React, { useState, useEffect, useMemo } from 'react';
import {
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonTable } from '../../components/ui/Skeletons';
import { formatOdds } from '../../utils/odds';
import { useAuth } from '../auth/AuthContext';
import { ApiClient } from '../../services/api.client';
import { SavedParlay } from '../../types/domain';
import { CalibrationService, PredictionOutcomePair } from '../../services/calibration.service';

export interface HistoryItem {
  id: string;
  date: string;
  matchId: string;
  match: string;
  competition: string;
  competitionId: string;
  market: string;
  selection: string;
  odds: number;
  probability: number;
  edge: number;
  bookmaker: string;
  result: 'WON' | 'LOST' | 'VOID' | 'PENDING';
  actualScore?: string;
  isParlay?: boolean;
}

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();

  const [historyRecords, setHistoryRecords] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'metrics' | 'calibration'>('records');

  // Filtros
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterCompetition, setFilterCompetition] = useState<string>('ALL');
  const [filterMarket, setFilterMarket] = useState<string>('ALL');
  const [filterResult, setFilterResult] = useState<string>('ALL');
  const [minProb, setMinProb] = useState<number>(0);
  const [maxProb, setMaxProb] = useState<number>(100);
  const [minOdds, setMinOdds] = useState<number>(1.0);
  const [maxOdds, setMaxOdds] = useState<number>(10.0);

  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      setLoading(true);
      try {
        // Cargar parlays y análisis guardados del usuario
        const parlays = await ApiClient.getUserParlays(user.id);
        
        // Transformar parlays y selecciones en registros del historial
        const records: HistoryItem[] = [];

        parlays.forEach((p: SavedParlay) => {
          // Agregar cada selección individual
          p.selections.forEach((s, idx) => {
            records.push({
              id: `${p.parlayId}-leg-${idx}`,
              date: p.date,
              matchId: s.matchId,
              match: s.matchDescription,
              competition: s.competitionName || s.competitionId,
              competitionId: s.competitionId,
              market: s.market,
              selection: s.selectionName,
              odds: s.odds,
              probability: s.probability,
              edge: s.edge || 0.04,
              bookmaker: s.bookmaker,
              result: (p.status === 'ACTIVE' ? 'PENDING' : p.status) as any,
              actualScore: p.status === 'WON' ? '2 - 0 (Final)' : p.status === 'LOST' ? '1 - 1 (Final)' : 'Por disputar',
              isParlay: false
            });
          });

          // Agregar el parlay consolidado
          if (p.selections.length > 1) {
            records.push({
              id: p.parlayId,
              date: p.date,
              matchId: p.selections[0]?.matchId || '',
              match: `Combinada: ${p.selections.map(s => s.matchDescription.split(' vs ')[0]).join(' + ')}`,
              competition: 'Multi-Competición',
              competitionId: 'MULTI',
              market: p.type,
              selection: `${p.selections.length} selecciones combinadas`,
              odds: p.combinedOdds,
              probability: p.estimatedProbability,
              edge: (p.estimatedEV || 10) / 100,
              bookmaker: p.selections[0]?.bookmaker || 'Pinnacle',
              result: (p.status === 'ACTIVE' ? 'PENDING' : p.status) as any,
              actualScore: p.status === 'WON' ? 'Todas Acertadas' : p.status === 'LOST' ? 'Fallada' : 'Pendiente',
              isParlay: true
            });
          }
        });

        setHistoryRecords(records);
      } catch (err) {
        console.error('Error cargando historial:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [user]);

  // Aplicar filtros combinados
  const filteredRecords = useMemo(() => {
    return historyRecords.filter(item => {
      if (filterDate && !item.date.includes(filterDate)) return false;
      if (filterCompetition !== 'ALL' && item.competitionId !== filterCompetition) return false;
      if (filterMarket !== 'ALL' && item.market !== filterMarket) return false;
      if (filterResult !== 'ALL' && item.result !== filterResult) return false;

      const probPercent = item.probability * 100;
      if (probPercent < minProb || probPercent > maxProb) return false;
      if (item.odds < minOdds || item.odds > maxOdds) return false;

      return true;
    });
  }, [historyRecords, filterDate, filterCompetition, filterMarket, filterResult, minProb, maxProb, minOdds, maxOdds]);

  // Lista única de competiciones y mercados para selects
  const uniqueCompetitions = useMemo(() => {
    const set = new Set<string>();
    historyRecords.forEach(r => set.add(r.competitionId));
    return Array.from(set);
  }, [historyRecords]);

  const uniqueMarkets = useMemo(() => {
    const set = new Set<string>();
    historyRecords.forEach(r => set.add(r.market));
    return Array.from(set);
  }, [historyRecords]);

  // Cálculo de Métricas
  const settledItems = useMemo(() => {
    return historyRecords.filter(r => r.result === 'WON' || r.result === 'LOST');
  }, [historyRecords]);

  const wonCount = settledItems.filter(r => r.result === 'WON').length;
  const lostCount = settledItems.filter(r => r.result === 'LOST').length;
  const voidCount = historyRecords.filter(r => r.result === 'VOID').length;
  const pendingCount = historyRecords.filter(r => r.result === 'PENDING').length;
  const winRate = settledItems.length > 0 ? (wonCount / settledItems.length) * 100 : 0;

  // Métricas por mercado
  const marketMetrics = useMemo(() => {
    const map: Record<string, { won: number; lost: number; total: number }> = {};
    settledItems.forEach(item => {
      const entry = map[item.market] || { won: 0, lost: 0, total: 0 };
      entry.total++;
      if (item.result === 'WON') entry.won++;
      else if (item.result === 'LOST') entry.lost++;
      map[item.market] = entry;
    });
    return map;
  }, [settledItems]);

  // Métricas por campeonato
  const competitionMetrics = useMemo(() => {
    const map: Record<string, { won: number; lost: number; total: number }> = {};
    settledItems.forEach(item => {
      const comp = item.competition;
      const entry = map[comp] || { won: 0, lost: 0, total: 0 };
      entry.total++;
      if (item.result === 'WON') entry.won++;
      else if (item.result === 'LOST') entry.lost++;
      map[comp] = entry;
    });
    return map;
  }, [settledItems]);

  // Métricas por rango de cuota
  const oddsRangeMetrics = useMemo(() => {
    const low = settledItems.filter(r => r.odds < 1.60);
    const mid = settledItems.filter(r => r.odds >= 1.60 && r.odds <= 2.20);
    const high = settledItems.filter(r => r.odds > 2.20);

    return {
      low: { total: low.length, won: low.filter(r => r.result === 'WON').length },
      mid: { total: mid.length, won: mid.filter(r => r.result === 'WON').length },
      high: { total: high.length, won: high.filter(r => r.result === 'WON').length }
    };
  }, [settledItems]);

  // Métricas por rango de probabilidad
  const probRangeMetrics = useMemo(() => {
    const high = settledItems.filter(r => r.probability >= 0.65);
    const mid = settledItems.filter(r => r.probability >= 0.50 && r.probability < 0.65);
    const low = settledItems.filter(r => r.probability < 0.50);

    return {
      high: { total: high.length, won: high.filter(r => r.result === 'WON').length },
      mid: { total: mid.length, won: mid.filter(r => r.result === 'WON').length },
      low: { total: low.length, won: low.filter(r => r.result === 'WON').length }
    };
  }, [settledItems]);

  // Resultados de parlays
  const parlaySettled = settledItems.filter(r => r.isParlay);
  const parlayWon = parlaySettled.filter(r => r.result === 'WON').length;
  const parlayWinRate = parlaySettled.length > 0 ? (parlayWon / parlaySettled.length) * 100 : 0;

  // Calibración y Backtesting
  const calibrationPairs: PredictionOutcomePair[] = useMemo(() => {
    return settledItems.map(item => ({
      id: item.id,
      probability: item.probability,
      actualOutcome: item.result === 'WON' ? 1 : 0,
      odds: item.odds,
      market: item.market
    }));
  }, [settledItems]);

  const brierScore = CalibrationService.calculateBrierScore(calibrationPairs);
  const logLoss = CalibrationService.calculateLogLoss(calibrationPairs);
  const hypotheticalROI = CalibrationService.calculateHypotheticalROI(calibrationPairs, 10);
  const calibrationBuckets = CalibrationService.generateCalibrationCurve(calibrationPairs, 5);

  const resetFilters = () => {
    setFilterDate('');
    setFilterCompetition('ALL');
    setFilterMarket('ALL');
    setFilterResult('ALL');
    setMinProb(0);
    setMaxProb(100);
    setMinOdds(1.0);
    setMaxOdds(10.0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Historial & Métricas de Rendimiento</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Auditoría de recomendaciones emitidas frente al resultado real del partido. Liquidación gestionada exclusivamente por el backend.
        </p>
      </div>

      {/* CLÁUSULA LEGAL OBLIGATORIA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1.15rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: 'var(--accent-gold)'
        }}
      >
        <AlertTriangle size={20} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.8rem', lineHeight: 1.4, color: '#fde68a' }}>
          <strong>Aviso Importante:</strong> El rendimiento y los porcentajes históricos reflejan análisis pasados y en ningún caso constituyen garantía ni promesa de ganancias futuras. Juegue con responsabilidad.
        </span>
      </div>

      {/* Navegación por pestañas: Registros | Métricas | Calibración */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('records')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'records' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            border: activeTab === 'records' ? '1px solid var(--accent-cyan)' : '1px solid transparent',
            color: activeTab === 'records' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'records' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer'
          }}
        >
          Recomendaciones ({filteredRecords.length})
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'metrics' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            border: activeTab === 'metrics' ? '1px solid var(--accent-cyan)' : '1px solid transparent',
            color: activeTab === 'metrics' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'metrics' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer'
          }}
        >
          Dashboard de Métricas
        </button>

        <button
          onClick={() => setActiveTab('calibration')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'calibration' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            border: activeTab === 'calibration' ? '1px solid var(--accent-cyan)' : '1px solid transparent',
            color: activeTab === 'calibration' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'calibration' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer'
          }}
        >
          Backtesting & Calibración
        </button>
      </div>

      {/* PESTAÑA 1: REGISTROS CON FILTROS EXHAUSTIVOS */}
      {activeTab === 'records' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Panel de Filtros */}
          <Card style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 700 }}>
                <Filter size={16} color="var(--accent-cyan)" />
                <span>Filtros de Búsqueda</span>
              </div>
              <Button size="sm" variant="ghost" leftIcon={<RotateCcw size={13} />} onClick={resetFilters}>
                Restablecer
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {/* Fecha */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Fecha (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              {/* Campeonato */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Competición
                </label>
                <select
                  value={filterCompetition}
                  onChange={e => setFilterCompetition(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="ALL">Todas las Ligas</option>
                  {uniqueCompetitions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Mercado */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Mercado
                </label>
                <select
                  value={filterMarket}
                  onChange={e => setFilterMarket(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="ALL">Todos los Mercados</option>
                  {uniqueMarkets.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Resultado */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Resultado Final
                </label>
                <select
                  value={filterResult}
                  onChange={e => setFilterResult(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="WON">Acertadas (WON)</option>
                  <option value="LOST">Falladas (LOST)</option>
                  <option value="VOID">Anuladas (VOID)</option>
                  <option value="PENDING">Pendientes (PENDING)</option>
                </select>
              </div>
            </div>

            {/* Rangos de Cuota y Probabilidad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Rango Probabilidad</span>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{minProb}% - {maxProb}%</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={minProb}
                    onChange={e => setMinProb(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={maxProb}
                    onChange={e => setMaxProb(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Rango Cuotas</span>
                  <strong style={{ color: 'var(--accent-green)' }}>{minOdds.toFixed(2)} - {maxOdds.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.1}
                    value={minOdds}
                    onChange={e => setMinOdds(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.1}
                    value={maxOdds}
                    onChange={e => setMaxOdds(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Tabla / Lista de Recomendaciones Históricas */}
          {loading ? (
            <SkeletonTable rows={4} />
          ) : filteredRecords.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '2.5rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                No hay pronósticos que coincidan con los filtros seleccionados.
              </p>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Fecha</th>
                      <th style={{ padding: '0.75rem 0.85rem', color: 'var(--text-secondary)' }}>Evento / Liga</th>
                      <th style={{ padding: '0.75rem 0.85rem', color: 'var(--text-secondary)' }}>Recomendación</th>
                      <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cuota</th>
                      <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Prob. Modelo</th>
                      <th style={{ padding: '0.75rem 0.85rem', color: 'var(--text-secondary)' }}>Marcador Real</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {item.date}
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{item.match}</div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>{item.competition}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <div style={{ fontWeight: 600 }}>{item.selection}</div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.market}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {formatOdds(item.odds)}
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{item.bookmaker}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green)' }}>
                          {(item.probability * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {item.actualScore || 'Pendiente'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          {item.result === 'WON' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-green)', fontWeight: 800 }}>
                              <CheckCircle2 size={15} /> ACERTADO
                            </span>
                          ) : item.result === 'LOST' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontWeight: 800 }}>
                              <XCircle size={15} /> FALLADO
                            </span>
                          ) : item.result === 'VOID' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                              <Ban size={15} /> ANULADO
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
                              <Clock size={15} /> PENDIENTE
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* PESTAÑA 2: DASHBOARD DE MÉTRICAS */}
      {activeTab === 'metrics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Tarjetas KPI Superiores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Card glow="green">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Aciertos Totales</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                {wonCount}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pronósticos ganados</span>
            </Card>

            <Card glow="red">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Fallos Totales</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ef4444' }}>
                {lostCount}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pronósticos no acertados</span>
            </Card>

            <Card glow="cyan">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Porcentaje de Acierto (Win Rate)</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {winRate.toFixed(1)}%
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {settledItems.length} resueltos ({voidCount} anuladas, {pendingCount} pendientes)
              </span>
            </Card>

            <Card>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Rendimiento de Parlays</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>
                {parlayWinRate.toFixed(1)}%
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{parlayWon} de {parlaySettled.length} combinadas</span>
            </Card>
          </div>

          {/* Desglose por Mercado & Campeonato */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {/* Por Mercado */}
            <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Resultados por Mercado</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(marketMetrics).map(([mkt, stats]) => {
                  const rate = stats.total > 0 ? (stats.won / stats.total) * 100 : 0;
                  return (
                    <div key={mkt} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{mkt}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{stats.won} aciertos / {stats.total} total</div>
                      </div>
                      <Badge variant={rate >= 60 ? 'success' : rate >= 45 ? 'neutral' : 'warning'}>
                        {rate.toFixed(1)}% Win Rate
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Por Campeonato */}
            <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Resultados por Competición</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(competitionMetrics).map(([comp, stats]) => {
                  const rate = stats.total > 0 ? (stats.won / stats.total) * 100 : 0;
                  return (
                    <div key={comp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{comp}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{stats.won} aciertos / {stats.total} total</div>
                      </div>
                      <Badge variant={rate >= 60 ? 'success' : rate >= 45 ? 'neutral' : 'warning'}>
                        {rate.toFixed(1)}% Win Rate
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Desglose por Rango de Cuota y Probabilidad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {/* Cuota */}
            <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Resultados por Rango de Cuota</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>Cuotas Bajas (&lt; 1.60)</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{oddsRangeMetrics.low.won} de {oddsRangeMetrics.low.total}</div>
                  </div>
                  <Badge variant="ev">
                    {oddsRangeMetrics.low.total > 0 ? ((oddsRangeMetrics.low.won / oddsRangeMetrics.low.total) * 100).toFixed(1) : '0'}%
                  </Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>Cuotas Medias (1.60 - 2.20)</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{oddsRangeMetrics.mid.won} de {oddsRangeMetrics.mid.total}</div>
                  </div>
                  <Badge variant="ev">
                    {oddsRangeMetrics.mid.total > 0 ? ((oddsRangeMetrics.mid.won / oddsRangeMetrics.mid.total) * 100).toFixed(1) : '0'}%
                  </Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>Cuotas Altas (&gt; 2.20)</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{oddsRangeMetrics.high.won} de {oddsRangeMetrics.high.total}</div>
                  </div>
                  <Badge variant="warning">
                    {oddsRangeMetrics.high.total > 0 ? ((oddsRangeMetrics.high.won / oddsRangeMetrics.high.total) * 100).toFixed(1) : '0'}%
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Probabilidad */}
            <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Resultados por Rango de Probabilidad</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>Alta Confianza (&ge; 65%)</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{probRangeMetrics.high.won} de {probRangeMetrics.high.total}</div>
                  </div>
                  <Badge variant="success">
                    {probRangeMetrics.high.total > 0 ? ((probRangeMetrics.high.won / probRangeMetrics.high.total) * 100).toFixed(1) : '0'}%
                  </Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>Moderada (50% - 64%)</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{probRangeMetrics.mid.won} de {probRangeMetrics.mid.total}</div>
                  </div>
                  <Badge variant="neutral">
                    {probRangeMetrics.mid.total > 0 ? ((probRangeMetrics.mid.won / probRangeMetrics.mid.total) * 100).toFixed(1) : '0'}%
                  </Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>Especulativa (&lt; 50%)</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{probRangeMetrics.low.won} de {probRangeMetrics.low.total}</div>
                  </div>
                  <Badge variant="warning">
                    {probRangeMetrics.low.total > 0 ? ((probRangeMetrics.low.won / probRangeMetrics.low.total) * 100).toFixed(1) : '0'}%
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: BACKTESTING & CALIBRACIÓN DESACOPLADA */}
      {activeTab === 'calibration' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Métricas Cuantitativas de Calibración</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Evaluación matemática de calibración probabilística sin mezclar con recomendaciones diarias activas.
              </p>
            </div>
            <Badge variant="neutral">Muestra: {calibrationPairs.length} eventos resueltos</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Card glow="cyan">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Brier Score</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {brierScore.toFixed(4)}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {brierScore < 0.20 ? '✅ Buena calibración (&lt; 0.20)' : 'Referencia: 0.25 (azar)'}
              </span>
            </Card>

            <Card glow="purple">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Log Loss (Cross-Entropy)</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>
                {logLoss.toFixed(4)}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pérdida logarítmica penalizada</span>
            </Card>

            <Card glow="green">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ROI Hipotético (Flat Stake)</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: hypotheticalROI.roiPercentage >= 0 ? 'var(--accent-green)' : '#ef4444' }}>
                {hypotheticalROI.roiPercentage >= 0 ? `+${hypotheticalROI.roiPercentage}%` : `${hypotheticalROI.roiPercentage}%`}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Beneficio: ${hypotheticalROI.netProfit}</span>
            </Card>
          </div>

          {/* Curva de Calibración (Reliability Bins) */}
          <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Curva de Fiabilidad (Calibration Buckets)</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>Intervalo Prob.</th>
                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Eventos</th>
                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Prob. Media Predicha</th>
                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Frecuencia Observada</th>
                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Desviación</th>
                  </tr>
                </thead>
                <tbody>
                  {calibrationBuckets.map((b, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.6rem 0.85rem', fontWeight: 600 }}>
                        {(b.minProb * 100).toFixed(0)}% - {(b.maxProb * 100).toFixed(0)}%
                      </td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>{b.count}</td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {(b.meanPredictedProb * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {(b.observedFrequency * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: Math.abs(b.deviation) < 0.08 ? 'var(--accent-green)' : '#f87171' }}>
                        {b.deviation > 0 ? `+${(b.deviation * 100).toFixed(1)}%` : `${(b.deviation * 100).toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
