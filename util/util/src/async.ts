export class Condition<T = void> {
  resolve!: (value: T) => void;
  reject!: (e: any) => void;

  readonly promise: Promise<T> = new Promise((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}
