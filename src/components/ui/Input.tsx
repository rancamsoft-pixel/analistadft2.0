import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leftIcon && (
          <div
            style={{
              position: 'absolute',
              left: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          style={{
            width: '100%',
            padding: leftIcon ? '0.65rem 0.85rem 0.65rem 2.4rem' : '0.65rem 0.85rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: error ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          className={`app-input ${className}`}
          {...props}
        />
      </div>
      {error && <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{error}</span>}
    </div>
  );
};
