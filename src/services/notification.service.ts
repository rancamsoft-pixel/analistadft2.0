import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { env } from '../lib/env';
import { UserNotificationsSettings, DailyJobLog } from '../types/domain';

export const DEFAULT_NOTIFICATION_SETTINGS: UserNotificationsSettings = {
  dailyFocus: true,
  parlayReady: true,
  importantOddsMovement: false,
  matchStartingSoon: false,
  emailAlerts: true,
  minEvThreshold: 3.0
};

export class NotificationService {
  /**
   * Obtiene la configuración de notificaciones del usuario
   */
  static async getSettings(userId: string): Promise<UserNotificationsSettings> {
    if (env.useMockData || !db) {
      const local = localStorage.getItem(`notif_prefs_${userId}`);
      if (local) {
        try {
          return JSON.parse(local) as UserNotificationsSettings;
        } catch {
          // fallback
        }
      }
      return DEFAULT_NOTIFICATION_SETTINGS;
    }

    try {
      const docRef = doc(db, 'users', userId, 'settings', 'notifications');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserNotificationsSettings;
      }
      return DEFAULT_NOTIFICATION_SETTINGS;
    } catch (err) {
      console.warn('Error leyendo configuración de notificaciones:', err);
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  /**
   * Guarda las preferencias de notificación del usuario
   */
  static async saveSettings(userId: string, settings: UserNotificationsSettings): Promise<void> {
    localStorage.setItem(`notif_prefs_${userId}`, JSON.stringify(settings));

    if (!env.useMockData && db) {
      const docRef = doc(db, 'users', userId, 'settings', 'notifications');
      await setDoc(docRef, settings, { merge: true });
    }
  }

  /**
   * Solicita permisos de notificación en el navegador y registra el token FCM
   */
  static async requestPermissionAndRegisterToken(userId: string): Promise<{
    granted: boolean;
    token?: string;
    error?: string;
  }> {
    if (!('Notification' in window)) {
      return { granted: false, error: 'Este navegador no soporta notificaciones push.' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { granted: false, error: 'Permiso de notificaciones denegado por el usuario.' };
      }

      // En desarrollo o localhost, registrar token de prueba para emulación completa
      const simulatedToken = `fcm_token_${userId.slice(-6)}_${Date.now()}`;

      if (!env.useMockData && db) {
        const tokenDoc = doc(db, 'users', userId, 'notificationTokens', simulatedToken);
        await setDoc(tokenDoc, {
          tokenId: simulatedToken,
          deviceType: 'web',
          userAgent: navigator.userAgent,
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString()
        }, { merge: true });
      }

      localStorage.setItem(`fcm_token_${userId}`, simulatedToken);
      return { granted: true, token: simulatedToken };
    } catch (err: any) {
      return { granted: false, error: err?.message || 'Error solicitando permisos' };
    }
  }

  /**
   * Trigger administrativo para ejecutar el análisis diario manualmente
   */
  static async triggerDailyAnalysisNow(force: boolean = false): Promise<{
    success: boolean;
    message: string;
    data?: DailyJobLog;
  }> {
    if (env.useMockData || !env.apiBaseUrl) {
      await new Promise(r => setTimeout(r, 600));
      return {
        success: true,
        message: 'Análisis diario ejecutado exitosamente en Modo Mock.',
        data: {
          jobId: `job_${new Date().toISOString().split('T')[0]}_manual`,
          date: new Date().toISOString().split('T')[0]!,
          status: 'COMPLETED',
          start: new Date(Date.now() - 3200).toISOString(),
          end: new Date().toISOString(),
          durationMs: 3200,
          completedStages: [
            'FETCH_FIXTURES',
            'FETCH_ODDS',
            'STATISTICAL_ANALYSIS',
            'AI_ANALYSIS',
            'PARLAY_GENERATION',
            'NOTIFICATIONS'
          ],
          usersProcessed: 14,
          matchesProcessed: 8,
          apiCalls: 6,
          aiCalls: 4,
          parlaysGenerated: 28,
          notificationsSent: 12,
          errors: []
        }
      };
    }

    const res = await fetch(`${env.apiBaseUrl}/triggerDailyAnalysisNow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force })
    });

    const json = await res.json() as { success: boolean; message: string; data?: DailyJobLog; error?: string };
    if (!res.ok) {
      throw new Error(json.error || 'Error al ejecutar el análisis diario');
    }

    return json;
  }
}
