import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <Card
        glow="cyan"
        style={{
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          padding: '2.5rem 1.5rem'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(6, 182, 212, 0.15)',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <HelpCircle size={36} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
            404
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            Página no encontrada
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
            La ruta o análisis al que intentas acceder no existe, ha sido trasladado o aún no se ha generado.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
          <Button
            variant="secondary"
            style={{ flex: 1 }}
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => navigate(-1)}
          >
            Atrás
          </Button>
          <Button
            variant="accent"
            style={{ flex: 1 }}
            leftIcon={<Home size={16} />}
            onClick={() => navigate('/')}
          >
            Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
};
