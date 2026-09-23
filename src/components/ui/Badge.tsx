import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'ev' | 'live' | 'neutral' | 'warning' | 'info' | 'success';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md'
}) => {
  const styles: Record<string, React.CSSProperties> = {
    ev: {
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#34d399',
      border: '1px solid rgba(16, 185, 129, 0.35)',
      boxShadow: '0 0 10px rgba(16, 185, 129, 0.15)'
    },
    live: {
      background: 'rgba(239, 68, 68, 0.18)',
      color: '#f87171',
      border: '1px solid rgba(239, 68, 68, 0.35)'
    },
    neutral: {
      background: 'rgba(255, 255, 255, 0.08)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-subtle)'
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#fbbf24',
      border: '1px solid rgba(245, 158, 11, 0.3)'
    },
    info: {
      background: 'rgba(6, 182, 212, 0.15)',
      color: '#38bdf8',
      border: '1px solid rgba(6, 182, 212, 0.3)'
    },
    success: {
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#34d399',
      border: '1px solid rgba(16, 185, 129, 0.3)'
    }
  };

  const sizeStyle: React.CSSProperties =
    size === 'sm'
      ? { padding: '0.15rem 0.45rem', fontSize: '0.7rem' }
      : { padding: '0.25rem 0.65rem', fontSize: '0.78rem' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 700,
        fontFamily: 'var(--font-sans)',
        letterSpacing: '0.01em',
        ...sizeStyle,
        ...styles[variant]
      }}
    >
      {variant === 'live' && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            display: 'inline-block'
          }}
        />
      )}
      {children}
    </span>
  );
};
