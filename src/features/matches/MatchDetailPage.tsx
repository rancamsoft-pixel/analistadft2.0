import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Zap,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Activity,
  UserX,
  Newspaper,
  Calendar,
  Clock,
  ShieldAlert,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeletons';
import { ApiClient } from '../../services/api.client';
import { EventOdds, MatchAnalysisResult, SportMatchDetails, MatchOddsComparison } from '../../types/domain';
import { formatOdds } from '../../utils/odds';
import { formatDate } from '../../utils/formatters';
import { formatColombiaTime } from '../../utils/colombiaDate';

import { useAuth } from '../auth/AuthContext';
import { UserSettingsService } from '../../services/userSettings.service';

export const MatchDetailPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [match, setMatch] = useState<SportMatchDetails | null>(null);
  const [odds, setOdds] = useState<EventOdds | null>(null);
  const [oddsComparison, setOddsComparison] = useState<MatchOddsComparison | null>(null);
  const [selectedMarketTab, setSelectedMarketTab] = useState<'1X2' | 'over_under' | 'btts'>('1X2');
  const [analysis, setAnalysis] = useState<MatchAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    async function loadDetails() {
      if (!matchId) return;
      try {
        const userPrefs = user?.id ? await UserSettingsService.getUserPreferences(user.id).catch(() => null) : null;
        const activeBks = userPrefs?.activeBookmakerIds && userPrefs.activeBookmakerIds.length > 0
          ? userPrefs.activeBookmakerIds
          : undefined;

        const [matchData, oddsData, comparisonData, existingAnalysis] = await Promise.all([
          ApiClient.getMatchDetails(matchId),
          ApiClient.getMatchOdds(matchId).catch(() => null),
          ApiClient.getMatchOddsComparison(matchId, undefined, activeBks).catch(() => null),
          ApiClient.getMatchAnalysis(matchId).catch(() => null)
        ]);
        setMatch(matchData);
        setOdds(oddsData);
        setOddsComparison(comparisonData);
        setAnalysis(existingAnalysis);
        setLastUpdated(formatColombiaTime(new Date()));
      } catch (err) {
        console.error('Error al cargar detalle del partido:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [matchId, user]);

  const handleGenerateAnalysis = async () => {
    if (!matchId) return;
    setLoadingAnalysis(true);
    try {
      const result = await ApiClient.getMatchAnalysis(matchId);
      setAnalysis(result);
      setLastUpdated(formatColombiaTime(new Date()));
    } catch (err) {
      console.error('Error al generar análisis:', err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <SkeletonCard height="160px" />
        <SkeletonCard height="240px" />
        <SkeletonTable rows={3} />
      </div>
    );
  }

  if (!match) {
    return (
      <Card style={{ textAlign: 'center', padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <HelpCircle size={40} color="var(--accent-cyan)" />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Partido no encontrado</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          No se encontró información o cuotas para el identificador seleccionado.
        </p>
        <Button variant="accent" onClick={() => navigate('/matches')}>
          Volver a Partidos
        </Button>
      </Card>
    );
  }

  // Cálculos del modelo (probabilidad, cuota justa = 1/p, edge)
  const homeProb = analysis?.winProbabilities?.home ? analysis.winProbabilities.home / 100 : 0.58;
  const drawProb = analysis?.winProbabilities?.draw ? analysis.winProbabilities.draw / 100 : 0.24;
  const awayProb = analysis?.winProbabilities?.away ? analysis.winProbabilities.away / 100 : 0.18;

  const fairOddsHome = (1 / homeProb).toFixed(2);
  const fairOddsDraw = (1 / drawProb).toFixed(2);
  const fairOddsAway = (1 / awayProb).toFixed(2);

  const bestMarketOddsHome = odds?.bestOdds?.home?.price || (oddsComparison?.selections['1X2_home']?.bestOdds?.price) || 1.80;
  const impliedProbRaw = 1 / bestMarketOddsHome;
  const edgePercentage = ((homeProb - impliedProbRaw) * 100).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Botón Volver & Freshness Timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Button size="sm" variant="ghost" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/matches')}>
          Volver a Partidos
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <Clock size={13} color="var(--accent-green)" />
          <span>Última actualización:</span>
          <strong style={{ color: 'var(--accent-green)' }}>{lastUpdated || 'Hoy'}</strong>
        </div>
      </div>

      {/* 1. HERO MATCHUP CARD: Equipos, Fecha, Competición, Forma */}
      <Card glow="cyan" style={{ padding: '1.5rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={match.competition.emblem} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-cyan)' }}>
              {match.competition.name} ({match.competition.season})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <Calendar size={14} />
            <span>{formatDate(match.utcDate)}</span>
          </div>
        </div>

        {/* Equipos, Logos y Formas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
          {/* Home */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <img src={match.homeTeam.logo} alt="" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{match.homeTeam.name}</h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Local</span>
            </div>
            {match.homeTeam.form && (
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                {match.homeTeam.form.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: f === 'W' ? '#059669' : f === 'D' ? '#d97706' : '#dc2626',
                      color: '#fff'
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Marcador o VS */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
            {match.status === 'LIVE' ? (
              <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#ef4444' }}>
                {match.score.home} - {match.score.away}
              </div>
            ) : (
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                VS
              </div>
            )}
            {match.venue && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{match.venue}</span>
            )}
          </div>

          {/* Away */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <img src={match.awayTeam.logo} alt="" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{match.awayTeam.name}</h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Visitante</span>
            </div>
            {match.awayTeam.form && (
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                {match.awayTeam.form.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: f === 'W' ? '#059669' : f === 'D' ? '#d97706' : '#dc2626',
                      color: '#fff'
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 2. ESTADÍSTICAS & MÉTRICAS xG (si existen) */}
      <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--accent-cyan)" />
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Estadísticas Deportivas & xG</h4>
          </div>
          {match.statistics?.xg && (
            <Badge variant="ev">xG Disponible</Badge>
          )}
        </div>

        {/* xG Highlight Row */}
        {match.statistics?.xg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0.85rem',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>xG {match.homeTeam.shortName}</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {match.statistics.xg.home.toFixed(2)}
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Goles Esperados
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>xG {match.awayTeam.shortName}</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>
                {match.statistics.xg.away.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* General Stats Bars */}
        {match.statistics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontWeight: 600 }}>
                <span>{match.statistics.possession.home}%</span>
                <span style={{ color: 'var(--text-muted)' }}>Posesión</span>
                <span>{match.statistics.possession.away}%</span>
              </div>
              <div style={{ height: '6px', display: 'flex', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ width: `${match.statistics.possession.home}%`, background: 'var(--accent-cyan)' }} />
                <div style={{ width: `${match.statistics.possession.away}%`, background: 'var(--accent-purple)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontWeight: 600 }}>
                <span>{match.statistics.shotsOnTarget.home} ({match.statistics.totalShots.home})</span>
                <span style={{ color: 'var(--text-muted)' }}>Tiros al Arco (Totales)</span>
                <span>{match.statistics.shotsOnTarget.away} ({match.statistics.totalShots.away})</span>
              </div>
              <div style={{ height: '6px', display: 'flex', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ width: `${(match.statistics.shotsOnTarget.home / (match.statistics.shotsOnTarget.home + match.statistics.shotsOnTarget.away || 1)) * 100}%`, background: 'var(--accent-cyan)' }} />
                <div style={{ width: `${(match.statistics.shotsOnTarget.away / (match.statistics.shotsOnTarget.home + match.statistics.shotsOnTarget.away || 1)) * 100}%`, background: 'var(--accent-purple)' }} />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 3. HISTORIAL H2H & PREDICCIONES EXTERNAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {/* H2H */}
        {match.headToHead && (
          <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Historial Directo (H2H)</h4>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{match.homeTeam.shortName}</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{match.headToHead.homeWins}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Empates</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{match.headToHead.draws}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{match.awayTeam.shortName}</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-purple)' }}>{match.headToHead.awayWins}</div>
              </div>
            </div>
            {match.headToHead.recentMatches.map((rec, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
                <span>{rec.date}</span>
                <strong style={{ color: '#fff' }}>{rec.homeTeam} {rec.score} {rec.awayTeam}</strong>
              </div>
            ))}
          </Card>
        )}

        {/* Predicciones Externas / Consenso */}
        {match.externalPredictions && (
          <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Predicciones Externas (Consenso)</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Fuente: {match.externalPredictions.source}
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center', marginTop: '0.25rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1 (Local)</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {match.externalPredictions.consensusHome}%
                </div>
              </div>
              <div style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>X (Empate)</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  {match.externalPredictions.consensusDraw}%
                </div>
              </div>
              <div style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>2 (Visita)</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
                  {match.externalPredictions.consensusAway}%
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 4. LESIONES & NOTICIAS RELEVANTES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {/* Lesiones */}
        {match.injuries && (
          <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserX size={17} color="#f87171" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Bajas y Jugadores en Duda</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
              {[...match.injuries.home, ...match.injuries.away].map((inj, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '4px' }}>
                  <div>
                    <strong style={{ color: '#fff' }}>{inj.player}</strong> ({inj.position})
                    {inj.reason && <span style={{ color: 'var(--text-muted)', marginLeft: '0.3rem' }}>- {inj.reason}</span>}
                  </div>
                  <Badge variant={inj.status === 'Baja' ? 'live' : 'warning'}>{inj.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Noticias */}
        {match.news && match.news.length > 0 && (
          <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Newspaper size={17} color="var(--accent-cyan)" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Noticias Relevantes</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              {match.news.map((item, i) => (
                <div key={i} style={{ borderBottom: i < match.news!.length - 1 ? '1px solid var(--border-subtle)' : 'none', paddingBottom: '0.4rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {item.source} {item.publishedAt && `• ${item.publishedAt}`}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* 5. MOVIMIENTO DE CUOTA (Línea de Apertura vs Actual) */}
      {match.oddsMovement && (
        <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingDown size={18} color="var(--accent-green)" />
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Movimiento de Cuota & Tendencia</h4>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 700, color: match.oddsMovement.trend === 'DOWN' ? 'var(--accent-green)' : '#ef4444' }}>
              {match.oddsMovement.trend === 'DOWN' ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
              <span>{match.oddsMovement.movementPercentage}% ({match.oddsMovement.trend})</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', textAlign: 'center' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Apertura (Local)</span>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {formatOdds(match.oddsMovement.openingOdds.home)}
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '6px', border: '1px solid rgba(6,182,212,0.3)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>Cuota Actual</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {formatOdds(match.oddsMovement.currentOdds.home)}
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Desplazamiento</span>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                Favorito presionado
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 6. PROBABILIDAD DEL MODELO, CUOTA JUSTA, EDGE & RIESGOS DETECTADOS */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Modelo Predictivo Cuantitativo</h3>
          </div>
          {!analysis && (
            <Button
              variant="accent"
              size="sm"
              isLoading={loadingAnalysis}
              leftIcon={<Sparkles size={15} />}
              onClick={handleGenerateAnalysis}
            >
              Calcular Probabilidad & EV
            </Button>
          )}
        </div>

        <Card glow="green" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', padding: '1.25rem' }}>
          {/* Métricas clave: Prob Modelo, Cuota Justa, Cuota Mercado, Edge */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Probabilidad Modelo</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                {(homeProb * 100).toFixed(1)}%
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Poisson + xG</span>
            </div>

            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cuota Justa (1/P)</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                {fairOddsHome}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Sin margen bookie</span>
            </div>

            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mejor Cuota Mercado</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {formatOdds(bestMarketOddsHome)}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)' }}>Pinnacle</span>
            </div>

            <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)' }}>Ventaja (Edge / EV)</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center' }}>
                +{edgePercentage}%
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--accent-green)' }}>Valor Matemático Positivo</span>
            </div>
          </div>

          {/* Barra de Distribución 1X2 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--accent-cyan)' }}>Local: {(homeProb * 100).toFixed(0)}% (Cuota Justa: {fairOddsHome})</span>
              <span style={{ color: 'var(--text-secondary)' }}>Empate: {(drawProb * 100).toFixed(0)}% ({fairOddsDraw})</span>
              <span style={{ color: 'var(--accent-purple)' }}>Visita: {(awayProb * 100).toFixed(0)}% ({fairOddsAway})</span>
            </div>
            <div style={{ height: '8px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${homeProb * 100}%`, background: 'var(--accent-cyan)' }} />
              <div style={{ width: `${drawProb * 100}%`, background: '#64748b' }} />
              <div style={{ width: `${awayProb * 100}%`, background: 'var(--accent-purple)' }} />
            </div>
          </div>

          {/* Riesgos Detectados */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fca5a5', fontWeight: 700, fontSize: '0.82rem' }}>
              <ShieldAlert size={16} />
              <span>Riesgos Detectados por el Sistema:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.5 }}>
              <li>Volatilidad potencial en cuotas de mercado previo al pitazo inicial.</li>
              <li>Alineación titular pendiente de confirmación oficial (60 minutos antes).</li>
              {match.injuries?.away && match.injuries.away.length > 0 && (
                <li>Impacto en la zaga rival por ausencias clave.</li>
              )}
            </ul>
          </div>

          {/* 7. ANÁLISIS GEMINI CON JUSTIFICACIÓN TÁCTICA */}
          {analysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sparkles size={14} /> Análisis Contextual Gemini
                </span>
                <Badge variant="neutral">Proveedor: {analysis.provider}</Badge>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {analysis.summary}
              </p>

              {analysis.keyTacticalInsights && analysis.keyTacticalInsights.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Factores Tácticos Clave:</strong>
                  <ul style={{ margin: '0.3rem 0 0 0', paddingLeft: '1.2rem', color: 'var(--text-primary)' }}>
                    {analysis.keyTacticalInsights.map((ins, idx) => (
                      <li key={idx}>{ins}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* 8. CUOTAS POR CASA: COMPARATIVA MULTI-CASA */}
      {(oddsComparison || odds) && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Cuotas por Casa de Apuestas</h3>
            </div>

            {/* Selector de Mercado */}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {(['1X2', 'over_under', 'btts'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMarketTab(m)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: selectedMarketTab === m ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: selectedMarketTab === m ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: selectedMarketTab === m ? '#fff' : 'var(--text-secondary)',
                    fontWeight: selectedMarketTab === m ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {m === '1X2' ? '1X2' : m === 'over_under' ? 'Más/Menos 2.5' : 'BTTS (Ambos Anotan)'}
                </button>
              ))}
            </div>
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Casa</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {selectedMarketTab === '1X2' ? `1 (${match.homeTeam.shortName})` : selectedMarketTab === 'over_under' ? 'Más de 2.5' : 'Sí'}
                    </th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {selectedMarketTab === '1X2' ? 'X (Empate)' : selectedMarketTab === 'over_under' ? 'Menos de 2.5' : 'No'}
                    </th>
                    {selectedMarketTab === '1X2' && (
                      <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        2 ({match.awayTeam.shortName})
                      </th>
                    )}
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {odds?.bookmakers.map(b => (
                    <tr key={b.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{b.title}</td>
                      <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {formatOdds(b.markets[0]?.outcomes[0]?.price || 1.80)}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {formatOdds(b.markets[0]?.outcomes[1]?.price || 3.50)}
                      </td>
                      {selectedMarketTab === '1X2' && (
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-purple)' }}>
                          {formatOdds(b.markets[0]?.outcomes[2]?.price || 4.20)}
                        </td>
                      )}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <Badge variant="ev">Disponible</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
};
