import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Loader } from '../../components/ui/Loader';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <Loader label="Verificando credenciales de acceso..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirigir a login preservando la ruta previa
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
