import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Calendar, Zap } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loader } from '../../components/ui/Loader';
import { ApiClient } from '../../services/api.client';
import { Competition, SportMatch } from '../../types/domain';
import { formatOdds } from '../../utils/odds';
import { formatDate } from '../../utils/formatters';

export const MatchesPage: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<SportMatch[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const [selectedComp, setSelectedComp] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [compList, matchList] = await Promise.all([
          ApiClient.getCompetitions(),
          ApiClient.getMatches(statusFilter, selectedComp === 'all' ? undefined : selectedComp)
        ]);
        setCompetitions(compList);
        setMatches(matchList);
      } catch (err) {
        console.error('Error al cargar partidos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [statusFilter, selectedComp]);

  const filteredMatches = matches.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.homeTeam.name.toLowerCase().includes(q) ||
      m.awayTeam.name.toLowerCase().includes(q) ||
      m.competition.name.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Explorador de Partidos</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Visualiza partidos en vivo, próximos eventos y cuotas comparadas en tiempo real.
        </p>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.3rem', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '0.45rem 1rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: statusFilter === 'all' ? 'var(--accent-blue)' : 'transparent',
                color: statusFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Todos ({matches.length})
            </button>
            <button
              onClick={() => setStatusFilter('live')}
              style={{
                padding: '0.45rem 1rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: statusFilter === 'live' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                color: statusFilter === 'live' ? '#f87171' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Flame size={14} /> En Vivo
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              style={{
                padding: '0.45rem 1rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: statusFilter === 'upcoming' ? 'var(--accent-blue)' : 'transparent',
                color: statusFilter === 'upcoming' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Calendar size={14} /> Próximos
            </button>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '260px', flex: 1, maxWidth: '380px' }}>
            <Input
              placeholder="Buscar equipo o competición..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>
        </div>

        {/* Competitions Quick Select */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
          <button
            onClick={() => setSelectedComp('all')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              border: selectedComp === 'all' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              background: selectedComp === 'all' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: selectedComp === 'all' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Todas las Ligas
          </button>
          {competitions.map(comp => (
            <button
              key={comp.id}
              onClick={() => setSelectedComp(comp.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                border: selectedComp === comp.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: selectedComp === comp.id ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedComp === comp.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <img src={comp.emblem} alt="" style={{ width: '14px', height: '14px' }} />
              <span>{comp.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Matches List */}
      {loading ? (
        <Loader label="Obteniendo eventos deportivos..." />
      ) : filteredMatches.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No se encontraron partidos con los filtros seleccionados.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredMatches.map(match => (
            <Card
              key={match.id}
              interactive
              onClick={() => navigate(`/matches/${match.id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                alignItems: 'center'
              }}
            >
              {/* Left Column: Match Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <img src={match.competition.emblem} alt="" style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {match.competition.name}
                  </span>
                  {match.status === 'LIVE' ? (
                    <Badge variant="live">EN VIVO ({match.minute}')</Badge>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatDate(match.utcDate)}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <img src={match.homeTeam.logo} alt="" style={{ width: '22px', height: '22px' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{match.homeTeam.name}</span>
                    </div>
                    {match.status === 'LIVE' && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem' }}>
                        {match.score.home}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <img src={match.awayTeam.logo} alt="" style={{ width: '22px', height: '22px' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{match.awayTeam.name}</span>
                    </div>
                    {match.status === 'LIVE' && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem' }}>
                        {match.score.away}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Odds & Quick Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '280px' }}>
                  <div className="odds-btn" style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>1</span>
                    <span>{formatOdds(1.85)}</span>
                  </div>
                  <div className="odds-btn" style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>X</span>
                    <span>{formatOdds(3.60)}</span>
                  </div>
                  <div className="odds-btn" style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>2</span>
                    <span>{formatOdds(4.20)}</span>
                  </div>
                </div>

                <Button size="sm" variant="accent" rightIcon={<Zap size={15} />}>
                  Analizar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
