import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  glow?: 'cyan' | 'green' | 'red' | 'purple' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  glow = 'none',
  className = '',
  style,
  ...props
}) => {
  const glowStyle: React.CSSProperties =
    glow === 'cyan'
      ? { boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), var(--shadow-glow-cyan)' }
      : glow === 'green'
      ? { boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), var(--shadow-glow-green)' }
      : glow === 'red'
      ? { boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(239, 68, 68, 0.2)' }
      : glow === 'purple'
      ? { boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.2)' }
      : {};

  return (
    <div
      className={`${interactive ? 'glass-panel-interactive' : 'glass-panel'} ${className}`}
      style={{
        padding: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
        ...glowStyle,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};
