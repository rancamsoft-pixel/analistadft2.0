import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Zap,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Calendar,
  Clock,
  User as UserIcon,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Info
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeletons';
import { useAuth } from '../auth/AuthContext';
import { ApiClient } from '../../services/api.client';
import { SavedParlay, ParlaySelection } from '../../types/domain';
import { formatOdds } from '../../utils/odds';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [parlays, setParlays] = useState<SavedParlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Hoy 07:00');

  const loadDailyParlays = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await ApiClient.getUserParlays(user.id);
      setParlays(data || []);
      if (data && data.length > 0 && data[0]?.generatedAt) {
        const genDate = new Date(data[0].generatedAt);
        setLastUpdated(
          genDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        );
      }
    } catch (err) {
      console.error('Error cargando parlays diarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyParlays();
  }, [user]);

  const handleGenerateNow = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const fresh = await ApiClient.generateUserParlays(user.id);
      setParlays(fresh);
      setLastUpdated(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Error al generar análisis ahora:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Formato de fecha actual en español
  const formattedToday = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Saludo amigable según la hora
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const userName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Analista';

  // Clasificación de parlays para bloques del dashboard
  const focoDelDia = parlays.find(p => p.displayCategory === 'FOCO_DEL_DIA') || parlays[0];
  const parlayAltaProb = parlays.find(
    p => p.displayCategory === 'ALTA_PROBABILIDAD' || p.type === 'HIGH_PROBABILITY_PARLAY'
  );
  const parlayValor = parlays.find(
    p => p.displayCategory === 'VALOR' || p.type === 'VALUE_PARLAY'
  );
  const alternativas = parlays.filter(
    p =>
      p.parlayId !== focoDelDia?.parlayId &&
      p.parlayId !== parlayAltaProb?.parlayId &&
      p.parlayId !== parlayValor?.parlayId
  );

  // Primera selección destacada del Foco del Día para mostrar todos los datos requeridos
  const primarySelection: ParlaySelection | undefined = focoDelDia?.selections[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem' }}>
      {/* 1. HEADER MOBILE-FIRST */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          padding: '1.25rem',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(6, 182, 212, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {greeting}
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.15rem 0 0 0' }}>
              Hola, {userName} 👋
            </h1>
          </div>

          <button
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              color: '#ffffff',
              border: '2px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
            }}
            aria-label="Acceder al perfil"
          >
            <UserIcon size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <Calendar size={14} color="var(--accent-cyan)" />
            <span style={{ textTransform: 'capitalize' }}>{formattedToday}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
            <Clock size={13} color="var(--accent-green)" />
            <span style={{ color: 'var(--text-muted)' }}>Última actualización:</span>
            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{lastUpdated}</span>
          </div>
        </div>
      </header>

      {/* LOADING STATE CON SKELETONS */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <SkeletonCard height="240px" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <SkeletonCard height="180px" />
            <SkeletonCard height="180px" />
          </div>
        </div>
      )}

      {/* EMPTY STATE CUANDO NO HAY ANÁLISIS GENERADOS AÚN */}
      {!loading && parlays.length === 0 && (
        <Card glow="cyan" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}
          >
            <Sparkles size={28} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              Sin análisis disponibles para hoy
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '420px', margin: '0.5rem auto 0 auto', lineHeight: 1.5 }}>
              El Agente Diario ejecuta el análisis global automáticamente a las 07:00 (America/Bogota). También puedes generar las oportunidades ahora basadas en tus ligas activas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="accent"
              isLoading={generating}
              leftIcon={<RefreshCw size={16} />}
              onClick={handleGenerateNow}
            >
              Generar Oportunidades Ahora
            </Button>
            <Button variant="secondary" onClick={() => navigate('/matches')}>
              Ver Partidos Programados
            </Button>
          </div>
        </Card>
      )}

      {/* 2. BLOQUE PRINCIPAL: "FOCO DEL DÍA" */}
      {!loading && focoDelDia && primarySelection && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}
              >
                <Zap size={16} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                FOCO DEL DÍA
              </h2>
            </div>
            <Badge variant="ev">OPORTUNIDAD PRINCIPAL</Badge>
          </div>

          <Card
            glow="cyan"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem',
              padding: '1.25rem',
              border: '1px solid rgba(6, 182, 212, 0.4)'
            }}
          >
            {/* Partido y Competición */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {primarySelection.competitionName || primarySelection.competitionId}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.2rem' }}>
                  {primarySelection.matchDescription}
                </h3>
              </div>
              <Badge variant="neutral">
                {focoDelDia.selections.length > 1 ? `Combinada (${focoDelDia.selections.length} eventos)` : 'Selección Simple'}
              </Badge>
            </div>

            {/* Mercado, Cuota, Mejor Casa, Probabilidad Estimada, Edge */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mercado & Selección</span>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                  {primarySelection.selectionName}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cuota (Mejor Casa)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {formatOdds(primarySelection.odds)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    @{primarySelection.bookmaker}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Probabilidad Estimada</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                  {(primarySelection.probability * 100).toFixed(1)}%
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ventaja (Edge) / EV</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center' }}>
                  <ArrowUpRight size={16} />
                  +{((primarySelection.edge || 0.045) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Calidad de Datos & Riesgos Detectados */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Calidad de datos:</span>
                <Badge variant={primarySelection.dataQuality === 'VERY_HIGH' || primarySelection.dataQuality === 'HIGH' ? 'success' : 'warning'}>
                  {primarySelection.dataQuality}
                </Badge>
                {focoDelDia.correlationRisk !== 'NONE' && (
                  <Badge variant="warning">Correlación: {focoDelDia.correlationRisk}</Badge>
                )}
              </div>

              {focoDelDia.explanation?.riskFactors && focoDelDia.explanation.riskFactors.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.78rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.08)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                  <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>Riesgos:</strong> {focoDelDia.explanation.riskFactors.join('. ')}</span>
                </div>
              )}
            </div>

            {/* Resumen del Análisis */}
            {focoDelDia.explanation?.summary && (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {focoDelDia.explanation.summary}
              </p>
            )}

            {/* Botón: Ver análisis */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <Button
                variant="accent"
                rightIcon={<ChevronRight size={16} />}
                onClick={() => navigate(`/matches/${primarySelection.matchId}`)}
              >
                Ver análisis
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* 3. PARLEY ALTA PROBABILIDAD */}
      {!loading && parlayAltaProb && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="var(--accent-green)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                PARLEY ALTA PROBABILIDAD
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>
              Prob. Conjunta: {(parlayAltaProb.estimatedProbability * 100).toFixed(1)}%
            </span>
          </div>

          <Card
            glow="green"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}
          >
            {/* Lista de selecciones del parlay */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {parlayAltaProb.selections.map((sel, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sel.matchDescription}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                      {sel.selectionName} ({sel.market})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {formatOdds(sel.odds)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{sel.bookmaker}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer de métricas y acción */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cuota Combinada: </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                  {formatOdds(parlayAltaProb.combinedOdds)}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                rightIcon={<ChevronRight size={14} />}
                onClick={() => navigate(`/matches/${parlayAltaProb.selections[0]?.matchId}`)}
              >
                Ver análisis
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* 4. PARLEY DE VALOR */}
      {!loading && parlayValor && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                PARLEY DE VALOR
              </h3>
            </div>
            <span className="badge-ev">
              +{parlayValor.estimatedEV.toFixed(1)}% EV Acumulado
            </span>
          </div>

          <Card
            glow="cyan"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}
          >
            {/* Lista de selecciones de valor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {parlayValor.selections.map((sel, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sel.matchDescription}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                      {sel.selectionName} (+{((sel.edge || 0.04) * 100).toFixed(1)}% Edge)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {formatOdds(sel.odds)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{sel.bookmaker}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer de métricas y acción */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cuota Combinada: </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {formatOdds(parlayValor.combinedOdds)}
                </span>
              </div>
              <Button
                size="sm"
                variant="accent"
                rightIcon={<ChevronRight size={14} />}
                onClick={() => navigate(`/matches/${parlayValor.selections[0]?.matchId}`)}
              >
                Ver análisis
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* 5. OTRAS OPORTUNIDADES */}
      {!loading && alternativas.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} color="var(--accent-gold)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              OTRAS OPORTUNIDADES
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.85rem' }}>
            {alternativas.flatMap(alt => alt.selections).map((item, i) => (
              <Card
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  padding: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.competitionName || 'Liga'}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                      Prob: {(item.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.matchDescription}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                    {item.selectionName} ({item.market})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cuota: </span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                      {formatOdds(item.odds)}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                      @{item.bookmaker}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    rightIcon={<ChevronRight size={13} />}
                    onClick={() => navigate(`/matches/${item.matchId}`)}
                  >
                    Ver análisis
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* AVISO DE RESPONSABILIDAD LEGAL */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}
      >
        <Info size={16} style={{ flexShrink: 0, color: 'var(--accent-cyan)' }} />
        <span>
          Las cuotas y estimaciones del modelo son netamente informativas y probabilísticas. Ningún cálculo matemático garantiza resultados futuros.
        </span>
      </div>
    </div>
  );
};
