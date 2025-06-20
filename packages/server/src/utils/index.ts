export class Deffered<V = any, R = any> {
  resolve!: (value: V) => void;
  reject!: (reason?: R) => void;
  promise: Promise<V>;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

export const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
  