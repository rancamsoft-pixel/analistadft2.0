import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loader } from '../../components/ui/Loader';
import { ApiClient } from '../../services/api.client';
import { MatchAnalysisResult, SportMatch } from '../../types/domain';
import { formatOdds } from '../../utils/odds';

export const AnalysisPage: React.FC = () => {
  const [matches, setMatches] = useState<SportMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('match-101');
  const [analysis, setAnalysis] = useState<MatchAnalysisResult | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const list = await ApiClient.getMatches('upcoming');
        setMatches(list);
        if (list[0]) {
          setSelectedMatchId(list[0].id);
          const initialAnalysis = await ApiClient.getMatchAnalysis(list[0].id);
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

      {/* Match Selector Strip */}
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {matches.map(m => {
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
