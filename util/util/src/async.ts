export class Condition<T = void> {
  resolve!: (value: T) => void;
  reject!: (e: any) => void;

  // eslint-disable-next-line unicorn/consistent-function-scoping
  readonly promise: Promise<T> = new Promise((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}
