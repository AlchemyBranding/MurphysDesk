// Deterministic seeded random. The same seed always produces the same question,
// which is what lets us store (templateId, seed) in the database instead of the
// whole question, and regenerate it identically later.

export class RNG {
  private s: number;

  constructor(seed: number) {
    // mulberry32
    this.s = seed >>> 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [lo, hi] inclusive. */
  int(lo: number, hi: number): number {
    if (hi < lo) [lo, hi] = [hi, lo];
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[this.int(0, arr.length - 1)];
  }

  /** n distinct members, in random order. Throws if n exceeds the pool. */
  sample<T>(arr: readonly T[], n: number): T[] {
    if (n > arr.length) throw new Error('sample larger than pool');
    const copy = arr.slice();
    const out: T[] = [];
    for (let i = 0; i < n; i++) {
      const j = this.int(0, copy.length - 1);
      out.push(copy[j]);
      copy.splice(j, 1);
    }
    return out;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  bool(): boolean {
    return this.next() < 0.5;
  }
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}
