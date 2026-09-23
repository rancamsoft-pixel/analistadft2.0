import { StructuredLogger } from '../utils/logger.js';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  topic?: string;
  token?: string;
}

export class NotificationService {
  private logger = new StructuredLogger('NotificationService');

  async sendOddsAlert(payload: NotificationPayload): Promise<boolean> {
    this.logger.info(`Enviando alerta de valor: "${payload.title}"`, { payload });
    // En producción se utiliza admin.messaging().send(payload)
    return Promise.resolve(true);
  }
}
