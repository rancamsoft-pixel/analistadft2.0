import React, { useState } from 'react';
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
  ShieldAlert,
  Menu,
  X
} from 'lucide-react';
import { MockBanner } from '../components/ui/MockBanner';
import { useAuth } from '../features/auth/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { InstallPrompt } from '../components/ui/InstallPrompt';

export const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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

      {/* Mobile Drawer (Menú lateral completo para pantallas móviles) */}
      {isMobileDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            display: 'flex'
          }}
        >
          {/* Backdrop con desenfoque */}
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)'
            }}
          />

          {/* Panel Lateral Deslizable */}
          <div
            style={{
              position: 'relative',
              width: '82%',
              maxWidth: '320px',
              height: '100%',
              background: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.25rem 1rem',
              boxShadow: '10px 0 25px rgba(0, 0, 0, 0.6)',
              zIndex: 101,
              overflowY: 'auto'
            }}
          >
            <div>
              {/* Header del Drawer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <TrendingUp size={20} color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>Bet Analyzer</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>PRO QUANTITATIVE</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  aria-label="Cerrar menú móvil"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lista Completa de Enlaces Móviles */}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1.25rem' }}>
                {navigationItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        padding: '0.75rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        background: isActive ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.92rem'
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

            {/* Perfil en Drawer */}
            <NavLink
              to="/profile"
              onClick={() => setIsMobileDrawerOpen(false)}
              style={{
                marginTop: '1.5rem',
                padding: '0.85rem',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#fff'
                }}
              >
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.displayName || 'Usuario'}
                </div>
                <div style={{ fontSize: '0.72rem', color: user?.role === 'admin' ? '#fbbf24' : 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ShieldCheck size={12} />
                  <span>{user?.role === 'admin' ? 'Administrador' : 'Usuario Pro'}</span>
                </div>
              </div>
            </NavLink>
          </div>
        </div>
      )}

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
              padding: '0 1.25rem',
              position: 'sticky',
              top: 0,
              zIndex: 40
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Botón Menú Hamburguesa para Móvil */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="mobile-hamburger-btn"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.45rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                aria-label="Abrir menú de navegación"
              >
                <Menu size={20} />
              </button>

              <div className="mobile-only-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>
                  Bet Analyzer
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

      {/* Mobile Bottom Navigation Bar (PWA standard con acceso a TODO) */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '62px',
          background: 'rgba(9, 13, 22, 0.96)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 50,
          padding: '0 0.25rem'
        }}
        className="mobile-bottom-nav"
      >
        <NavLink
          to="/"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem',
            textDecoration: 'none',
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontSize: '0.68rem',
            fontWeight: isActive ? 700 : 500,
            flex: 1
          })}
        >
          <TrendingUp size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/matches"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem',
            textDecoration: 'none',
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontSize: '0.68rem',
            fontWeight: isActive ? 700 : 500,
            flex: 1
          })}
        >
          <Flame size={18} />
          <span>Partidos</span>
        </NavLink>

        <NavLink
          to="/analysis"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem',
            textDecoration: 'none',
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontSize: '0.68rem',
            fontWeight: isActive ? 700 : 500,
            flex: 1
          })}
        >
          <Zap size={18} />
          <span>Análisis</span>
        </NavLink>

        <NavLink
          to="/parlays"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem',
            textDecoration: 'none',
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontSize: '0.68rem',
            fontWeight: isActive ? 700 : 500,
            flex: 1
          })}
        >
          <Layers size={18} />
          <span>Parlays</span>
        </NavLink>

        <NavLink
          to="/bookmakers"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem',
            textDecoration: 'none',
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontSize: '0.68rem',
            fontWeight: isActive ? 700 : 500,
            flex: 1
          })}
        >
          <SlidersHorizontal size={18} />
          <span>Casas</span>
        </NavLink>

        {/* Botón Más... para abrir el drawer con Admin, Historial y Ajustes */}
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem',
            background: 'none',
            border: 'none',
            color: isMobileDrawerOpen ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontSize: '0.68rem',
            fontWeight: isMobileDrawerOpen ? 700 : 500,
            flex: 1,
            cursor: 'pointer'
          }}
        >
          <Menu size={18} />
          <span>Más</span>
        </button>
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
          .mobile-hamburger-btn {
            display: none !important;
          }
        }
      `}</style>
      {/* PWA Install Prompt Banner */}
      <InstallPrompt />
    </div>
  );
};
