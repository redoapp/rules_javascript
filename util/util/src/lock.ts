import { Condition } from "./async";

export class Semaphore {
  private readonly queue: (() => void)[] = [];
  private readonly condition: Condition<void> | undefined;

  constructor(private count: number) {}

  async use<T>(fn: () => Promise<T>): Promise<T> {
    if (--this.count < 0) {
      const condition = new Condition();
      this.queue.push(condition.resolve);
      await condition.promise;
    }
    try {
      return await fn();
    } finally {
      const resolve = this.queue.shift();
      if (resolve) {
        resolve();
      } else {
        this.count++;
      }
    }
  }
}
