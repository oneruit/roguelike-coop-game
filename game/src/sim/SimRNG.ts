/**
 * Deterministic PRNG using Mulberry32 algorithm.
 * Guarantees exact reproducible simulation results across Node.js and browser environments.
 */
export class SimRNG {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 1337;
  }

  /**
   * Generates a deterministic float in range [0, 1)
   */
  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a deterministic integer in range [min, max] inclusive
   */
  public nextInt(min: number, max: number): number {
    const f = this.nextFloat();
    return Math.floor(f * (max - min + 1)) + min;
  }

  /**
   * Generates a deterministic float in range [min, max)
   */
  public nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  public getState(): number {
    return this.state;
  }

  public setState(state: number): void {
    this.state = state >>> 0;
  }
}
