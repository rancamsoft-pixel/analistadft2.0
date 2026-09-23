import React, { useState, useEffect } from 'react';
import {
  Bell,
  Zap,
  TrendingDown,
  Shield,
  Play,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { NotificationService, DEFAULT_NOTIFICATION_SETTINGS } from '../../services/notification.service';
import { UserNotificationsSettings, DailyJobLog } from '../../types/domain';
import { useAuth } from '../auth/AuthContext';

export const NotificationsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const userId = user?.id || 'demo-user-1';

  // Configuración de notificaciones del usuario
  const [settings, setSettings] = useState<UserNotificationsSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin Daily Trigger
  const [triggeringJob, setTriggeringJob] = useState<boolean>(false);
  const [lastJobLog, setLastJobLog] = useState<DailyJobLog | null>(null);

  useEffect(() => {
    loadSettings();
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, [userId]);

  const loadSettings = async () => {
    try {
      const data = await NotificationService.getSettings(userId);
      setSettings(data);
    } catch (err) {
      console.warn('Error cargando configuración:', err);
    }
  };

  const handleToggle = async (key: keyof UserNotificationsSettings) => {
    const updated = {
      ...settings,
      [key]: !settings[key]
    };
    setSettings(updated);
    setSavingSettings(true);
    try {
      await NotificationService.saveSettings(userId, updated);
      setFeedbackMsg({ type: 'success', text: 'Preferencias de notificación guardadas.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error guardando preferencias.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRequestPushPermission = async () => {
    const res = await NotificationService.requestPermissionAndRegisterToken(userId);
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
    if (res.granted) {
      setFeedbackMsg({ type: 'success', text: '¡Notificaciones push habilitadas correctamente!' });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'No se concedió el permiso de notificaciones.' });
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleTriggerDailyAnalysis = async (force: boolean = false) => {
    setTriggeringJob(true);
    try {
      const res = await NotificationService.triggerDailyAnalysisNow(force);
      if (res.data) {
        setLastJobLog(res.data);
      }
      setFeedbackMsg({ type: 'success', text: res.message || 'Job diario ejecutado con éxito.' });
      setTimeout(() => setFeedbackMsg(null), 4500);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Error al ejecutar el job.' });
    } finally {
      setTriggeringJob(false);
    }
  };

  const sampleAlerts = [
    {
      id: 'notif-1',
      title: '⚽ Tu análisis diario está listo',
      desc: 'Tu análisis cuantitativo encontró 4 oportunidades para revisar hoy según tus ligas activas.',
      time: '07:00 AM',
      type: 'daily',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Discrepancia de Cuota Detectada (+EV)',
      desc: 'Arsenal FC ha subido a 1.80 en Pinnacle mientras el modelo proyecta 1.69. Edge del +5.02%.',
      time: 'Hace 45 minutos',
      type: 'value',
      read: true
    },
    {
      id: 'notif-3',
      title: 'Movimiento Brusco de Línea (Steam Move)',
      desc: 'El mercado Over 2.5 en Real Madrid vs Barcelona ha descendido de 1.82 a 1.68 en Bet365.',
      time: 'Hace 2 horas',
      type: 'steam',
      read: true
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0 }}>Centro de Alertas & Notificaciones Push</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
          Configura tus canales de alerta del Agente Diario, notificaciones push de Firebase y revisa la telemetría del sistema.
        </p>
      </div>

      {/* Mensajes de Feedback */}
      {feedbackMsg && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
          borderRadius: 'var(--radius-md)',
          color: feedbackMsg.type === 'success' ? '#34d399' : '#f87171',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Grid: Preferencias de Usuario y Permisos Web */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Columna 1: Canales de Notificación */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Sliders size={18} color="var(--accent-cyan)" />
              Preferencias de Alertas
            </h3>
            {savingSettings && <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Guardando...</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 1. Daily Focus */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.92rem', display: 'block' }}>⚽ Foco del Día (Matutino)</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Notificación a las 07:00 cuando el análisis diario está preparado.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.dailyFocus}
                onChange={() => handleToggle('dailyFocus')}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
              />
            </div>

            {/* 2. Parlay Ready */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div>
                <strong style={{ fontSize: '0.92rem', display: 'block' }}>🎯 Combinadas Listas (Parlays)</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Aviso cuando los parlays de alta probabilidad y valor están disponibles.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.parlayReady}
                onChange={() => handleToggle('parlayReady')}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
              />
            </div>

            {/* 3. Important Odds Movement */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div>
                <strong style={{ fontSize: '0.92rem', display: 'block' }}>📉 Movimientos Relevantes de Cuota</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Alertas inmediatas si una cuota sube generando un edge superior al umbral.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.importantOddsMovement}
                onChange={() => handleToggle('importantOddsMovement')}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
              />
            </div>

            {/* 4. Match Starting Soon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div>
                <strong style={{ fontSize: '0.92rem', display: 'block' }}>⏱️ Inicio Inminente de Partido</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Recordatorio 30 minutos antes del inicio de partidos analizados.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.matchStartingSoon}
                onChange={() => handleToggle('matchStartingSoon')}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
              />
            </div>
          </div>
        </Card>

        {/* Columna 2: Estado del Navegador y Permisos Push */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Bell size={18} color="var(--accent-cyan)" />
              Estado de Notificaciones Push Web
            </h3>
            <Badge variant={permissionStatus === 'granted' ? 'success' : 'warning'}>
              {permissionStatus === 'granted' ? 'HABILITADO' : 'PENDIENTE'}
            </Badge>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Para recibir el Foco Diario en tu móvil o escritorio incluso con la app cerrada, concede permisos de notificación en tu navegador.
          </p>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Permiso de navegador:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{permissionStatus}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>PWA Service Worker:</span>
              <span style={{ color: 'var(--accent-green)' }}>firebase-messaging-sw.js</span>
            </div>
          </div>

          {permissionStatus !== 'granted' ? (
            <Button variant="primary" onClick={handleRequestPushPermission} leftIcon={<Send size={15} />}>
              Habilitar Notificaciones Push
            </Button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} />
              <span>Tu dispositivo está registrado para recibir análisis matutinos.</span>
            </div>
          )}
        </Card>
      </div>

      {/* SECCIÓN 3: CONTROL DE ADMINISTRACIÓN — AGENTE DIARIO */}
      {isAdmin && (
        <Card glow="cyan" style={{ border: '1px solid rgba(6, 182, 212, 0.35)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Shield size={20} color="var(--accent-cyan)" />
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Panel de Control del Agente Diario (Admin)</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Programado a las 07:00 (America/Bogota). Control manual con cooldown y verificación de cuota.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <Button
                variant="primary"
                onClick={() => handleTriggerDailyAnalysis(false)}
                disabled={triggeringJob}
                leftIcon={<Play size={14} className={triggeringJob ? 'spin' : ''} />}
              >
                {triggeringJob ? 'Ejecutando Agente...' : 'Ejecutar Análisis Ahora'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleTriggerDailyAnalysis(true)}
                disabled={triggeringJob}
                leftIcon={<RefreshCw size={12} />}
              >
                Forzar Reanudación
              </Button>
            </div>
          </div>

          {/* Telemetría del Último Job */}
          {lastJobLog ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Estado</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: lastJobLog.status === 'COMPLETED' ? '#34d399' : '#fbbf24' }}>
                  {lastJobLog.status}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Duración</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  {(((lastJobLog.durationMs || 0)) / 1000).toFixed(1)}s
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Usuarios Procesados</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  {lastJobLog.usersProcessed}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Partidos Analizados</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  {lastJobLog.matchesProcessed}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Parlays Generados</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {lastJobLog.parlaysGenerated}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Notificaciones FCM</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                  {lastJobLog.notificationsSent}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              No hay ejecuciones manuales recientes en esta sesión. Puedes presionar "Ejecutar Análisis Ahora" para probar el pipeline completo.
            </div>
          )}
        </Card>
      )}

      {/* SECCIÓN 4: BANDEJA DE ALERTAS RECIENTES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Historial de Alertas Recientes</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sampleAlerts.map(a => (
            <Card
              key={a.id}
              glow={a.type === 'daily' ? 'cyan' : a.type === 'value' ? 'green' : 'none'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: a.type === 'daily'
                      ? 'rgba(6, 182, 212, 0.15)'
                      : a.type === 'value'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: a.type === 'daily'
                      ? 'var(--accent-cyan)'
                      : a.type === 'value'
                      ? 'var(--accent-green)'
                      : '#fbbf24'
                  }}
                >
                  {a.type === 'daily' ? <Clock size={20} /> : a.type === 'value' ? <Zap size={20} /> : <TrendingDown size={20} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{a.title}</strong>
                    {!a.read && <Badge variant="live">NUEVA</Badge>}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.desc}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.time}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
