/**
 * Interfaces y tipos canónicos del Agente Diario Automático.
 */

export type JobExecutionStage =
  | 'FETCH_FIXTURES'
  | 'FETCH_ODDS'
  | 'STATISTICAL_ANALYSIS'
  | 'AI_ANALYSIS'
  | 'PARLAY_GENERATION'
  | 'NOTIFICATIONS';

export type JobExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL';

export const JOB_STAGES_ORDER: JobExecutionStage[] = [
  'FETCH_FIXTURES',
  'FETCH_ODDS',
  'STATISTICAL_ANALYSIS',
  'AI_ANALYSIS',
  'PARLAY_GENERATION',
  'NOTIFICATIONS'
];

/**
 * Documento de Lock e Idempotencia en Firestore: jobs/dailyAnalysis_{YYYY-MM-DD}
 */
export interface DailyJobLock {
  jobId: string;
  date: string; // YYYY-MM-DD
  status: JobExecutionStatus;
  lockedAt: string;
  startedAt: string;
  heartbeatAt: string;
  completedAt?: string;
  currentStage: JobExecutionStage;
  completedStages: JobExecutionStage[];
  stageCheckpoints: Record<string, unknown>;
  recoveredFromFailure?: boolean;
  workerInstanceId: string;
}

/**
 * Log y telemetría de auditoría: job_logs/{jobId}
 */
export interface DailyJobLog {
  jobId: string;
  date: string; // YYYY-MM-DD
  status: JobExecutionStatus;
  start: string;
  end?: string;
  durationMs: number;
  currentStage?: JobExecutionStage;
  completedStages: JobExecutionStage[];
  usersProcessed: number;
  matchesProcessed: number;
  apiCalls: number;
  aiCalls: number;
  parlaysGenerated: number;
  notificationsSent: number;
  errors: string[];
}

/**
 * Preferencias activas y tokens FCM de un usuario procesado
 */
export interface DailyAnalysisUserContext {
  userId: string;
  email?: string;
  displayName?: string;
  activeCompetitionIds: string[];
  activeBookmakerIds: string[];
  activeMarketKeys: string[];
  oddsFormat: 'decimal' | 'american';
  notificationSettings: {
    dailyFocus: boolean;
    parlayReady: boolean;
    importantOddsMovement: boolean;
    matchStartingSoon: boolean;
  };
  notificationTokens: string[];
}
