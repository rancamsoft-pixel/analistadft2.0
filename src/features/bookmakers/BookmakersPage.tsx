import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, Check, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../auth/AuthContext';
import { UserSettingsService, MAX_ACTIVE_BOOKMAKERS } from '../../services/userSettings.service';

interface BookmakerItem {
  name: string;
  key: string;
  category: 'COLOMBIA' | 'INTERNATIONAL';
  type: string;
  margin: string;
  payout: string;
  pros: string[];
  badge: string;
  rating: number;
  license: string;
}

export const BookmakersPage: React.FC = () => {
  const { user } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'COLOMBIA' | 'INTERNATIONAL'>('ALL');
  const [activeBookmakerIds, setActiveBookmakerIds] = useState<string[]>(['betplay', 'wplay', 'pinnacle']);
  const [savingMsg, setSavingMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    UserSettingsService.getUserPreferences(user.id)
      .then(prefs => {
        if (prefs && prefs.activeBookmakerIds) {
          setActiveBookmakerIds(prefs.activeBookmakerIds);
        }
      })
      .catch(err => console.error('Error cargando preferencias de casas:', err));
  }, [user]);

  const toggleBookmaker = async (bkKey: string) => {
    if (!user) return;
    const exists = activeBookmakerIds.includes(bkKey);
    let updated: string[];

    if (exists) {
      if (activeBookmakerIds.length <= 1) {
        setSavingMsg('Debes mantener al menos una casa de apuestas activa.');
        setTimeout(() => setSavingMsg(null), 3000);
        return;
      }
      updated = activeBookmakerIds.filter(id => id !== bkKey);
    } else {
      if (activeBookmakerIds.length >= MAX_ACTIVE_BOOKMAKERS) {
        setSavingMsg(`Máximo ${MAX_ACTIVE_BOOKMAKERS} casas simultáneas permitidas.`);
        setTimeout(() => setSavingMsg(null), 3000);
        return;
      }
      updated = [...activeBookmakerIds, bkKey];
    }

    setActiveBookmakerIds(updated);
    try {
      const prefs = await UserSettingsService.getUserPreferences(user.id);
      await UserSettingsService.saveUserPreferences(user.id, {
        ...prefs,
        activeBookmakerIds: updated
      });
      setSavingMsg(`Preferencias actualizadas: ${updated.length} casas activas para el motor de cuotas.`);
      setTimeout(() => setSavingMsg(null), 3000);
    } catch (err) {
      console.error('Error guardando casas activas:', err);
    }
  };

  const bookmakers: BookmakerItem[] = [
    // Casas Colombianas (Coljuegos)
    {
      name: 'BetPlay',
      key: 'betplay',
      category: 'COLOMBIA',
      type: 'Oficial Liga BetPlay Dimayor',
      margin: '4.2% - 5.2%',
      payout: '95.5%',
      pros: ['Patrocinador oficial del fútbol colombiano', 'Cuotas exclusivas de Liga y Torneo BetPlay', 'Mayor cobertura física y online en Colombia'],
      badge: 'LÍDER EN COLOMBIA',
      rating: 9.7,
      license: 'Coljuegos (Contrato C1444)'
    },
    {
      name: 'Wplay.co',
      key: 'wplay',
      category: 'COLOMBIA',
      type: 'Casa Pionera Regulada',
      margin: '4.5% - 5.5%',
      payout: '95.1%',
      pros: ['Primera casa online con licencia Coljuegos', 'Gran variedad de mercados en vivo para FPC', 'Retiros y depósitos inmediatos en pesos (COP)'],
      badge: 'POPULAR EN VIVO',
      rating: 9.5,
      license: 'Coljuegos (Contrato C1741)'
    },
    {
      name: 'Rushbet.co',
      key: 'rushbet',
      category: 'COLOMBIA',
      type: 'Cuotas Mejoradas & Bonos',
      margin: '4.0% - 5.0%',
      payout: '95.8%',
      pros: ['Margen muy competitivo en fútbol internacional y FPC', 'Streaming en vivo oficial de partidos', 'Programa de lealtad Rushbet VIP'],
      badge: 'MEJOR PAYOUT COL',
      rating: 9.6,
      license: 'Coljuegos (Contrato C1555)'
    },
    {
      name: 'Codere Colombia',
      key: 'codere_co',
      category: 'COLOMBIA',
      type: 'Presencia Internacional & Local',
      margin: '4.8% - 5.8%',
      payout: '94.8%',
      pros: ['Líneas directas en fútbol colombiano y sudamericano', 'Locales físicos en las principales ciudades', 'Promociones en clásicos de la Liga BetPlay'],
      badge: 'TRADICIÓN & RED FÍSICA',
      rating: 9.1,
      license: 'Coljuegos (Contrato C1470)'
    },
    {
      name: 'YaJuego',
      key: 'yajuego',
      category: 'COLOMBIA',
      type: 'Especialista en Fútbol Colombiano',
      margin: '4.2% - 5.2%',
      payout: '95.3%',
      pros: ['Buenas cuotas en doble oportunidad y hándicap', 'Interfaz rápida optimizada para móvil', 'Depósitos fáciles por Efecty y PSE'],
      badge: 'LÍNEAS FPC',
      rating: 9.0,
      license: 'Coljuegos (Contrato C1662)'
    },
    // Casas Internacionales
    {
      name: 'Pinnacle',
      key: 'pinnacle',
      category: 'INTERNATIONAL',
      type: 'Sharp Bookmaker (Referencia Cuantitativa)',
      margin: '2.5% - 3.2%',
      payout: '97.2%',
      pros: ['Límites más altos del mundo', 'Margen mínimo en fútbol global', 'No limita apostadores ganadores (+EV)'],
      badge: 'RECOMENDADA +EV',
      rating: 9.9,
      license: 'Curazao / Internacional'
    },
    {
      name: 'Bet365',
      key: 'bet365',
      category: 'INTERNATIONAL',
      type: 'Soft Bookmaker Global',
      margin: '4.5% - 5.5%',
      payout: '95.1%',
      pros: ['Mayor variedad de mercados a nivel mundial', 'Excelente cobertura de córners y tarjetas', 'Líder en volumen de apuestas en vivo'],
      badge: 'MAYOR LIQUIDEZ',
      rating: 9.4,
      license: 'UK / Gibraltar / Global'
    },
    {
      name: '1xBet',
      key: '1xbet',
      category: 'INTERNATIONAL',
      type: 'High Volume Markets',
      margin: '3.8% - 4.8%',
      payout: '95.8%',
      pros: ['Líneas asiáticas muy extensas', 'Cuotas atractivas en no favoritos (+EV en underdogs)'],
      badge: 'CUOTAS OUTSIDER',
      rating: 8.9,
      license: 'Curazao / Global'
    },
    {
      name: 'Betfair (Exchange)',
      key: 'betfair',
      category: 'INTERNATIONAL',
      type: 'Exchange de Trading',
      margin: '2.0% (Comisión fija)',
      payout: '98.0%',
      pros: ['Trading de cuotas Back/Lay', 'Liquidez de intercambio global sin margen oculto'],
      badge: 'TRADING EXCHANGE',
      rating: 9.6,
      license: 'Malta / UK'
    }
  ];

  const filteredBookmakers = bookmakers.filter(b => {
    if (categoryFilter === 'ALL') return true;
    return b.category === categoryFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Casas de Apuestas, Cuotas & Márgenes</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Configura tus casas de apuestas favoritas (incluyendo casas colombianas reguladas por Coljuegos) para que el motor extraiga las cuotas y calcule las combinadas de máximo valor esperado (+EV).
        </p>
      </div>

      {/* FEEDBACK MENSAJE */}
      {savingMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.35)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--accent-cyan)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{savingMsg}</span>
        </div>
      )}

      {/* FILTROS POR CATEGORÍA (COLOMBIA / INTERNACIONAL) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '20px',
            border: categoryFilter === 'ALL' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
            background: categoryFilter === 'ALL' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: categoryFilter === 'ALL' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Todas ({bookmakers.length})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('COLOMBIA')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '20px',
            border: categoryFilter === 'COLOMBIA' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
            background: categoryFilter === 'COLOMBIA' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: categoryFilter === 'COLOMBIA' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          🇨🇴 Colombia (Coljuegos) ({bookmakers.filter(b => b.category === 'COLOMBIA').length})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('INTERNATIONAL')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '20px',
            border: categoryFilter === 'INTERNATIONAL' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
            background: categoryFilter === 'INTERNATIONAL' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: categoryFilter === 'INTERNATIONAL' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          🌐 Internacionales ({bookmakers.filter(b => b.category === 'INTERNATIONAL').length})
        </button>

        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Activas para análisis: <strong style={{ color: 'var(--accent-cyan)' }}>{activeBookmakerIds.length}/{MAX_ACTIVE_BOOKMAKERS}</strong>
        </span>
      </div>

      {/* GRID DE CASAS DE APUESTAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filteredBookmakers.map(b => {
          const isActive = activeBookmakerIds.includes(b.key);

          return (
            <Card
              key={b.key}
              glow={isActive ? 'cyan' : 'none'}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                border: isActive ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--border-subtle)',
                background: isActive ? 'rgba(6, 182, 212, 0.04)' : 'var(--bg-secondary)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{b.name}</h3>
                    {b.category === 'COLOMBIA' && (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', fontWeight: 700 }}>
                        COLJUEGOS
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.type}</span>
                </div>
                <Badge variant={isActive ? 'info' : 'neutral'}>{b.badge}</Badge>
              </div>

              {/* Botón de Activación Directa */}
              <button
                type="button"
                onClick={() => toggleBookmaker(b.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-subtle)',
                  background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {isActive ? (
                  <>
                    <Check size={15} />
                    <span>Activa para extracción de cuotas</span>
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Activar para análisis (+EV)</span>
                  </>
                )}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Margen Teórico</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {b.margin}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Payout Estimado</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                    {b.payout}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Ventajas clave:</span>
                <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {b.pros.map((pro, i) => (
                    <li key={i} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={14} color="var(--accent-green)" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={13} color="var(--accent-green)" />
                <span>Licencia: {b.license}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
