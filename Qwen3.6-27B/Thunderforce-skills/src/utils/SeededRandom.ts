/**
 * Seeded pseudo-random number generator for deterministic gameplay
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number = 1) {
    this.seed = seed;
  }

  /**
   * Returns a pseudo-random float in [0, 1)
   */
  next(): number {
    // Mulberry32 - fast, good quality PRNG
    this.seed |= 0;
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = Math.imul(t ^ (t >>> 7), 61 | t);
    t = t ^ (t >>> 14);
    return ((t < 0 ? ~t + 1 : t) % 2147483647) / 2147483647;
  }

  /**
   * Returns a pseudo-random integer in [min, max)
   */
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Returns a random element from an array
   */
  pick<T>(arr: T[]): T {
    return arr[this.range(0, arr.length)];
  }

  /**
   * Returns true with the given probability (0-1)
   */
  chance(prob: number): boolean {
    return this.next() < prob;
  }
}
