import React from 'react';

export interface LoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Loader: React.FC<LoaderProps> = ({
  label = 'Cargando datos...',
  size = 'md'
}) => {
  const dim = size === 'sm' ? 24 : size === 'lg' ? 48 : 36;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
        gap: '0.85rem'
      }}
    >
      <div
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          border: '3px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: 'var(--accent-cyan)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      {label && (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {label}
        </span>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
