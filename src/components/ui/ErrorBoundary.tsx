import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó una excepción:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: 'var(--bg-main)'
          }}
        >
          <Card
            glow="red"
            style={{
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              padding: '2rem'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Ocurrió un error inesperado
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                Hemos aislado el problema para proteger la sesión. Puedes intentar recargar la aplicación o volver al inicio.
              </p>
            </div>

            {this.state.error && (
              <div
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#f87171',
                  textAlign: 'left',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}
              >
                {this.state.error.message || 'Error desconocido'}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                leftIcon={<Home size={16} />}
                onClick={this.handleGoHome}
              >
                Inicio
              </Button>
              <Button
                variant="accent"
                style={{ flex: 1 }}
                leftIcon={<RefreshCw size={16} />}
                onClick={this.handleReload}
              >
                Recargar
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
