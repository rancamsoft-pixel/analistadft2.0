import React from 'react';
import { Card } from './Card';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export const SkeletonCard: React.FC<{ height?: string }> = ({ height = '140px' }) => {
  return (
    <Card style={{ height, display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden' }}>
      <div className="skeleton-pulse" style={{ height: '20px', width: '40%', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} />
      <div className="skeleton-pulse" style={{ height: '32px', width: '70%', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }} />
      <div className="skeleton-pulse" style={{ height: '16px', width: '50%', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', marginTop: 'auto' }} />
    </Card>
  );
};

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <Card style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="skeleton-pulse" style={{ height: '24px', width: '30%', borderRadius: '4px', background: 'rgba(255,255,255,0.07)' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton-pulse"
          style={{
            height: '42px',
            width: '100%',
            borderRadius: '6px',
            background: i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'
          }}
        />
      ))}
    </Card>
  );
};

export const RetryBanner: React.FC<{
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}> = ({
  message = 'No se pudieron cargar los datos actualizados.',
  onRetry,
  isRetrying = false
}) => {
  return (
    <div
      style={{
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fca5a5' }}>
        <AlertCircle size={18} />
        <span style={{ fontSize: '0.88rem' }}>{message}</span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={onRetry}
        isLoading={isRetrying}
        leftIcon={<RefreshCw size={14} />}
      >
        Reintentar
      </Button>
    </div>
  );
};

export const StaleDataBadge: React.FC<{ timestamp?: string }> = ({ timestamp }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: 600,
        background: 'rgba(245, 158, 11, 0.15)',
        color: 'var(--accent-gold)',
        border: '1px solid rgba(245, 158, 11, 0.3)'
      }}
    >
      ⚠️ Respaldo {timestamp ? `(${timestamp})` : 'Caché local'}
    </span>
  );
};
