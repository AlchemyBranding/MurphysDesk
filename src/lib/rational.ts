// Exact rational arithmetic. Every fraction answer in this app is computed here,
// never with floating point, because 0.1 + 0.2 !== 0.3 and a child should never
// be marked wrong for that.

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export class Rational {
  readonly n: number;
  readonly d: number;

  constructor(n: number, d = 1) {
    if (d === 0) throw new Error('denominator zero');
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      throw new Error('Rational takes integers: ' + n + '/' + d);
    }
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
  }

  static of(n: number, d = 1) {
    return new Rational(n, d);
  }

  /** Build from a decimal string or number without floating point error. */
  static fromDecimal(x: string | number): Rational {
    const s = String(x).trim();
    if (!/^-?\d*(\.\d+)?$/.test(s) || s === '' || s === '-') {
      throw new Error('not a decimal: ' + s);
    }
    const neg = s.startsWith('-');
    const body = neg ? s.slice(1) : s;
    const [whole, frac = ''] = body.split('.');
    const digits = (whole || '0') + frac;
    const value = parseInt(digits || '0', 10);
    const den = Math.pow(10, frac.length);
    return new Rational(neg ? -value : value, den);
  }

  add(o: Rational) {
    return new Rational(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Rational) {
    return new Rational(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Rational) {
    return new Rational(this.n * o.n, this.d * o.d);
  }
  div(o: Rational) {
    if (o.n === 0) throw new Error('divide by zero');
    return new Rational(this.n * o.d, this.d * o.n);
  }
  neg() {
    return new Rational(-this.n, this.d);
  }

  get isInteger() {
    return this.d === 1;
  }
  get value() {
    return this.n / this.d;
  }

  cmp(o: Rational): number {
    const l = this.n * o.d;
    const r = o.n * this.d;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  eq(o: Rational) {
    return this.cmp(o) === 0;
  }

  /** "3/4", or "5" when integer. Always in lowest terms. */
  toString(): string {
    return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`;
  }

  /** "1 1/4" for improper fractions. */
  toMixed(): string {
    if (this.d === 1) return String(this.n);
    const sign = this.n < 0 ? '-' : '';
    const a = Math.abs(this.n);
    const whole = Math.floor(a / this.d);
    const rem = a % this.d;
    if (whole === 0) return `${sign}${rem}/${this.d}`;
    return `${sign}${whole} ${rem}/${this.d}`;
  }

  /** Exact decimal if it terminates, otherwise null. */
  toDecimal(maxPlaces = 6): string | null {
    let d = this.d;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    if (d !== 1) return null;
    const v = this.n / this.d;
    const s = v.toFixed(maxPlaces);
    return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  }
}

/** Parse anything a child might reasonably type: 3/4, 0.75, 75%, 1 1/2, £2.50, 2,500. */
export function parseAnswer(raw: string): Rational | null {
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/[£$,\s]/g, (m) => (m === ' ' ? ' ' : ''));
  s = s.replace(/\s+/g, ' ').trim();

  let percent = false;
  if (s.endsWith('%')) {
    percent = true;
    s = s.slice(0, -1).trim();
  }

  let out: Rational | null = null;

  // mixed number "1 1/2"
  const mixed = s.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = parseInt(mixed[1], 10);
    const n = parseInt(mixed[2], 10);
    const d = parseInt(mixed[3], 10);
    if (d === 0) return null;
    const frac = new Rational(n, d);
    out = whole < 0 ? new Rational(whole, 1).sub(frac) : new Rational(whole, 1).add(frac);
  }

  // plain fraction
  if (!out) {
    const f = s.match(/^(-?\d+)\/(-?\d+)$/);
    if (f) {
      const d = parseInt(f[2], 10);
      if (d === 0) return null;
      out = new Rational(parseInt(f[1], 10), d);
    }
  }

  // decimal or integer
  if (!out && /^-?\d*(\.\d+)?$/.test(s) && s !== '' && s !== '-' && s !== '.') {
    try {
      out = Rational.fromDecimal(s);
    } catch {
      return null;
    }
  }

  if (!out) return null;
  return percent ? out.div(new Rational(100)) : out;
}

/** Loose text comparison for word answers. */
export function normaliseText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
