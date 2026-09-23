import React, { useState } from 'react';
import { Check, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from './AuthContext';
import { formatDate } from '../../utils/formatters';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    if (!user) return;
    const updated = { ...user, displayName, updatedAt: new Date().toISOString() };
    localStorage.setItem('bet_analyzer_user', JSON.stringify(updated));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '720px', margin: '0 auto' }}>
      <div>
        <Button size="sm" variant="ghost" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Mi Perfil de Usuario</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Gestiona tu identidad, credenciales y rol en la plataforma.
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card glow="cyan" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow-cyan)'
            }}
          >
            {displayName.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{displayName}</h3>
              <Badge variant={user.role === 'admin' ? 'warning' : 'ev'}>
                {user.role === 'admin' ? 'ADMINISTRADOR' : 'USUARIO PRO'}
              </Badge>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.email}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Identificador Único (UID)</span>
            <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {user.id}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fecha de Creación</span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              {formatDate(user.createdAt)}
            </div>
          </div>
        </div>

        {/* Edit fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Nombre para Mostrar / Alias"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <Button variant="danger" size="sm" onClick={handleLogout} leftIcon={<LogOut size={16} />}>
              Cerrar Sesión
            </Button>
            <Button variant="accent" size="sm" onClick={handleSave} leftIcon={savedSuccess ? <Check size={16} /> : undefined}>
              {savedSuccess ? 'Guardado con éxito' : 'Actualizar Perfil'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
