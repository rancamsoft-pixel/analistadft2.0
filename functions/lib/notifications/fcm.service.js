"use strict";
/**
 * Servicio de Notificaciones Push con Firebase Cloud Messaging (FCM).
 *
 * Principios:
 * 1. Tono prudente y analítico: NUNCA "apuesta esto" ni promesas de ganancia.
 * 2. Deep links directos (/dashboard/focus).
 * 3. Limpieza automática de tokens desinstalados o no registrados.
 * 4. Modo mock / prueba en desarrollo para evitar errores o envíos accidentales.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FCMService = void 0;
const messaging_1 = require("firebase-admin/messaging");
const firestore_1 = require("firebase-admin/firestore");
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
const logger = new logger_js_1.StructuredLogger('FCMService');
class FCMService {
    db;
    constructor() {
        this.db = (0, firestore_1.getFirestore)();
    }
    /**
     * Envía la notificación matutina del análisis diario a un usuario específico
     */
    async sendDailyFocusNotification(userId, tokens, opportunitiesCount) {
        const oppText = opportunitiesCount === 1
            ? '1 oportunidad destacada'
            : `${opportunitiesCount} oportunidades destacadas`;
        const payload = {
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
    async sendNotificationToUser(userId, tokens, payload) {
        if (!tokens || tokens.length === 0) {
            return { sent: 0, failed: 0, invalidTokensRemoved: 0 };
        }
        // Modo Mock o Desarrollo: simulación controlada sin llamadas externas a FCM
        if (index_js_1.config.isMockMode) {
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
        const messaging = (0, messaging_1.getMessaging)();
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
            }
            catch (error) {
                failed++;
                const errorCode = error?.code || error?.errorInfo?.code;
                // Limpieza de tokens que ya no son válidos (desinstalados, expirados)
                if (errorCode === 'messaging/registration-token-not-registered' ||
                    errorCode === 'messaging/invalid-registration-token' ||
                    errorCode === 'messaging/invalid-argument') {
                    logger.warn(`Token FCM inválido para ${userId}. Eliminando de la base de datos...`, { token, errorCode });
                    await this.removeInvalidToken(userId, token);
                    invalidTokensRemoved++;
                }
                else {
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
    async saveUserNotificationToken(userId, tokenId, deviceType = 'web') {
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
    async removeInvalidToken(userId, tokenId) {
        try {
            await this.db
                .collection('users')
                .doc(userId)
                .collection('notificationTokens')
                .doc(tokenId)
                .delete();
            logger.info(`Token inválido eliminado: ${tokenId.slice(0, 12)}... de ${userId}`);
        }
        catch (err) {
            logger.warn(`No se pudo eliminar token de ${userId}`, { error: err.message });
        }
    }
    /**
     * Obtiene todos los tokens registrados de un usuario
     */
    async getUserTokens(userId) {
        try {
            const snap = await this.db
                .collection('users')
                .doc(userId)
                .collection('notificationTokens')
                .get();
            if (snap.empty)
                return [];
            return snap.docs.map(d => d.id);
        }
        catch (err) {
            logger.warn(`Error leyendo tokens FCM de ${userId}`, { error: err.message });
            return [];
        }
    }
}
exports.FCMService = FCMService;
//# sourceMappingURL=fcm.service.js.map