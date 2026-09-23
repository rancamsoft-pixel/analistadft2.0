/**
 * Job Programado del Agente Diario y Trigger Manual de Administración.
 *
 * Configuración:
 * - Scheduler: 07:00 (America/Bogota) -> '0 7 * * *'
 * - Zona horaria: America/Bogota (configurable vía DAILY_ANALYSIS_TIMEZONE)
 * - Hora configurable vía variable de entorno DAILY_ANALYSIS_SCHEDULE
 * - Admin Trigger con verificación de límites, cooldown y cuota
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { DailyAnalysisOrchestrator } from './dailyAnalysis.orchestrator.js';
import { StructuredLogger } from '../utils/logger.js';
import { apiUsageManager } from '../services/apiUsageManager.js';

const logger = new StructuredLogger('DailyAnalysisJob');

// Cooldown para ejecuciones manuales del admin (mínimo 5 minutos entre ejecuciones)
let lastManualExecutionTimestamp = 0;
const MANUAL_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * 1. Scheduled Job — Ejecución automática diaria a las 07:00 America/Bogota
 */
export const dailyAnalysisJob = onSchedule(
  {
    schedule: process.env['DAILY_ANALYSIS_SCHEDULE'] || '0 7 * * *',
    timeZone: process.env['DAILY_ANALYSIS_TIMEZONE'] || 'America/Bogota',
    retryCount: 1,
    memory: '512MiB',
    timeoutSeconds: 540
  },
  async (event) => {
    logger.info(`[SCHEDULER] Iniciando ejecución programada diaria (Job: ${event.jobName || 'dailyAnalysis'})`);
    const orchestrator = new DailyAnalysisOrchestrator();
    try {
      const summary = await orchestrator.runDailyPipeline();
      logger.info(`[SCHEDULER] Ejecución diaria finalizada con estado: ${summary.status}`, {
        durationMs: summary.durationMs,
        parlaysGenerated: summary.parlaysGenerated,
        notificationsSent: summary.notificationsSent
      });
    } catch (error) {
      logger.error('[SCHEDULER] Error no controlado en la ejecución programada', error as Error);
    }
  }
);

/**
 * 2. Admin HTTPS Trigger — "Ejecutar análisis ahora"
 * Respeta límites, lock, cache, cuota y cooldown.
 */
export const triggerDailyAnalysisNow = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
    return;
  }

  // 1. Verificar Cooldown
  const now = Date.now();
  const timeSinceLast = now - lastManualExecutionTimestamp;
  if (timeSinceLast < MANUAL_COOLDOWN_MS) {
    const remainingSec = Math.ceil((MANUAL_COOLDOWN_MS - timeSinceLast) / 1000);
    res.status(429).json({
      success: false,
      error: `Cooldown activo: Por favor espera ${remainingSec}s antes de ejecutar nuevamente el análisis manual para proteger tu cuota.`
    });
    return;
  }

  // 2. Verificar Presupuesto de API Externa
  const usageCheck = apiUsageManager.canMakeRequest('api-football');
  if (!usageCheck.allowed) {
    res.status(429).json({
      success: false,
      error: 'Presupuesto diario de API-Football alcanzado. La ejecución manual no puede realizar llamadas externas.'
    });
    return;
  }

  // 3. Ejecutar Pipeline
  const force = !!req.body?.force;
  const date = (req.body?.date as string) || new Date().toISOString().split('T')[0]!;

  lastManualExecutionTimestamp = now;
  logger.info(`[ADMIN TRIGGER] Ejecutando análisis manual solicitado para ${date} (force: ${force})`);

  try {
    const orchestrator = new DailyAnalysisOrchestrator();
    const summary = await orchestrator.runDailyPipeline(date, force);

    res.json({
      success: summary.status === 'COMPLETED' || summary.status === 'PARTIAL',
      message: summary.status === 'COMPLETED'
        ? 'Análisis diario completado exitosamente.'
        : `Análisis finalizado con estado: ${summary.status}`,
      data: summary
    });
  } catch (error) {
    logger.error('[ADMIN TRIGGER] Error ejecutando análisis manual', error as Error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
