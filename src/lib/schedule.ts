import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card, type Grade } from 'ts-fsrs';

// FSRS-6 with the published default parameters. We never run the optimiser:
// one learner will not generate enough reviews in a year for fitting to be
// anything other than overfitting.
//
// Scheduling is at OBJECTIVE level, not item level. The memory being tracked is
// of a skill, and a question is an interchangeable draw from a template. That
// keeps the table at roughly one row per objective and stops her memorising
// "the answer to question 47".

const params = generatorParameters({
  request_retention: 0.9,
  enable_fuzz: true,
  // Same-session repeats are the least valuable thing you can spend a
  // ten-year-old's half hour on, so the first step is deliberately long.
  learning_steps: ['1d'],
  relearning_steps: ['1d'],
});

export const scheduler = fsrs(params);

export interface ReviewRow {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
  retention_rung: number;
}

export function emptyReview(): ReviewRow {
  const c = createEmptyCard(new Date());
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: null,
    retention_rung: 0,
  };
}

function toCard(r: ReviewRow): Card {
  return {
    due: new Date(r.due),
    stability: r.stability,
    difficulty: r.difficulty,
    elapsed_days: r.elapsed_days,
    scheduled_days: r.scheduled_days,
    learning_steps: 0,
    reps: r.reps,
    lapses: r.lapses,
    state: r.state as State,
    last_review: r.last_review ? new Date(r.last_review) : undefined,
  };
}

/**
 * Derive the rating from performance. Never ask a child to grade herself:
 * the Anki manual's own warning is that FSRS degrades badly when people press
 * Hard where they should press Again, and a ten-year-old will do exactly that.
 */
export function deriveRating(correct: number, total: number, meanMs: number, hinted: boolean): Grade {
  if (total === 0) return Rating.Again;
  const acc = correct / total;
  if (acc < 0.5) return Rating.Again;
  if (acc < 1 || hinted || meanMs > 45000) return Rating.Hard;
  if (meanMs < 12000) return Rating.Easy;
  return Rating.Good;
}

export function review(row: ReviewRow, rating: Grade, now = new Date()): ReviewRow {
  const card = toCard(row);
  const out = scheduler.next(card, now, rating);
  const c = out.card;
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.toISOString() : now.toISOString(),
    retention_rung: rating === Rating.Again ? Math.max(0, row.retention_rung - 1) : row.retention_rung + 1,
  };
}

export { Rating };
