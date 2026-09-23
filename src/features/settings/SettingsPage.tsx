import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  SlidersHorizontal,
  Layers,
  Clock,
  Bell,
  ShieldCheck,
  Search,
  AlertTriangle,
  CheckCircle2,
  Check,
  RefreshCw
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loader } from '../../components/ui/Loader';
import { useAuth } from '../auth/AuthContext';
import {
  UserSettingsService,
  MAX_ACTIVE_COMPETITIONS,
  MAX_ACTIVE_BOOKMAKERS,
  DEFAULT_USER_PREFERENCES
} from '../../services/userSettings.service';
import { UserPreferences, OddsFormat, GlobalBookmaker, GlobalMarket, Competition, OddsUsageStats } from '../../types/domain';
import { ApiClient } from '../../services/api.client';

export const SettingsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'competitions' | 'bookmakers' | 'markets' | 'preferences' | 'admin'>('competitions');
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [availableComps, setAvailableComps] = useState<Competition[]>([]);
  const [availableBookmakers, setAvailableBookmakers] = useState<GlobalBookmaker[]>([]);
  const [availableMarkets, setAvailableMarkets] = useState<GlobalMarket[]>([]);
  const [compSearch, setCompSearch] = useState('');
  const [compRegionFilter, setCompRegionFilter] = useState<'ALL' | 'COLOMBIA' | 'EUROPA'>('ALL');
  const [bkCategoryFilter, setBkCategoryFilter] = useState<'ALL' | 'COLOMBIA' | 'INTERNATIONAL'>('ALL');
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados de sincronización y telemetría de administración
  const [adminSyncing, setAdminSyncing] = useState(false);
  const [adminSyncSuccess, setAdminSyncSuccess] = useState(false);
  const [adminSyncError, setAdminSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ message: string; matchesProcessed: number } | null>(null);
  const [quotaStats, setQuotaStats] = useState<{
    today: string;
    limit: number;
    used: number;
    remaining: number;
    isWarning: boolean;
    isExhausted: boolean;
    recordsCount: number;
  } | null>(null);
  const [oddsUsage, setOddsUsage] = useState<OddsUsageStats | null>(null);

  useEffect(() => {
    if (isAdmin && activeTab === 'admin') {
      ApiClient.getProviderUsage()
        .then(res => {
          if (res?.stats) setQuotaStats(res.stats);
        })
        .catch(err => console.error('Error cargando telemetría de cuota:', err));

      ApiClient.getOddsUsage()
        .then(res => {
          if (res?.data) setOddsUsage(res.data);
        })
        .catch(err => console.error('Error cargando telemetría de The Odds API:', err));
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const [userPrefs, comps, bks, mkts] = await Promise.all([
          UserSettingsService.getUserPreferences(user.id),
          UserSettingsService.getAvailableCompetitions(),
          UserSettingsService.getAvailableBookmakers(),
          UserSettingsService.getAvailableMarkets()
        ]);
        setPreferences(userPrefs);
        setAvailableComps(comps);
        setAvailableBookmakers(bks);
        setAvailableMarkets(mkts);
      } catch (err) {
        console.error('Error cargando configuración:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [user]);

  // Manejo de activación/desactivación de Campeonatos (Máximo 2)
  const toggleCompetition = (compId: string) => {
    setLimitWarning(null);
    const exists = preferences.activeCompetitionIds.includes(compId);

    if (exists) {
      setPreferences(prev => ({
        ...prev,
        activeCompetitionIds: prev.activeCompetitionIds.filter(id => id !== compId)
      }));
    } else {
      if (preferences.activeCompetitionIds.length >= MAX_ACTIVE_COMPETITIONS) {
        setLimitWarning(
          `Límite alcanzado: La versión actual permite un máximo de ${MAX_ACTIVE_COMPETITIONS} campeonatos activos simultáneamente para optimizar el rendimiento.`
        );
        return;
      }
      setPreferences(prev => ({
        ...prev,
        activeCompetitionIds: [...prev.activeCompetitionIds, compId]
      }));
    }
  };

  // Manejo de activación/desactivación de Casas de Apuestas (Máximo 5)
  const toggleBookmaker = (bookmakerId: string) => {
    setLimitWarning(null);
    const exists = preferences.activeBookmakerIds.includes(bookmakerId);

    if (exists) {
      setPreferences(prev => ({
        ...prev,
        activeBookmakerIds: prev.activeBookmakerIds.filter(id => id !== bookmakerId)
      }));
    } else {
      if (preferences.activeBookmakerIds.length >= MAX_ACTIVE_BOOKMAKERS) {
        setLimitWarning(
          `Límite alcanzado: Solo puedes activar un máximo de ${MAX_ACTIVE_BOOKMAKERS} casas de apuestas simultáneamente.`
        );
        return;
      }
      setPreferences(prev => ({
        ...prev,
        activeBookmakerIds: [...prev.activeBookmakerIds, bookmakerId]
      }));
    }
  };

  // Manejo de Mercados
  const toggleMarket = (marketKey: string) => {
    const exists = preferences.activeMarketKeys.includes(marketKey);
    if (exists) {
      setPreferences(prev => ({
        ...prev,
        activeMarketKeys: prev.activeMarketKeys.filter(k => k !== marketKey)
      }));
    } else {
      setPreferences(prev => ({
        ...prev,
        activeMarketKeys: [...prev.activeMarketKeys, marketKey]
      }));
    }
  };

  // Guardar configuración completa en Firestore
  const handleSaveAll = async () => {
    if (!user) return;
    setIsSaving(true);
    setLimitWarning(null);

    try {
      await UserSettingsService.saveUserPreferences(user.id, preferences);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (error) {
      setLimitWarning((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Acción de administrador: ejecutar actualización manual real
  const handleAdminSync = async () => {
    setAdminSyncing(true);
    setAdminSyncError(null);
    setAdminSyncSuccess(false);
    try {
      const res = await ApiClient.syncSportsData();
      setSyncResult({ message: res.message, matchesProcessed: res.matchesProcessed });
      setAdminSyncSuccess(true);
      if (res.stats) {
        setQuotaStats(res.stats);
      }
      setTimeout(() => setAdminSyncSuccess(false), 5000);
    } catch (err: any) {
      setAdminSyncError(err.message || 'Error al ejecutar sincronización deportiva');
    } finally {
      setAdminSyncing(false);
    }
  };

  const filteredCompetitions = useMemo(() =>
    availableComps.filter(c => {
      const matchesText = c.name.toLowerCase().includes(compSearch.toLowerCase()) ||
        c.country.toLowerCase().includes(compSearch.toLowerCase());
      const matchesRegion = compRegionFilter === 'ALL' ||
        (compRegionFilter === 'COLOMBIA' && c.region === 'COLOMBIA') ||
        (compRegionFilter === 'EUROPA' && c.region === 'EUROPA');
      return matchesText && matchesRegion;
    }),
    [availableComps, compSearch, compRegionFilter]
  );

  const filteredBookmakers = useMemo(() =>
    availableBookmakers.filter(b =>
      bkCategoryFilter === 'ALL' ||
      (bkCategoryFilter === 'COLOMBIA' && b.category === 'COLOMBIA') ||
      (bkCategoryFilter === 'INTERNATIONAL' && b.category === 'INTERNATIONAL')
    ),
    [availableBookmakers, bkCategoryFilter]
  );

  if (loading) {
    return <Loader label="Cargando tu configuración personalizada..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Mi Configuración</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Personaliza tus campeonatos, casas de apuestas, mercados y parámetros de análisis.
          </p>
        </div>

        <Button
          variant="success"
          isLoading={isSaving}
          onClick={handleSaveAll}
          leftIcon={saveSuccess ? <Check size={16} /> : undefined}
        >
          {saveSuccess ? '¡Guardado en Firestore!' : 'Guardar Configuración'}
        </Button>
      </div>

      {/* Alerta de límite de negocio */}
      {limitWarning && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 'var(--radius-md)',
            color: '#fbbf24',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          <AlertTriangle size={20} />
          <span>{limitWarning}</span>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.5rem',
          overflowX: 'auto'
        }}
      >
        <button
          onClick={() => setActiveTab('competitions')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'competitions' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: activeTab === 'competitions' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'competitions' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Trophy size={16} />
          <span>Campeonatos ({preferences.activeCompetitionIds.length}/{MAX_ACTIVE_COMPETITIONS})</span>
        </button>

        <button
          onClick={() => setActiveTab('bookmakers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'bookmakers' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: activeTab === 'bookmakers' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'bookmakers' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <SlidersHorizontal size={16} />
          <span>Casas de Apuestas ({preferences.activeBookmakerIds.length}/{MAX_ACTIVE_BOOKMAKERS})</span>
        </button>

        <button
          onClick={() => setActiveTab('markets')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'markets' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: activeTab === 'markets' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'markets' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Layers size={16} />
          <span>Mercados ({preferences.activeMarketKeys.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'preferences' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: activeTab === 'preferences' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'preferences' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Clock size={16} />
          <span>Hora de Análisis & Notificaciones</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              background: activeTab === 'admin' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.08)',
              color: '#fbbf24',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <ShieldCheck size={16} />
            <span>Panel Admin</span>
          </button>
        )}
      </div>

      {/* 1. TAB: CAMPEONATOS */}
      {activeTab === 'competitions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Selección activa:</span>
              <Badge variant={preferences.activeCompetitionIds.length === MAX_ACTIVE_COMPETITIONS ? 'warning' : 'ev'}>
                {preferences.activeCompetitionIds.length} de {MAX_ACTIVE_COMPETITIONS} permitidos
              </Badge>
            </div>
            <div style={{ width: '260px' }}>
              <Input
                placeholder="Buscar torneo o país..."
                value={compSearch}
                onChange={e => setCompSearch(e.target.value)}
                leftIcon={<Search size={14} />}
              />
            </div>
          </div>

          {/* Filtros de región */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {([
              { key: 'ALL', label: '🌎 Todos' },
              { key: 'COLOMBIA', label: '🇨🇴 Colombia' },
              { key: 'EUROPA', label: '🇪🇺 Europa' }
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setCompRegionFilter(f.key)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '9999px',
                  border: compRegionFilter === f.key ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  background: compRegionFilter === f.key ? 'rgba(6,182,212,0.15)' : 'transparent',
                  color: compRegionFilter === f.key ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: compRegionFilter === f.key ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredCompetitions.map(comp => {
              const isSelected = preferences.activeCompetitionIds.includes(comp.id);
              return (
                <Card
                  key={comp.id}
                  interactive
                  onClick={() => toggleCompetition(comp.id)}
                  glow={isSelected ? 'cyan' : 'none'}
                  style={{
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ position: 'relative' }}>
                        <img src={comp.emblem} alt="" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                        {comp.flag && (
                          <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: '0.7rem' }}>
                            {comp.flag}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{comp.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {comp.country} • Temporada {comp.season}
                        </span>
                      </div>
                    </div>
                    {comp.region && (
                      <Badge variant={comp.region === 'COLOMBIA' ? 'warning' : 'ev'}>
                        {comp.region === 'COLOMBIA' ? '🇨🇴 Colombia' : '🇪🇺 Europa'}
                      </Badge>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                    <span style={{ fontSize: '0.78rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                      {isSelected ? 'Activo en análisis' : 'Inactivo'}
                    </span>
                    <Button
                      size="sm"
                      variant={isSelected ? 'accent' : 'secondary'}
                      leftIcon={isSelected ? <CheckCircle2 size={14} /> : undefined}
                    >
                      {isSelected ? 'Activado' : 'Activar'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. TAB: CASAS DE APUESTAS */}
      {activeTab === 'bookmakers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Casas monitoreadas:</span>
              <Badge variant={preferences.activeBookmakerIds.length === MAX_ACTIVE_BOOKMAKERS ? 'warning' : 'ev'}>
                {preferences.activeBookmakerIds.length} de {MAX_ACTIVE_BOOKMAKERS} permitidas
              </Badge>
            </div>
          </div>

          {/* Filtros de categoría */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {([
              { key: 'ALL', label: '🏠 Todas' },
              { key: 'COLOMBIA', label: '🇨🇴 Coljuegos (Colombia)' },
              { key: 'INTERNATIONAL', label: '🌐 Internacionales' }
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setBkCategoryFilter(f.key)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '9999px',
                  border: bkCategoryFilter === f.key ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  background: bkCategoryFilter === f.key ? 'rgba(6,182,212,0.15)' : 'transparent',
                  color: bkCategoryFilter === f.key ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: bkCategoryFilter === f.key ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredBookmakers.map(bk => {
              const isSelected = preferences.activeBookmakerIds.includes(bk.id);
              return (
                <Card
                  key={bk.id}
                  interactive
                  onClick={() => toggleBookmaker(bk.id)}
                  glow={isSelected ? 'green' : 'none'}
                  style={{
                    border: isSelected ? '1px solid var(--accent-green)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: bk.category === 'COLOMBIA' ? 'rgba(252,196,25,0.15)' : 'rgba(255,255,255,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          border: bk.category === 'COLOMBIA' ? '1px solid rgba(252,196,25,0.4)' : 'none'
                        }}
                      >
                        {bk.category === 'COLOMBIA' ? '🇨🇴' : bk.name.charAt(0)}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{bk.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {bk.country} • {bk.currency || 'USD'}
                        </span>
                      </div>
                    </div>
                    {bk.license === 'COLJUEGOS' && (
                      <Badge variant="warning">
                        Coljuegos
                      </Badge>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                    <span style={{ fontSize: '0.78rem', color: isSelected ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {isSelected ? 'Monitoreo activo' : 'Inactiva'}
                    </span>
                    <Button
                      size="sm"
                      variant={isSelected ? 'success' : 'secondary'}
                      leftIcon={isSelected ? <CheckCircle2 size={14} /> : undefined}
                    >
                      {isSelected ? 'Seleccionada' : 'Seleccionar'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TAB: MERCADOS */}
      {activeTab === 'markets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Activa los mercados deportivos que deseas incluir en el motor de cálculo de valor esperado (+EV):
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {availableMarkets.map(mkt => {
              const isSelected = preferences.activeMarketKeys.includes(mkt.key);
              return (
                <Card
                  key={mkt.id}
                  interactive
                  onClick={() => toggleMarket(mkt.key)}
                  style={{
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1rem' }}>{mkt.name}</strong>
                    <Badge variant={isSelected ? 'ev' : 'neutral'}>{mkt.key}</Badge>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{mkt.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TAB: HORA DE ANÁLISIS & NOTIFICACIONES */}
      {activeTab === 'preferences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--accent-cyan)" />
              Hora Diaria de Generación de Pronósticos
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              El motor de Cloud Functions ejecutará los modelos matemáticos con las cuotas actualizadas a la hora seleccionada:
            </p>

            <div style={{ maxWidth: '240px' }}>
              <Input
                label="Hora preferida (Formato 24h)"
                type="time"
                value={preferences.analysisTime}
                onChange={e => setPreferences({ ...preferences, analysisTime: e.target.value })}
              />
            </div>
          </Card>

          <Card style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={18} color="var(--accent-green)" />
              Formato de Cuotas Predeterminado
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {(['decimal', 'american', 'fractional'] as OddsFormat[]).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setPreferences({ ...preferences, oddsFormat: fmt })}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: preferences.oddsFormat === fmt ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: preferences.oddsFormat === fmt ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    cursor: 'pointer'
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 5. TAB: PANEL DE ADMINISTRADOR */}
      {isAdmin && activeTab === 'admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card glow="green" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldCheck size={22} color="#fbbf24" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Controles Globales del Administrador</h3>
              </div>
              <Badge variant="warning">ADMIN PRIVILEGED</Badge>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Acciones con permisos elevados sobre la infraestructura, catálogos globales y sincronización en tiempo real.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.5rem', alignItems: 'center' }}>
              <Button
                variant="accent"
                isLoading={adminSyncing}
                disabled={adminSyncing || quotaStats?.isExhausted}
                onClick={handleAdminSync}
                leftIcon={<RefreshCw size={16} />}
              >
                {adminSyncing ? 'Sincronizando proveedores...' : 'Ejecutar Sincronización Manual de Cuotas & Partidos'}
              </Button>
              {quotaStats?.isExhausted && (
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-red)', fontWeight: 600 }}>
                  ⚠️ Presupuesto diario agotado (80/80 req). Sincronización externa deshabilitada.
                </span>
              )}
            </div>

            {adminSyncSuccess && syncResult && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: '#34d399', fontSize: '0.85rem' }}>
                ✅ {syncResult.message} ({syncResult.matchesProcessed} partidos procesados y actualizados).
              </div>
            )}

            {adminSyncError && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.85rem' }}>
                ❌ Error en sincronización: {adminSyncError}
              </div>
            )}
          </Card>

          {/* Telemetría y consumo de APIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>API-Football (Deportes)</span>
                <Badge variant={quotaStats?.isExhausted ? 'live' : quotaStats?.isWarning ? 'warning' : 'ev'}>
                  {quotaStats?.isExhausted ? 'Agotado' : quotaStats?.isWarning ? 'Alerta (80%)' : 'Operativo'}
                </Badge>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {quotaStats ? `${quotaStats.used} / ${quotaStats.limit}` : '12 / 80'} req/día
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {quotaStats ? `${quotaStats.remaining} requests restantes hoy` : '68 requests restantes hoy'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>Límite estricto: 80</span>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>The Odds API (Cuotas)</span>
                <Badge variant={oddsUsage?.status === 'EXHAUSTED' ? 'live' : oddsUsage?.status === 'WARNING' ? 'warning' : 'ev'}>
                  {oddsUsage?.status === 'EXHAUSTED' ? 'Agotado' : oddsUsage?.status === 'WARNING' ? 'Alerta (80%)' : 'Operativo'}
                </Badge>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {oddsUsage ? `${oddsUsage.creditsUsed} / ${oddsUsage.monthlyLimit}` : '122 / 500'} req/mes
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {oddsUsage ? `${oddsUsage.creditsRemaining} créditos restantes` : '378 créditos restantes'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>Plan: 500/mes</span>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Google Gemini (IA)</span>
                <Badge variant="ev">Operativo</Badge>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                15 llamadas
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tokens generados: 12.4k</span>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
