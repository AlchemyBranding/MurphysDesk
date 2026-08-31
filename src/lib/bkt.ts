// Bayesian knowledge tracing with hand-set parameters.
//
// These are conventional values from the literature (Corbett and Anderson 1995),
// not values fitted to Murphy. Fitting needs hundreds of learners; with one
// learner you would be fitting noise. They are here in one place so they can be
// argued with rather than buried.

export interface BktParams {
  /** Probability the skill is already known before any practice. */
  prior: number;
  /** Probability of moving from not-known to known at each opportunity. */
  learn: number;
  /** Probability of a correct answer while not knowing. Below the 1-in-4 chance rate,
   *  because good distractors are attractive rather than random. */
  guessChoice: number;
  /** Guessing a typed numeric answer is much harder than guessing from four options. */
  guessTyped: number;
  /** Probability of a wrong answer while knowing. */
  slip: number;
}

export const BKT: BktParams = {
  prior: 0.25,
  learn: 0.15,
  guessChoice: 0.22,
  guessTyped: 0.05,
  slip: 0.1,
};

/** Mastery threshold. 0.95 is the convention; foundational objectives use 0.98. */
export const MASTERY = 0.95;
export const MASTERY_FOUNDATIONAL = 0.98;

export function updateBkt(pKnown: number, correct: boolean, typed: boolean): number {
  const g = typed ? BKT.guessTyped : BKT.guessChoice;
  const s = BKT.slip;
  const p = Math.min(Math.max(pKnown, 0.001), 0.999);

  // Posterior given the observation
  const post = correct
    ? (p * (1 - s)) / (p * (1 - s) + (1 - p) * g)
    : (p * s) / (p * s + (1 - p) * (1 - g));

  // Then the chance of learning it this go
  const next = post + (1 - post) * BKT.learn;
  return Math.min(Math.max(next, 0.001), 0.999);
}

/** Anything under this many milliseconds is a tap, not an answer. */
export const RAPID_MS = 3000;
