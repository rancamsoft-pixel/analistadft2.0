"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
class CircuitBreaker {
    state = 'CLOSED';
    failureCount = 0;
    lastFailureTime = 0;
    options;
    constructor(options) {
        this.options = options;
    }
    getState() {
        if (this.state === 'OPEN') {
            const now = Date.now();
            if (now - this.lastFailureTime > this.options.recoveryTimeMs) {
                this.state = 'HALF_OPEN';
            }
        }
        return this.state;
    }
    async execute(action) {
        const currentState = this.getState();
        if (currentState === 'OPEN') {
            throw new Error(`[CircuitBreaker:${this.options.serviceName}] Circuito ABIERTO. El servicio se encuentra temporalmente suspendido por fallos reiterados.`);
        }
        try {
            const result = await action();
            this.onSuccess();
            return result;
        }
        catch (err) {
            this.onFailure();
            throw err;
        }
    }
    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }
    onFailure() {
        this.failureCount += 1;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.options.failureThreshold) {
            this.state = 'OPEN';
        }
    }
    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = 0;
    }
}
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=circuitBreaker.js.map