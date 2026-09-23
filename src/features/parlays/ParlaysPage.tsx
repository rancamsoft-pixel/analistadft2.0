import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Scale,
  RefreshCw,
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ParlayLeg, SavedParlay, ParlaySelection } from '../../types/domain';
import { ParlayCalculator } from '../../utils/parlayCalculator';
import { formatCurrency } from '../../utils/formatters';
import { ApiClient } from '../../services/api.client';
import { useAuth } from '../auth/AuthContext';
import { UserSettingsService } from '../../services/userSettings.service';

export const ParlaysPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || 'demo-user-1';

  // Estados del motor de parlays automáticos
  const [automatedParlays, setAutomatedParlays] = useState<SavedParlay[]>([]);
  const [loadingParlays, setLoadingParlays] = useState<boolean>(true);
  const [userCompetitions, setUserCompetitions] = useState<string[]>(['PL', 'PD']);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Estados del boleto / simulador manual
  const [legs, setLegs] = useState<ParlayLeg[]>([
    {
      id: 'leg-1',
      matchId: 'match-101',
      matchDescription: 'Arsenal FC vs Chelsea FC',
      selection: 'Arsenal FC (Gana)',
      odds: 1.80,
      estimatedProbability: 0.60
    },
    {
      id: 'leg-2',
      matchId: 'match-102',
      matchDescription: 'Manchester City vs Liverpool FC',
      selection: 'Ambos Equipos Anotan (Sí)',
      odds: 1.62,
      estimatedProbability: 0.68
    }
  ]);

  const [stake, setStake] = useState<number>(20);
  const calculation = ParlayCalculator.calculate(legs, stake);

  // Cargar parlays del usuario al montar
  useEffect(() => {
    loadUserParlays();
  }, [userId]);

  const loadUserParlays = async () => {
    setLoadingParlays(true);
    try {
      const prefs = await UserSettingsService.getUserPreferences(userId);
      setUserCompetitions(prefs.activeCompetitionIds || ['PL', 'PD']);
      const data = await ApiClient.getUserParlays(userId);
      setAutomatedParlays(data);
    } catch (err) {
      console.warn('Error cargando parlays automáticos:', err);
    } finally {
      setLoadingParlays(false);
    }
  };

  const handleGenerateParlays = async () => {
    setLoadingParlays(true);
    try {
      const data = await ApiClient.generateUserParlays(userId);
      setAutomatedParlays(data);
      setFeedbackMsg('¡Combinadas del día generadas con éxito según tus preferencias!');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.warn('Error generando parlays:', err);
    } finally {
      setLoadingParlays(false);
    }
  };

  const handleLoadIntoSlip = (selections: ParlaySelection[]) => {
    const newLegs: ParlayLeg[] = selections.map((s, idx) => ({
      id: `parlay-leg-${Date.now()}-${idx}`,
      matchId: s.matchId,
      matchDescription: s.matchDescription,
      selection: s.selectionName,
      odds: s.odds,
      estimatedProbability: s.probability
    }));
    setLegs(newLegs);
    setFeedbackMsg(`Cargadas ${newLegs.length} selecciones en el simulador.`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleRemoveLeg = (id: string) => {
    setLegs(legs.filter(l => l.id !== id));
  };

  const handleAddSampleLeg = () => {
    const newLeg: ParlayLeg = {
      id: `leg-${Date.now()}`,
      matchId: `match-${Date.now()}`,
      matchDescription: 'Real Madrid vs FC Barcelona',
      selection: 'Más de 2.5 Goles',
      odds: 1.68,
      estimatedProbability: 0.65
    };
    setLegs([...legs, newLeg]);
  };

  const focoDelDia = automatedParlays.find(p => p.displayCategory === 'FOCO_DEL_DIA');
  const parlayPaciencia = automatedParlays.find(p => p.displayCategory === 'PACIENCIA' || p.type === 'PACIENCIA_PARLAY');
  const altaProbabilidad = automatedParlays.find(p => p.displayCategory === 'ALTA_PROBABILIDAD');
  const deValor = automatedParlays.find(p => p.displayCategory === 'VALOR');
  const alternativas = automatedParlays.filter(p => p.displayCategory === 'ALTERNATIVAS');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              color: '#ffffff'
            }}>
              MOTOR ESTADÍSTICO
            </span>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0 }}>Motor de Parlays & Recomendaciones</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '750px' }}>
            Combinaciones generadas automáticamente y evaluadas por modelos matemáticos. Filtro estricto de correlación intra-partido y personalización para tus competiciones activas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button
            variant="primary"
            onClick={handleGenerateParlays}
            disabled={loadingParlays}
            leftIcon={<RefreshCw size={15} className={loadingParlays ? 'spin' : ''} />}
          >
            {loadingParlays ? 'Analizando...' : 'Actualizar Combinadas'}
          </Button>
        </div>
      </div>

      {/* Notificación Feedback */}
      {feedbackMsg && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 'var(--radius-md)',
          color: '#34d399',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Banner de Personalización y Cumplimiento Normativo */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Info size={18} color="var(--accent-cyan)" />
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Personalizado para ti: </span>
            Analizando partidos de <strong style={{ color: 'var(--accent-cyan)' }}>{userCompetitions.join(', ')}</strong>.
            Cada usuario recibe análisis adaptados a sus ligas y casas de apuestas.
          </div>
        </div>

        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '420px', textAlign: 'right' }}>
          ⚠️ La aplicación solamente proporciona análisis cuantitativo y seguimiento. No recomienda apuestas automáticas ni ejecuta apuestas.
        </div>
      </div>

      {/* SECCIÓN 1: RECOMENDACIONES AUTOMÁTICAS DEL DÍA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} color="#fbbf24" />
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Selecciones Estratégicas del Día</h3>
        </div>

        {/* 1. FOCO DEL DÍA (Tarjeta Principal) */}
        {focoDelDia && (
          <Card glow="cyan" style={{ border: '1px solid rgba(6, 182, 212, 0.35)', background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.06), rgba(15, 23, 42, 0.6))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <Badge variant="ev">FOCO DEL DÍA</Badge>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mejor balance cuantitativo</span>
                </div>
                <h4 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                  {focoDelDia.explanation?.summary || 'Combinada Estratégica Destacada'}
                </h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cuota Combinada</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {focoDelDia.combinedOdds.toFixed(2)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valor Esperado (+EV)</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    +{focoDelDia.estimatedEV}%
                  </div>
                </div>

                <Button size="sm" variant="primary" onClick={() => handleLoadIntoSlip(focoDelDia.selections)} rightIcon={<ArrowRight size={14} />}>
                  Cargar al Simulador
                </Button>
              </div>
            </div>

            {/* Selecciones de Foco del Día */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {focoDelDia.selections.map((sel, idx) => (
                <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{sel.matchDescription}</div>
                  <strong style={{ fontSize: '0.95rem', display: 'block', margin: '0.2rem 0' }}>{sel.selectionName}</strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Cuota: <strong style={{ color: '#ffffff' }}>{sel.odds.toFixed(2)}</strong> ({sel.bookmaker})</span>
                    <span style={{ color: 'var(--accent-green)' }}>Prob: {(sel.probability * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Justificación de Gemini / Analista */}
            {focoDelDia.explanation && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Razonamiento Estadístico: </strong>
                  {focoDelDia.explanation.justification}
                </div>
                {focoDelDia.correlationNotes.length > 0 && (
                  <div style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                    <AlertTriangle size={14} />
                    <span>{focoDelDia.correlationNotes.join(' | ')}</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* 2. PARLEY PACIENCIA (Estrategia Multi-Fecha / Máxima Seguridad) */}
        {parlayPaciencia && (
          <Card glow="green" style={{ border: '1px solid rgba(16, 185, 129, 0.4)', background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.06), rgba(15, 23, 42, 0.6))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🐢</span>
                  <Badge variant="success">PARLEY PACIENCIA (MULTI-FECHA)</Badge>
                  <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>Máxima Seguridad Cuantitativa</span>
                </div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {parlayPaciencia.explanation?.summary || 'Combinada Escalonada en Varias Fechas'}
                </h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cuota Combinada</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    {parlayPaciencia.combinedOdds.toFixed(2)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Probabilidad Conjunta</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                    {(parlayPaciencia.estimatedProbability * 100).toFixed(1)}%
                  </div>
                </div>

                <Button size="sm" variant="accent" onClick={() => handleLoadIntoSlip(parlayPaciencia.selections)} rightIcon={<ArrowRight size={14} />}>
                  Cargar al Simulador
                </Button>
              </div>
            </div>

            {/* Timeline / Selecciones escalonadas en varios días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginTop: '1rem' }}>
              {parlayPaciencia.selections.map((sel, idx) => {
                const matchDate = new Date(sel.utcDate);
                const dayName = matchDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                const matchHour = matchDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, textTransform: 'capitalize' }}>
                        📅 {dayName} • {matchHour}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                        {(sel.probability * 100).toFixed(0)}% acierto
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.92rem', display: 'block', margin: '0.15rem 0' }}>{sel.matchDescription}</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>{sel.selectionName} ({sel.market})</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.3rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Cuota: <strong style={{ color: '#ffffff' }}>{sel.odds.toFixed(2)}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>@{sel.bookmaker}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {parlayPaciencia.explanation?.justification && (
              <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.85rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                💡 <strong>Justificación Cuantitativa:</strong> {parlayPaciencia.explanation.justification}
              </div>
            )}
          </Card>
        )}

        {/* 3. PARLEY ALTA PROBABILIDAD Y PARLEY DE VALOR (Grilla de 2 Columnas) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>

          {/* Alta Probabilidad */}
          {altaProbabilidad && (
            <Card glow="cyan" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} color="#3b82f6" />
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>PARLEY ALTA PROBABILIDAD</h4>
                </div>
                <Badge variant="info">MÁX 3 EVENTOS</Badge>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cuota Total</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {altaProbabilidad.combinedOdds.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Prob. Conjunta (Ref.)</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    {(altaProbabilidad.estimatedProbability * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Expectativa</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: altaProbabilidad.estimatedEV >= 0 ? '#34d399' : 'var(--text-muted)' }}>
                    +{altaProbabilidad.estimatedEV}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {altaProbabilidad.selections.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.selectionName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.matchDescription}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.odds.toFixed(2)}</span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)' }}>{(s.probability * 100).toFixed(0)}% prob</div>
                    </div>
                  </div>
                ))}
              </div>

              {altaProbabilidad.explanation?.summary && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {altaProbabilidad.explanation.summary}
                </p>
              )}

              <Button size="sm" variant="secondary" onClick={() => handleLoadIntoSlip(altaProbabilidad.selections)}>
                Cargar en el Simulador
              </Button>
            </Card>
          )}

          {/* De Valor */}
          {deValor && (
            <Card glow="green" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} color="#10b981" />
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>PARLEY DE VALOR (+EV)</h4>
                </div>
                <Badge variant="ev">MÁX 4 EVENTOS</Badge>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cuota Total</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {deValor.combinedOdds.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Edge Máx</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    +{(Math.max(...deValor.selections.map(s => s.edge || 0)) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>EV Conjunto</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    +{deValor.estimatedEV}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {deValor.selections.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.selectionName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.matchDescription}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.odds.toFixed(2)}</span>
                      <div style={{ fontSize: '0.7rem', color: '#34d399' }}>+{((s.edge || 0) * 100).toFixed(1)}% edge</div>
                    </div>
                  </div>
                ))}
              </div>

              {deValor.explanation?.summary && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {deValor.explanation.summary}
                </p>
              )}

              <Button size="sm" variant="secondary" onClick={() => handleLoadIntoSlip(deValor.selections)}>
                Cargar en el Simulador
              </Button>
            </Card>
          )}
        </div>

        {/* 3. ALTERNATIVAS */}
        {alternativas.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scale size={18} color="var(--accent-cyan)" />
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Alternativas & Combinadas Balanceadas</h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {alternativas.map((alt, idx) => (
                <Card key={idx} style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Alternativa #{idx + 1}</span>
                    <Badge variant="neutral">Cuota: {alt.combinedOdds.toFixed(2)}</Badge>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.85rem', fontSize: '0.8rem' }}>
                    {alt.selections.map((s, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{s.selectionName}</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{s.odds.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>EV: +{alt.estimatedEV}%</span>
                    <Button size="sm" variant="ghost" onClick={() => handleLoadIntoSlip(alt.selections)}>
                      Cargar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: SIMULADOR & CONSTRUCTOR DE PARLAYS INTERACTIVO */}
      <div style={{ borderTop: '2px solid var(--border-subtle)', paddingTop: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={22} color="var(--accent-cyan)" />
            Simulador Personalizado de Apuestas Combinadas
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Prueba distintas selecciones, analiza el producto de cuotas y revisa las advertencias de correlación matemática antes de evaluar tu expectativa de rentabilidad.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Parlay Selections List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                Selecciones en el Boleto ({legs.length})
              </h4>
              <Button size="sm" variant="secondary" onClick={handleAddSampleLeg} leftIcon={<Plus size={14} />}>
                Añadir Selección
              </Button>
            </div>

            {legs.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No hay selecciones en tu parlay slip.</p>
                <Button size="sm" variant="primary" style={{ marginTop: '0.75rem' }} onClick={handleAddSampleLeg}>
                  Cargar Selección de Ejemplo
                </Button>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {legs.map(leg => (
                  <Card key={leg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{leg.matchDescription}</span>
                      <strong style={{ fontSize: '0.95rem' }}>{leg.selection}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Probabilidad Estimada: {((leg.estimatedProbability || 0.5) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="odds-btn">
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cuota</span>
                        <span>{leg.odds.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveLeg(leg.id)}
                        aria-label="Eliminar selección"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.4rem'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Warnings */}
            {calculation.warnings.map((warn: string, i: number) => (
              <div
                key={i}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fbbf24',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertTriangle size={16} />
                <span>{warn}</span>
              </div>
            ))}
          </div>

          {/* Right Column: Slip Summary & Math Engine */}
          <div>
            <Card glow={calculation.isRecommended ? 'green' : 'none'} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Resumen del Boleto</h4>
                <Badge variant={calculation.isRecommended ? 'ev' : 'neutral'}>
                  {calculation.isRecommended ? '+EV RECOMENDADO' : 'ANÁLISIS ESTÁNDAR'}
                </Badge>
              </div>

              {/* Odds display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cuota Decimal Total</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {calculation.totalOddsDecimal}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Línea Americana</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {calculation.totalOddsAmerican}
                  </div>
                </div>
              </div>

              {/* Probability and EV Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Probabilidad Implícita (Cuota):</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{calculation.impliedProbabilityPercent}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Probabilidad Conjunta (Modelo Ref.):</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                    {calculation.estimatedJointProbabilityPercent}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>Valor Esperado (+EV):</span>
                  <strong
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: calculation.expectedValuePercentage >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                    }}
                  >
                    {calculation.expectedValuePercentage >= 0 ? `+${calculation.expectedValuePercentage}%` : `${calculation.expectedValuePercentage}%`}
                  </strong>
                </div>
              </div>

              {/* Stake selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Input
                  label="Importe de Apuesta ($)"
                  type="number"
                  min="1"
                  value={stake}
                  onChange={e => setStake(Math.max(1, Number(e.target.value)))}
                />
              </div>

              {/* Potential Payout */}
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Retorno Total Estimado:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    {formatCurrency(calculation.potentialPayout(stake))}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>Ganancia Neta:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                    +{formatCurrency(calculation.potentialProfit(stake))}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
