export default class Restarter {
  private readonly log: number[] = [];
  private timeout: any | null = null;
  private readonly factor: number;
  private readonly min: number;
  private readonly max: number;

  constructor() {
    this.factor = 2;
    this.min = 50;
    this.max = 5000;
  }

  exited(restart: () => void) {
    clearTimeout(this.timeout);
    const stamp = Date.now();
    if (this.log.length > 0) {
      const last = this.log[this.log.length - 1];
      if (last < (stamp - (this.max * 2))) {
        this.log.splice(0, this.log.length);
      }
    }
    this.log.push(stamp);
    const wait = backoff(this.factor, this.min, this.max, this.log.length);
    this.timeout = setTimeout(restart, wait);
  }
}

function backoff(factor: number, min: number, max: number, failures: number) {
  return Math.min(max, Math.pow(factor, failures - 1) * min);
}
