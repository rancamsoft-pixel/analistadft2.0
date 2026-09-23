import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from './AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, authError, clearError, loading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ displayName?: string; email?: string; password?: string; confirmPassword?: string }>({});

  const validate = (): boolean => {
    const errors: { displayName?: string; email?: string; password?: string; confirmPassword?: string } = {};

    if (!displayName.trim()) errors.displayName = 'El nombre o alias es requerido.';

    if (!email.trim()) errors.email = 'El correo es requerido.';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Ingresa un correo electrónico válido.';

    if (!password) errors.password = 'La contraseña es requerida.';
    else if (password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres.';

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    try {
      await register(email, password, displayName);
      navigate('/', { replace: true });
    } catch {
      // Error manejado en AuthContext
    }
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
      <div style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-green)'
            }}
          >
            <TrendingUp size={28} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Crear Cuenta Profesional</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Comienza a operar con análisis cuantitativo y valor esperado
          </p>
        </div>

        {/* Card Form */}
        <Card glow="green" style={{ padding: '2rem 1.75rem' }}>
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
              label="Nombre Completo o Alias"
              type="text"
              placeholder="Ej: David Analista"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              error={fieldErrors.displayName}
              leftIcon={<User size={16} />}
            />

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

            <Input
              label="Contraseña (mínimo 6 caracteres)"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              error={fieldErrors.password}
              leftIcon={<Lock size={16} />}
              autoComplete="new-password"
            />

            <Input
              label="Confirmar Contraseña"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword}
              leftIcon={<Lock size={16} />}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="success"
              isLoading={loading}
              style={{ marginTop: '0.5rem', width: '100%' }}
              rightIcon={<ArrowRight size={16} />}
            >
              Completar Registro
            </Button>
          </form>
        </Card>

        <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          ¿Ya tienes cuenta activa?{' '}
          <Link to="/login" style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'none' }}>
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
};
