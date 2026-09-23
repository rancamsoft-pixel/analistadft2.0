import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { TrendingUp, Mail, Lock, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from './AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginDemo, authError, clearError, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'El correo es requerido.';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Ingresa un correo electrónico válido.';

    if (!password) errors.password = 'La contraseña es requerida.';
    else if (password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      // El error se gestiona en AuthContext y se muestra en authError
    }
  };

  const handleDemoLogin = (role: 'user' | 'admin') => {
    if (role === 'admin') {
      loginDemo('admin@betanalyzer.pro', 'admin');
    } else {
      loginDemo('analista@betanalyzer.pro', 'user');
    }
    navigate(from, { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'var(--bg-primary)'
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-cyan)'
            }}
          >
            <TrendingUp size={28} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Iniciar Sesión</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Accede a tu cuenta profesional de Bet Analyzer
          </p>
        </div>

        {/* Form Card */}
        <Card glow="cyan" style={{ padding: '2rem 1.75rem' }}>
          {authError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-md)',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '1.25rem'
              }}
            >
              <AlertCircle size={18} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={fieldErrors.email}
              leftIcon={<Mail size={16} />}
              autoComplete="email"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                error={fieldErrors.password}
                leftIcon={<Lock size={16} />}
                autoComplete="current-password"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', textDecoration: 'none' }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="accent"
              isLoading={loading}
              style={{ marginTop: '0.5rem', width: '100%' }}
              rightIcon={<ArrowRight size={16} />}
            >
              Ingresar al Sistema
            </Button>
          </form>

          {/* Quick Demo Login Options */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textAlign: 'center', marginBottom: '0.75rem' }}>
              Acceso Rápido / Pruebas de Desarrollo:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <Button size="sm" variant="secondary" onClick={() => handleDemoLogin('user')}>
                Demo Usuario Pro
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleDemoLogin('admin')} leftIcon={<ShieldCheck size={14} />}>
                Demo Admin
              </Button>
            </div>
          </div>
        </Card>

        {/* Footer Link */}
        <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          ¿Aún no tienes una cuenta?{' '}
          <Link to="/register" style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'none' }}>
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
};
