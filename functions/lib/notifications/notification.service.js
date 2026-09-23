"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const logger_js_1 = require("../utils/logger.js");
class NotificationService {
    logger = new logger_js_1.StructuredLogger('NotificationService');
    async sendOddsAlert(payload) {
        this.logger.info(`Enviando alerta de valor: "${payload.title}"`, { payload });
        // En producción se utiliza admin.messaging().send(payload)
        return Promise.resolve(true);
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map