/**
 * Deterministic PRNG using the Mulberry32 algorithm with string hashing support.
 * Guarantees 100% reproducible world generation across all clients and game sessions.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number | string = 1337) {
    this.state = typeof seed === 'string' ? SeededRNG.hashString(seed) : (seed >>> 0);
    if (this.state === 0) this.state = 1337;
  }

  /**
   * Fast, reliable FNV-1a 32-bit hash function for string seeds.
   */
  public static hashString(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /**
   * Generates a deterministic float in range [0, 1)
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a deterministic float in range [min, max)
   */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates a deterministic integer in range [min, max] inclusive
   */
  public rangeInt(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }

  /**
   * Picks a random element from an array.
   */
  public pick<T>(array: T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  /**
   * Deterministically shuffles an array in-place (Fisher-Yates).
   */
  public shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  public getState(): number {
    return this.state;
  }
}
