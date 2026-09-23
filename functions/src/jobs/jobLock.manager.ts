/**
 * Gestor de Idempotencia y Recovery por Etapas para el Agente Diario.
 *
 * Responsabilidades:
 * 1. Prevenir ejecuciones concurrentes simultáneas (Mutex en Firestore).
 * 2. Idempotencia: No repetir el job si ya está completado en la fecha.
 * 3. Recovery: Guardar checkpoints por etapa para reanudar sin repetir llamadas externas.
 * 4. Persistir telemetría en job_logs/{jobId}.
 */

import { getFirestore } from 'firebase-admin/firestore';
import {
  DailyJobLock,
  DailyJobLog,
  JobExecutionStage,
  JobExecutionStatus
} from './dailyAnalysis.interface.js';
import { StructuredLogger } from '../utils/logger.js';

const logger = new StructuredLogger('JobLockManager');

export class JobLockManager {
  private db: ReturnType<typeof getFirestore>;

  constructor() {
    this.db = getFirestore();
  }

  private getJobDocRef(date: string) {
    return this.db.collection('jobs').doc(`dailyAnalysis_${date}`);
  }

  /**
   * Intenta adquirir el lock transaccional para la fecha indicada
   */
  async acquireLock(
    date: string,
    workerInstanceId: string,
    force: boolean = false
  ): Promise<{ acquired: boolean; reason?: string; lock?: DailyJobLock }> {
    const docRef = this.getJobDocRef(date);

    try {
      const result = await this.db.runTransaction(async (txn) => {
        const snap = await txn.get(docRef);
        const nowIso = new Date().toISOString();

        if (snap.exists) {
          const data = snap.data() as DailyJobLock;

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
          const updatedLock: DailyJobLock = {
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
        const newLock: DailyJobLock = {
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
    } catch (error) {
      logger.error(`Error transaccional al adquirir lock de ${date}`, error as Error);
      return { acquired: false, reason: 'TRANSACTION_ERROR' };
    }
  }

  /**
   * Actualiza la etapa actual y guarda checkpoint de recuperación
   */
  async updateStageCheckpoint(
    date: string,
    completedStage: JobExecutionStage,
    nextStage: JobExecutionStage,
    checkpointData?: Record<string, unknown>
  ): Promise<void> {
    const docRef = this.getJobDocRef(date);
    const nowIso = new Date().toISOString();

    try {
      await this.db.runTransaction(async (txn) => {
        const snap = await txn.get(docRef);
        if (!snap.exists) return;

        const current = snap.data() as DailyJobLock;
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
    } catch (err) {
      logger.warn(`Error actualizando checkpoint de etapa ${completedStage} para ${date}`, {
        error: (err as Error).message
      });
    }
  }

  /**
   * Marca el job como exitoso y libera el lock
   */
  async markJobCompleted(date: string): Promise<void> {
    const docRef = this.getJobDocRef(date);
    const nowIso = new Date().toISOString();

    try {
      await docRef.update({
        status: 'COMPLETED' as JobExecutionStatus,
        completedAt: nowIso,
        heartbeatAt: nowIso
      });
      logger.info(`Job diario para ${date} marcado como COMPLETED.`);
    } catch (err) {
      logger.error(`Error al marcar job como completed para ${date}`, err as Error);
    }
  }

  /**
   * Marca el job como fallido o parcial permitiendo posterior recuperación
   */
  async markJobFailed(date: string, isPartial: boolean, errorMsg: string): Promise<void> {
    const docRef = this.getJobDocRef(date);
    const nowIso = new Date().toISOString();

    try {
      await docRef.update({
        status: (isPartial ? 'PARTIAL' : 'FAILED') as JobExecutionStatus,
        heartbeatAt: nowIso,
        lastError: errorMsg
      });
      logger.warn(`Job diario para ${date} marcado como ${isPartial ? 'PARTIAL' : 'FAILED'}: ${errorMsg}`);
    } catch (err) {
      logger.error(`Error al marcar fallo para ${date}`, err as Error);
    }
  }

  /**
   * Guarda el log y telemetría final en job_logs/{jobId}
   */
  async saveJobLog(log: DailyJobLog): Promise<void> {
    try {
      const logRef = this.db.collection('job_logs').doc(log.jobId);
      await logRef.set(log);
      logger.info(`Telemetría guardada en job_logs/${log.jobId}`, {
        durationMs: log.durationMs,
        usersProcessed: log.usersProcessed,
        parlaysGenerated: log.parlaysGenerated,
        notificationsSent: log.notificationsSent
      });
    } catch (err) {
      logger.error(`Error guardando log de auditoría en job_logs/${log.jobId}`, err as Error);
    }
  }
}
