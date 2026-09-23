export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface StructuredLogPayload {
  severity: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class StructuredLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private emit(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error, correlationId?: string): void {
    const payload: StructuredLogPayload = {
      severity: level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      correlationId: correlationId || `corr-${Math.random().toString(36).substring(2, 9)}`,
      data
    };

    if (error) {
      payload.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    const jsonString = JSON.stringify(payload);

    switch (level) {
      case 'error':
        console.error(jsonString);
        break;
      case 'warn':
        console.warn(jsonString);
        break;
      case 'debug':
        console.debug(jsonString);
        break;
      case 'info':
      default:
        console.log(jsonString);
        break;
    }
  }

  info(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.emit('info', message, data, undefined, correlationId);
  }

  warn(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.emit('warn', message, data, undefined, correlationId);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>, correlationId?: string): void {
    this.emit('error', message, data, error, correlationId);
  }

  debug(message: string, data?: Record<string, unknown>, correlationId?: string): void {
    this.emit('debug', message, data, undefined, correlationId);
  }
}
