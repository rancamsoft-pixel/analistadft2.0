import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  Flame,
  Layers,
  Award,
  Settings,
  Bell,
  SlidersHorizontal,
  ShieldCheck,
  Zap,
  WifiOff,
  ShieldAlert
} from 'lucide-react';
import { MockBanner } from '../components/ui/MockBanner';
import { useAuth } from '../features/auth/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { InstallPrompt } from '../components/ui/InstallPrompt';

export const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isOnline = useOnlineStatus();

  const navigationItems = [
    { label: 'Dashboard', path: '/', icon: <TrendingUp size={19} /> },
    { label: 'Partidos', path: '/matches', icon: <Flame size={19} /> },
    { label: 'Análisis IA', path: '/analysis', icon: <Zap size={19} /> },
    { label: 'Parlays / EV', path: '/parlays', icon: <Layers size={19} /> },
    { label: 'Historial', path: '/history', icon: <Award size={19} /> },
    { label: 'Cuotas & Casas', path: '/bookmakers', icon: <SlidersHorizontal size={19} /> },
    ...(user?.role === 'admin' ? [{ label: 'Admin', path: '/admin', icon: <ShieldAlert size={19} /> }] : []),
    { label: 'Ajustes', path: '/settings', icon: <Settings size={19} /> }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Banner de Modo Desconectado / Offline */}
      {!isOnline && (
        <div
          style={{
            background: '#dc2626',
            color: '#ffffff',
            padding: '0.4rem 1rem',
            textAlign: 'center',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            zIndex: 9999
          }}
        >
          <WifiOff size={16} />
          <span>Sin conexión a internet. Mostrando datos locales en caché PWA.</span>
        </div>
      )}

      {/* Banner de Modo Mock si está activo */}
      <MockBanner />

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop Sidebar */}
        <aside
          style={{
            width: '260px',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'none',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.5rem 1rem',
            position: 'sticky',
            top: 0,
            height: '100vh',
            boxSizing: 'border-box'
          }}
          className="desktop-sidebar"
        >
          <div>
            {/* Brand Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem 2rem 0.5rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-cyan)'
                }}
              >
                <TrendingUp size={22} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.1 }}>Bet Analyzer</h1>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  PRO QUANTITATIVE
                </span>
              </div>
            </div>

            {/* Nav Links */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {navigationItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.7rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      background: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                      border: isActive ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.9rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ color: isActive ? 'var(--accent-cyan)' : 'inherit' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

            <NavLink
              to="/profile"
              style={{
                padding: '0.85rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#fff'
                }}
              >
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.displayName || 'Usuario'}
                </div>
                <div style={{ fontSize: '0.7rem', color: user?.role === 'admin' ? '#fbbf24' : 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ShieldCheck size={12} />
                  <span>{user?.role === 'admin' ? 'Administrador' : 'Usuario Pro'}</span>
                </div>
              </div>
            </NavLink>
        </aside>

        {/* Main Body Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Top Header */}
          <header
            style={{
              height: '62px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'rgba(13, 18, 31, 0.8)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 1.5rem',
              position: 'sticky',
              top: 0,
              zIndex: 40
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="mobile-only-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>
                  Bet Analyzer
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <NavLink
                to="/notifications"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none'
                }}
              >
                <Bell size={18} />
              </NavLink>

              <NavLink
                to="/profile"
                style={{
                  padding: '0.35rem 0.75rem',
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  textDecoration: 'none'
                }}
              >
                <span>{user?.displayName?.split(' ')[0] || 'Mi Perfil'}</span>
                <span style={{ color: user?.role === 'admin' ? '#fbbf24' : 'inherit' }}>
                  ({user?.role === 'admin' ? 'Admin' : 'Pro'})
                </span>
              </NavLink>
            </div>
          </header>

          {/* Page Outlet */}
          <main className="main-content">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (PWA standard) */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '62px',
          background: 'rgba(9, 13, 22, 0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 50
        }}
        className="mobile-bottom-nav"
      >
        {navigationItems.slice(0, 5).map(item => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                textDecoration: 'none',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontSize: '0.7rem',
                fontWeight: isActive ? 700 : 500,
                width: '20%'
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <style>{`
        @media (min-width: 1024px) {
          .desktop-sidebar {
            display: flex !important;
          }
          .mobile-bottom-nav {
            display: none !important;
          }
          .mobile-only-logo {
            display: none !important;
          }
        }
      `}</style>
      {/* PWA Install Prompt Banner */}
      <InstallPrompt />
    </div>
  );
};
