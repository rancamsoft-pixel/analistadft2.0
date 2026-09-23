"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredLogger = void 0;
class StructuredLogger {
    context;
    constructor(context) {
        this.context = context;
    }
    emit(level, message, data, error, correlationId) {
        const payload = {
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
    info(message, data, correlationId) {
        this.emit('info', message, data, undefined, correlationId);
    }
    warn(message, data, correlationId) {
        this.emit('warn', message, data, undefined, correlationId);
    }
    error(message, error, data, correlationId) {
        this.emit('error', message, data, error, correlationId);
    }
    debug(message, data, correlationId) {
        this.emit('debug', message, data, undefined, correlationId);
    }
}
exports.StructuredLogger = StructuredLogger;
//# sourceMappingURL=logger.js.map