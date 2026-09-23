"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
async function withRetry(operation, options = {}) {
    const { maxRetries = 3, initialDelayMs = 500, backoffFactor = 2, shouldRetry = () => true } = options;
    let attempt = 0;
    let delay = initialDelayMs;
    while (true) {
        try {
            return await operation();
        }
        catch (error) {
            attempt++;
            if (attempt > maxRetries || !shouldRetry(error)) {
                throw error;
            }
            // Añadir jitter para evitar estampida sincronizada
            const jitter = Math.random() * 200;
            await new Promise(resolve => setTimeout(resolve, delay + jitter));
            delay *= backoffFactor;
        }
    }
}
//# sourceMappingURL=retry.js.map