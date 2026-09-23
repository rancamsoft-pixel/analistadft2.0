import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid transparent',
    outline: 'none',
    whiteSpace: 'nowrap'
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0.4rem 0.75rem', fontSize: '0.8rem' },
    md: { padding: '0.6rem 1.15rem', fontSize: '0.9rem' },
    lg: { padding: '0.8rem 1.6rem', fontSize: '1.05rem' }
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 10px rgba(2, 132, 199, 0.25)'
    },
    accent: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 12px rgba(6, 182, 212, 0.3)'
    },
    success: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 12px rgba(16, 185, 129, 0.3)'
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)'
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#f87171'
    }
  };

  return (
    <button
      style={{ ...baseStyles, ...sizeStyles[size], ...variantStyles[variant] }}
      className={`app-btn ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
