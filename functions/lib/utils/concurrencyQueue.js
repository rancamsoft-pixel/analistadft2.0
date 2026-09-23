"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcurrencyQueue = void 0;
class ConcurrencyQueue {
    concurrency;
    running = 0;
    queue = [];
    constructor(concurrency = 2) {
        this.concurrency = concurrency;
    }
    async run(task) {
        if (this.running >= this.concurrency) {
            await new Promise(resolve => {
                this.queue.push(resolve);
            });
        }
        this.running++;
        try {
            return await task();
        }
        finally {
            this.running--;
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                if (next)
                    next();
            }
        }
    }
    get pending() {
        return this.queue.length;
    }
    get active() {
        return this.running;
    }
}
exports.ConcurrencyQueue = ConcurrencyQueue;
//# sourceMappingURL=concurrencyQueue.js.map