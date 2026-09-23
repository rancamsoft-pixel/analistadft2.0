"use strict";
/**
 * Gestor de Idempotencia y Recovery por Etapas para el Agente Diario.
 *
 * Responsabilidades:
 * 1. Prevenir ejecuciones concurrentes simultáneas (Mutex en Firestore).
 * 2. Idempotencia: No repetir el job si ya está completado en la fecha.
 * 3. Recovery: Guardar checkpoints por etapa para reanudar sin repetir llamadas externas.
 * 4. Persistir telemetría en job_logs/{jobId}.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobLockManager = void 0;
const firestore_1 = require("firebase-admin/firestore");
const logger_js_1 = require("../utils/logger.js");
const logger = new logger_js_1.StructuredLogger('JobLockManager');
class JobLockManager {
    db;
    constructor() {
        this.db = (0, firestore_1.getFirestore)();
    }
    getJobDocRef(date) {
        return this.db.collection('jobs').doc(`dailyAnalysis_${date}`);
    }
    /**
     * Intenta adquirir el lock transaccional para la fecha indicada
     */
    async acquireLock(date, workerInstanceId, force = false) {
        const docRef = this.getJobDocRef(date);
        try {
            const result = await this.db.runTransaction(async (txn) => {
                const snap = await txn.get(docRef);
                const nowIso = new Date().toISOString();
                if (snap.exists) {
                    const data = snap.data();
                    // 1. Si ya se completó hoy y no se fuerza
                    if (data.status === 'COMPLETED' && !force) {
                        return {
                            acquired: false,
                            reason: 'JOB_ALREADY_COMPLETED',
                            lock: data
                        };
                    }
                    // 2. Si otra instancia está ejecutando actualmente
                    if (data.status === 'RUNNING' && !force) {
                        const lastHeartbeat = new Date(data.heartbeatAt || data.lockedAt).getTime();
                        const ageMs = Date.now() - lastHeartbeat;
                        const STALE_THRESHOLD_MS = 25 * 60 * 1000; // 25 minutos
                        if (ageMs < STALE_THRESHOLD_MS) {
                            return {
                                acquired: false,
                                reason: 'JOB_ALREADY_RUNNING',
                                lock: data
                            };
                        }
                        logger.warn(`Detectado lock huérfano para ${date} (edad: ${Math.round(ageMs / 60000)}m). Tomando control para recuperación.`);
                    }
                    // 3. Recuperar progreso previo si falló o fue parcial
                    const isRecovery = data.status === 'FAILED' || data.status === 'PARTIAL' || data.status === 'RUNNING';
                    const updatedLock = {
                        jobId: data.jobId || `job_${date}_${Date.now()}`,
                        date,
                        status: 'RUNNING',
                        lockedAt: nowIso,
                        startedAt: data.startedAt || nowIso,
                        heartbeatAt: nowIso,
                        currentStage: data.currentStage || 'FETCH_FIXTURES',
                        completedStages: data.completedStages || [],
                        stageCheckpoints: data.stageCheckpoints || {},
                        recoveredFromFailure: isRecovery,
                        workerInstanceId
                    };
                    txn.set(docRef, updatedLock, { merge: true });
                    return { acquired: true, lock: updatedLock };
                }
                // 4. Crear nuevo lock
                const newLock = {
                    jobId: `job_${date}_${Date.now()}`,
                    date,
                    status: 'RUNNING',
                    lockedAt: nowIso,
                    startedAt: nowIso,
                    heartbeatAt: nowIso,
                    currentStage: 'FETCH_FIXTURES',
                    completedStages: [],
                    stageCheckpoints: {},
                    workerInstanceId
                };
                txn.set(docRef, newLock);
                return { acquired: true, lock: newLock };
            });
            return result;
        }
        catch (error) {
            logger.error(`Error transaccional al adquirir lock de ${date}`, error);
            return { acquired: false, reason: 'TRANSACTION_ERROR' };
        }
    }
    /**
     * Actualiza la etapa actual y guarda checkpoint de recuperación
     */
    async updateStageCheckpoint(date, completedStage, nextStage, checkpointData) {
        const docRef = this.getJobDocRef(date);
        const nowIso = new Date().toISOString();
        try {
            await this.db.runTransaction(async (txn) => {
                const snap = await txn.get(docRef);
                if (!snap.exists)
                    return;
                const current = snap.data();
                const completedStages = new Set(current.completedStages || []);
                completedStages.add(completedStage);
                const stageCheckpoints = current.stageCheckpoints || {};
                if (checkpointData) {
                    stageCheckpoints[completedStage] = checkpointData;
                }
                txn.update(docRef, {
                    currentStage: nextStage,
                    completedStages: Array.from(completedStages),
                    stageCheckpoints,
                    heartbeatAt: nowIso
                });
            });
        }
        catch (err) {
            logger.warn(`Error actualizando checkpoint de etapa ${completedStage} para ${date}`, {
                error: err.message
            });
        }
    }
    /**
     * Marca el job como exitoso y libera el lock
     */
    async markJobCompleted(date) {
        const docRef = this.getJobDocRef(date);
        const nowIso = new Date().toISOString();
        try {
            await docRef.update({
                status: 'COMPLETED',
                completedAt: nowIso,
                heartbeatAt: nowIso
            });
            logger.info(`Job diario para ${date} marcado como COMPLETED.`);
        }
        catch (err) {
            logger.error(`Error al marcar job como completed para ${date}`, err);
        }
    }
    /**
     * Marca el job como fallido o parcial permitiendo posterior recuperación
     */
    async markJobFailed(date, isPartial, errorMsg) {
        const docRef = this.getJobDocRef(date);
        const nowIso = new Date().toISOString();
        try {
            await docRef.update({
                status: (isPartial ? 'PARTIAL' : 'FAILED'),
                heartbeatAt: nowIso,
                lastError: errorMsg
            });
            logger.warn(`Job diario para ${date} marcado como ${isPartial ? 'PARTIAL' : 'FAILED'}: ${errorMsg}`);
        }
        catch (err) {
            logger.error(`Error al marcar fallo para ${date}`, err);
        }
    }
    /**
     * Guarda el log y telemetría final en job_logs/{jobId}
     */
    async saveJobLog(log) {
        try {
            const logRef = this.db.collection('job_logs').doc(log.jobId);
            await logRef.set(log);
            logger.info(`Telemetría guardada en job_logs/${log.jobId}`, {
                durationMs: log.durationMs,
                usersProcessed: log.usersProcessed,
                parlaysGenerated: log.parlaysGenerated,
                notificationsSent: log.notificationsSent
            });
        }
        catch (err) {
            logger.error(`Error guardando log de auditoría en job_logs/${log.jobId}`, err);
        }
    }
}
exports.JobLockManager = JobLockManager;
//# sourceMappingURL=jobLock.manager.js.map