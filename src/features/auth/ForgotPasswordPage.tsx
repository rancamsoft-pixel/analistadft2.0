import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from './AuthContext';

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword, authError, clearError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email.trim()) {
      setFieldError('Por favor ingresa tu correo electrónico.');
      return;
    }
    setFieldError(undefined);

    try {
      await forgotPassword(email);
      setSentSuccess(true);
    } catch {
      // Error mostrado en authError
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
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Recuperar Contraseña</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Te enviaremos un enlace seguro para restablecer tu clave
          </p>
        </div>

        <Card style={{ padding: '2rem 1.75rem' }}>
          {sentSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', color: 'var(--accent-green)' }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Correo Enviado</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Hemos enviado las instrucciones para restablecer tu contraseña a <strong>{email}</strong>. Revisa tu bandeja de entrada o carpeta de spam.
              </p>
              <Link to="/login" style={{ textDecoration: 'none', width: '100%', marginTop: '0.5rem' }}>
                <Button variant="secondary" style={{ width: '100%' }} leftIcon={<ArrowLeft size={16} />}>
                  Volver al Inicio de Sesión
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                    fontSize: '0.85rem'
                  }}
                >
                  <AlertCircle size={18} />
                  <span>{authError}</span>
                </div>
              )}

              <Input
                label="Correo Electrónico Registrado"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                error={fieldError}
                leftIcon={<Mail size={16} />}
              />

              <Button type="submit" variant="accent" isLoading={loading} style={{ width: '100%' }}>
                Enviar Enlace de Recuperación
              </Button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <Link
                  to="/login"
                  style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <ArrowLeft size={14} /> Volver al Inicio de Sesión
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
