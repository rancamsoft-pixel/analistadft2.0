export class ConcurrencyQueue {
  private concurrency: number;
  private running: number = 0;
  private queue: Array<() => void> = [];

  constructor(concurrency: number = 2) {
    this.concurrency = concurrency;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.concurrency) {
      await new Promise<void>(resolve => {
        this.queue.push(resolve);
      });
    }

    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }

  get pending(): number {
    return this.queue.length;
  }

  get active(): number {
    return this.running;
  }
}
