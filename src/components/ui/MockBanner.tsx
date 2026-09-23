import React from 'react';
import { Database, AlertTriangle } from 'lucide-react';
import { env } from '../../lib/env';

export const MockBanner: React.FC = () => {
  if (!env.useMockData) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.22) 100%)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.35)',
        color: '#fef3c7',
        padding: '0.4rem 1rem',
        fontSize: '0.78rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        zIndex: 50,
        position: 'sticky',
        top: 0
      }}
    >
      <Database size={15} color="#f59e0b" />
      <span>
        <strong>MODO MOCK ACTIVO:</strong> Operando con fixtures controlados sin consumo de cuota de APIs externas.
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.2rem',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '0.15rem 0.45rem',
          borderRadius: '4px',
          fontSize: '0.7rem'
        }}
      >
        <AlertTriangle size={12} color="#fbbf24" />
        APP_USE_MOCK_DATA=true
      </span>
    </div>
  );
};
