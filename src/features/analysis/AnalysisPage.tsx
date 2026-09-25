import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Calendar, CalendarDays } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loader } from '../../components/ui/Loader';
import { ApiClient } from '../../services/api.client';
import { MatchAnalysisResult, SportMatch } from '../../types/domain';
import { formatOdds } from '../../utils/odds';
import { matchesMatchDateFilter, DateFilterOption } from '../../utils/parlayAvailability';

export const AnalysisPage: React.FC = () => {
  const [matches, setMatches] = useState<SportMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('match-col-2');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('ALL');
  const [customDate, setCustomDate] = useState<string>('');
  const [analysis, setAnalysis] = useState<MatchAnalysisResult | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const list = await ApiClient.getMatches('all');
        setMatches(list);
        // Priorizar el superclásico colombiano si está disponible
        const defaultMatch = list.find(m => m.id === 'match-col-2') || list[0];
        if (defaultMatch) {
          setSelectedMatchId(defaultMatch.id);
          const initialAnalysis = await ApiClient.getMatchAnalysis(defaultMatch.id);
          setAnalysis(initialAnalysis);
        }
      } catch (err) {
        console.error('Error cargando partidos para análisis:', err);
      } finally {
        setLoadingMatches(false);
      }
    }
    load();
  }, []);

  const handleSelectMatch = async (id: string) => {
    setSelectedMatchId(id);
    setAnalyzing(true);
    try {
      const res = await ApiClient.getMatchAnalysis(id);
      setAnalysis(res);
    } catch (err) {
      console.error('Error al analizar:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Filtrar partidos por fecha seleccionada
  const activeDate = customDate || dateFilter;
  const filteredMatches = matches.filter(m => matchesMatchDateFilter(m.utcDate, activeDate));

  // Auto-seleccionar primer partido disponible si el actual queda fuera del filtro
  useEffect(() => {
    if (filteredMatches.length > 0 && !filteredMatches.some(m => m.id === selectedMatchId)) {
      handleSelectMatch(filteredMatches[0]!.id);
    }
  }, [dateFilter, customDate, filteredMatches]);

  if (loadingMatches) {
    return <Loader label="Cargando motor predictivo cuantitativo..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Laboratorio de Análisis Cuantitativo</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Modelos probabilísticos, cálculo de Valor Esperado (+EV) y generación de pronósticos de alta confianza.
        </p>
      </div>

      {/* Pestañas de Filtro por Fecha */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Calendar size={14} /> Filtrar Análisis por Fecha:
        </span>

        <button
          type="button"
          onClick={() => { setDateFilter('ALL'); setCustomDate(''); }}
          style={{
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            border: `1px solid ${dateFilter === 'ALL' && !customDate ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
            background: dateFilter === 'ALL' && !customDate ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: dateFilter === 'ALL' && !customDate ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Todas las fechas
        </button>

        <button
          type="button"
          onClick={() => { setDateFilter('TODAY'); setCustomDate(''); }}
          style={{
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            border: `1px solid ${dateFilter === 'TODAY' && !customDate ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
            background: dateFilter === 'TODAY' && !customDate ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: dateFilter === 'TODAY' && !customDate ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Hoy
        </button>

        <button
          type="button"
          onClick={() => { setDateFilter('TOMORROW'); setCustomDate(''); }}
          style={{
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            border: `1px solid ${dateFilter === 'TOMORROW' && !customDate ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
            background: dateFilter === 'TOMORROW' && !customDate ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: dateFilter === 'TOMORROW' && !customDate ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Mañana
        </button>

        <button
          type="button"
          onClick={() => { setDateFilter('WEEKEND'); setCustomDate(''); }}
          style={{
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            border: `1px solid ${dateFilter === 'WEEKEND' && !customDate ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
            background: dateFilter === 'WEEKEND' && !customDate ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: dateFilter === 'WEEKEND' && !customDate ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Fin de semana
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
          <CalendarDays size={14} color="var(--text-muted)" />
          <input
            type="date"
            value={customDate}
            onChange={e => {
              setCustomDate(e.target.value);
              setDateFilter(e.target.value);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.2rem 0.45rem',
              fontSize: '0.75rem',
              color: 'var(--text-primary)',
              colorScheme: 'dark'
            }}
          />
          {customDate && (
            <button
              type="button"
              onClick={() => { setCustomDate(''); setDateFilter('ALL'); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Match Selector Strip */}
      {filteredMatches.length === 0 ? (
        <Card style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No hay partidos para analizar en la fecha seleccionada. Cambia la fecha en el filtro superior.
        </Card>
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {filteredMatches.map(m => {
            const isSelected = m.id === selectedMatchId;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectMatch(m.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <img src={m.competition.emblem} alt="" style={{ width: '16px', height: '16px' }} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {m.homeTeam.shortName} vs {m.awayTeam.shortName}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {analyzing ? (
        <Loader label="Calculando regresión, xG y probabilidades de Poisson..." />
      ) : analysis ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Main Card */}
          <Card glow="green" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Resumen del Modelo</h3>
              </div>
              <Badge variant="ev">SCORE PROYECTADO: {analysis.projectedScore.home} - {analysis.projectedScore.away}</Badge>
            </div>

            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
              {analysis.summary}
            </p>

            {/* Distribution chart bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--accent-cyan)' }}>Local: {analysis.winProbabilities.home}%</span>
                <span style={{ color: 'var(--text-secondary)' }}>Empate: {analysis.winProbabilities.draw}%</span>
                <span style={{ color: 'var(--accent-purple)' }}>Visitante: {analysis.winProbabilities.away}%</span>
              </div>
              <div style={{ height: '12px', display: 'flex', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${analysis.winProbabilities.home}%`, background: 'var(--accent-cyan)' }} />
                <div style={{ width: `${analysis.winProbabilities.draw}%`, background: '#64748b' }} />
                <div style={{ width: `${analysis.winProbabilities.away}%`, background: 'var(--accent-purple)' }} />
              </div>
            </div>

            {/* Tactical insights grid */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Factores Determinantes Clave:
              </h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                {analysis.keyTacticalInsights.map((ins, i) => (
                  <li key={i}>{ins}</li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Value Bets Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="var(--accent-green)" />
              Oportunidades con Margen Positivo sobre la Casa (+EV)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {analysis.valueBets.map((vb, idx) => (
                <Card key={idx} glow="green" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge variant="neutral">{vb.market}</Badge>
                    <span className="badge-ev">+{vb.expectedValuePercentage}% EV</span>
                  </div>

                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{vb.selection}</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cuota Actual</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {formatOdds(vb.currentOdds)}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Probabilidad Modelo</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                        {(vb.estimatedProbability * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Índice de confianza del modelo: <strong>{vb.confidenceScore}/100</strong>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
