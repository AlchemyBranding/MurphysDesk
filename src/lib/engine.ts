import { RNG } from './rng';
import { Rational, gcd, parseAnswer, normaliseText } from './rational';

export type Strand = 'maths' | 'english';

/** How the item is being served right now. */
export type Mode = 'teach' | 'complete' | 'solo' | 'gate' | 'retention';

export type InputKind = 'number' | 'fraction' | 'text' | 'choice';

export interface Option {
  label: string;
  correct: boolean;
  /** Every wrong option must name the misconception it comes from. Enforced by the content check. */
  misconceptionId?: string;
}

export interface Step {
  /** One line of working. Shown in full for a worked example, blanked from the end for a completion problem. */
  say: string;
}

export interface MarkResult {
  correct: boolean;
  misconceptionId?: string;
}

export interface GeneratedItem {
  templateId: string;
  objectiveId: string;
  seed: number;
  input: InputKind;
  /** The question. Plain text; \n becomes a line break. */
  stem: string;
  /** Small instruction under the stem, e.g. "in its simplest form". */
  note?: string;
  options?: Option[];
  /** What a correct answer looks like, for the explanation. */
  canonical: string;
  /** Working, one line per step. The last line is the answer. */
  working: Step[];
  /** Spoken aloud instead of shown, for spelling. */
  speak?: string;
  unit?: string;
  mark(raw: string): MarkResult;
}

export interface Template {
  id: string;
  objectiveId: string;
  /** 1 easiest to 5 hardest, assigned by hand. Never estimated from her responses: with one learner it is unidentifiable. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** 0 same as taught, 1 different form, 2 new context, 3 must recognise the method applies. */
  transfer: 0 | 1 | 2 | 3;
  generate(rng: RNG): GeneratedItem;
}

export interface Objective {
  id: string;
  strand: Strand;
  title: string;
  /** Pupil facing. Goes on the wall verbatim when she passes the gate. */
  canDo: string;
  /** Shown before the first worked example. Two or three sentences, no jargon. */
  teach: string;
  prereqs: string[];
  /** The fixed weekly pace. Mastery gates ordering; this gates overall progress. */
  week: number;
  misconceptions: Record<string, string>;
  /**
   * An optional explanation video, for the objectives where the procedure only
   * makes sense once the concept underneath it does. Offered on the "something
   * new" card and available again from the session header. Never during a
   * question, and never as a consequence of getting something wrong.
   *
   * Oak National Academy, Open Government Licence v3.0. Their video is served
   * from Mux with a signed playback policy, so it cannot be embedded without an
   * Oak API key; this opens their page in a new tab instead. If a key is ever
   * obtained, only this type and ObjectiveVideoCard need to change.
   */
  video?: ObjectiveVideo;
}

export interface ObjectiveVideo {
  /** Verified pupil facing lesson page. Every one of these was fetched, not guessed. */
  url: string;
  title: string;
  /** Oak sequences some of these below Year 6. Shown so nobody is surprised. */
  year: string;
  /** What the video adds that the worked examples do not. */
  why: string;
}

// ---------------------------------------------------------------- marking

interface NumericOpts {
  /** Wrong answers that mean something specific. */
  traps?: { value: string; misconceptionId: string }[];
  /** Reject 2/4 for 1/2. */
  requireSimplest?: boolean;
  /** Accept these literal strings too (case insensitive). */
  alsoAccept?: string[];
}

export function markNumeric(canonical: Rational, opts: NumericOpts = {}) {
  return (raw: string): MarkResult => {
    const trimmed = raw.trim();
    if (!trimmed) return { correct: false };

    if (opts.alsoAccept) {
      for (const a of opts.alsoAccept) {
        if (normaliseText(a) === normaliseText(trimmed)) return { correct: true };
      }
    }

    const got = parseAnswer(trimmed);
    if (!got) return { correct: false };

    if (opts.requireSimplest) {
      const m = trimmed.replace(/\s/g, '').match(/^(-?\d+)\/(\d+)$/);
      if (m && gcd(parseInt(m[1], 10), parseInt(m[2], 10)) !== 1) {
        return { correct: false, misconceptionId: 'not-simplified' };
      }
    }

    if (got.eq(canonical)) return { correct: true };

    for (const t of opts.traps ?? []) {
      const tv = parseAnswer(t.value);
      if (tv && got.eq(tv)) return { correct: false, misconceptionId: t.misconceptionId };
    }
    return { correct: false };
  };
}

export function markText(accept: string[], traps: { value: string; misconceptionId: string }[] = []) {
  const ok = accept.map(normaliseText);
  return (raw: string): MarkResult => {
    const got = normaliseText(raw);
    if (!got) return { correct: false };
    if (ok.includes(got)) return { correct: true };
    for (const t of traps) {
      if (normaliseText(t.value) === got) return { correct: false, misconceptionId: t.misconceptionId };
    }
    return { correct: false };
  };
}

export function markChoice(options: Option[]) {
  return (raw: string): MarkResult => {
    const picked = options.find((o) => normaliseText(o.label) === normaliseText(raw));
    if (!picked) return { correct: false };
    return picked.correct ? { correct: true } : { correct: false, misconceptionId: picked.misconceptionId };
  };
}

/** Convenience for a multiple choice item: shuffles and wires the marker. */
export function choiceItem(
  base: Omit<GeneratedItem, 'input' | 'mark' | 'options' | 'canonical'> & { options: Option[] },
  rng: RNG
): GeneratedItem {
  const options = rng.shuffle(base.options);
  const correct = options.find((o) => o.correct);
  return {
    ...base,
    input: 'choice',
    options,
    canonical: correct ? correct.label : '',
    mark: markChoice(options),
  };
}

// ---------------------------------------------------------------- formatting

export function frac(n: number, d: number): string {
  return `${n}/${d}`;
}

/** 1234567 -> "1,234,567" */
export function commas(n: number): string {
  return n.toLocaleString('en-GB');
}

const ONES = [
  'zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve',
  'thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen',
];
const TENS = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

export function inWords(n: number): string {
  if (n < 0) return 'minus ' + inWords(-n);
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)];
    const r = n % 10;
    return r ? `${t}-${ONES[r]}` : t;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return r ? `${ONES[h]} hundred and ${inWords(r)}` : `${ONES[h]} hundred`;
  }
  const units: [number, string][] = [
    [1_000_000_000, 'billion'],
    [1_000_000, 'million'],
    [1_000, 'thousand'],
  ];
  for (const [size, name] of units) {
    if (n >= size) {
      const big = Math.floor(n / size);
      const rest = n % size;
      let out = `${inWords(big)} ${name}`;
      if (rest) out += (rest < 100 ? ' and ' : ' ') + inWords(rest);
      return out;
    }
  }
  return String(n);
}
