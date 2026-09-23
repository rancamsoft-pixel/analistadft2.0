import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { MatchesPage } from '../features/matches/MatchesPage';
import { MatchDetailPage } from '../features/matches/MatchDetailPage';
import { AnalysisPage } from '../features/analysis/AnalysisPage';
import { ParlaysPage } from '../features/parlays/ParlaysPage';
import { CompetitionsPage } from '../features/competitions/CompetitionsPage';
import { BookmakersPage } from '../features/bookmakers/BookmakersPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { NotificationsPage } from '../features/notifications/NotificationsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ProfilePage } from '../features/auth/ProfilePage';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { NotFoundPage } from '../features/errors/NotFoundPage';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

export const router = createBrowserRouter([
  // Rutas públicas de autenticación
  {
    path: '/login',
    element: (
      <ErrorBoundary>
        <LoginPage />
      </ErrorBoundary>
    )
  },
  {
    path: '/register',
    element: (
      <ErrorBoundary>
        <RegisterPage />
      </ErrorBoundary>
    )
  },
  {
    path: '/forgot-password',
    element: (
      <ErrorBoundary>
        <ForgotPasswordPage />
      </ErrorBoundary>
    )
  },

  // Rutas privadas protegidas por ProtectedRoute
  {
    path: '/',
    element: (
      <ErrorBoundary>
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </ErrorBoundary>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />
      },
      {
        path: 'matches',
        element: <MatchesPage />
      },
      {
        path: 'matches/:matchId',
        element: <MatchDetailPage />
      },
      {
        path: 'analysis',
        element: <AnalysisPage />
      },
      {
        path: 'parlays',
        element: <ParlaysPage />
      },
      {
        path: 'competitions',
        element: <CompetitionsPage />
      },
      {
        path: 'bookmakers',
        element: <BookmakersPage />
      },
      {
        path: 'history',
        element: <HistoryPage />
      },
      {
        path: 'notifications',
        element: <NotificationsPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      },
      {
        path: 'profile',
        element: <ProfilePage />
      },
      {
        path: 'admin',
        element: <AdminDashboardPage />
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
]);
