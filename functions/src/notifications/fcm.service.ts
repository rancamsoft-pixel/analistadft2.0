/**
 * Servicio de Notificaciones Push con Firebase Cloud Messaging (FCM).
 *
 * Principios:
 * 1. Tono prudente y analítico: NUNCA "apuesta esto" ni promesas de ganancia.
 * 2. Deep links directos (/dashboard/focus).
 * 3. Limpieza automática de tokens desinstalados o no registrados.
 * 4. Modo mock / prueba en desarrollo para evitar errores o envíos accidentales.
 */

import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from '../config/index.js';
import { StructuredLogger } from '../utils/logger.js';

const logger = new StructuredLogger('FCMService');

export interface FCMNotificationPayload {
  title: string;
  body: string;
  clickAction?: string;
  category?: 'dailyFocus' | 'parlayReady' | 'importantOddsMovement' | 'matchStartingSoon';
  data?: Record<string, string>;
}

export class FCMService {
  private db: ReturnType<typeof getFirestore>;

  constructor() {
    this.db = getFirestore();
  }

  /**
   * Envía la notificación matutina del análisis diario a un usuario específico
   */
  async sendDailyFocusNotification(
    userId: string,
    tokens: string[],
    opportunitiesCount: number
  ): Promise<{ sent: number; failed: number; invalidTokensRemoved: number }> {
    const oppText = opportunitiesCount === 1
      ? '1 oportunidad destacada'
      : `${opportunitiesCount} oportunidades destacadas`;

    const payload: FCMNotificationPayload = {
      title: '⚽ Tu análisis diario está listo',
      body: `Tu análisis cuantitativo encontró ${oppText} para revisar hoy según tus ligas activas.`,
      clickAction: '/dashboard/focus',
      category: 'dailyFocus',
      data: {
        url: '/dashboard/focus',
        type: 'dailyFocus',
        userId,
        timestamp: new Date().toISOString()
      }
    };

    return this.sendNotificationToUser(userId, tokens, payload);
  }

  /**
   * Envía un payload a todos los tokens activos de un usuario con purga de inválidos
   */
  async sendNotificationToUser(
    userId: string,
    tokens: string[],
    payload: FCMNotificationPayload
  ): Promise<{ sent: number; failed: number; invalidTokensRemoved: number }> {
    if (!tokens || tokens.length === 0) {
      return { sent: 0, failed: 0, invalidTokensRemoved: 0 };
    }

    // Modo Mock o Desarrollo: simulación controlada sin llamadas externas a FCM
    if (config.isMockMode) {
      logger.info(`[MOCK FCM] Notificación simulada para ${userId}: "${payload.title}"`, {
        body: payload.body,
        tokensCount: tokens.length,
        clickAction: payload.clickAction
      });
      return { sent: tokens.length, failed: 0, invalidTokensRemoved: 0 };
    }

    let sent = 0;
    let failed = 0;
    let invalidTokensRemoved = 0;

    const messaging = getMessaging();

    for (const token of tokens) {
      try {
        const message = {
          token,
          notification: {
            title: payload.title,
            body: payload.body
          },
          data: {
            ...payload.data,
            click_action: payload.clickAction || '/dashboard/focus',
            category: payload.category || 'dailyFocus'
          },
          webpush: {
            fcmOptions: {
              link: payload.clickAction || '/dashboard/focus'
            },
            notification: {
              icon: '/pwa-192x192.png',
              badge: '/favicon.ico'
            }
          }
        };

        await messaging.send(message);
        sent++;
      } catch (error: any) {
        failed++;
        const errorCode = error?.code || error?.errorInfo?.code;

        // Limpieza de tokens que ya no son válidos (desinstalados, expirados)
        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/invalid-argument'
        ) {
          logger.warn(`Token FCM inválido para ${userId}. Eliminando de la base de datos...`, { token, errorCode });
          await this.removeInvalidToken(userId, token);
          invalidTokensRemoved++;
        } else {
          logger.warn(`Error enviando notificación FCM a ${userId}`, {
            error: error?.message,
            errorCode
          });
        }
      }
    }

    return { sent, failed, invalidTokensRemoved };
  }

  /**
   * Guarda o actualiza un token FCM para el usuario
   */
  async saveUserNotificationToken(
    userId: string,
    tokenId: string,
    deviceType: 'web' | 'android' | 'ios' = 'web'
  ): Promise<void> {
    const tokenDoc = this.db
      .collection('users')
      .doc(userId)
      .collection('notificationTokens')
      .doc(tokenId);

    await tokenDoc.set({
      tokenId,
      deviceType,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });

    logger.info(`Token FCM registrado exitosamente para ${userId}`);
  }

  /**
   * Elimina un token inválido de la subcolección del usuario
   */
  async removeInvalidToken(userId: string, tokenId: string): Promise<void> {
    try {
      await this.db
        .collection('users')
        .doc(userId)
        .collection('notificationTokens')
        .doc(tokenId)
        .delete();
      logger.info(`Token inválido eliminado: ${tokenId.slice(0, 12)}... de ${userId}`);
    } catch (err) {
      logger.warn(`No se pudo eliminar token de ${userId}`, { error: (err as Error).message });
    }
  }

  /**
   * Obtiene todos los tokens registrados de un usuario
   */
  async getUserTokens(userId: string): Promise<string[]> {
    try {
      const snap = await this.db
        .collection('users')
        .doc(userId)
        .collection('notificationTokens')
        .get();

      if (snap.empty) return [];
      return snap.docs.map(d => d.id);
    } catch (err) {
      logger.warn(`Error leyendo tokens FCM de ${userId}`, { error: (err as Error).message });
      return [];
    }
  }
}
