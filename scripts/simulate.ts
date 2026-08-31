/**
 * Drive the session engine with a simulated learner, with no database and no
 * browser. Checks that the thing terminates, that gates open, that a weak
 * learner gets parked rather than ground down, and that nothing deadlocks.
 *
 *   npm exec tsx scripts/simulate.ts
 */
import { generate, OBJ_BY_ID, OBJECTIVES } from '../src/content';
import { nextStep, masteryThreshold, GATE_LENGTH, GATE_PASS } from '../src/lib/session';
import { updateBkt } from '../src/lib/bkt';
import { emptyReview, review, Rating, type ReviewRow } from '../src/lib/schedule';
import type { MasteryRow } from '../src/lib/supabase';

const LEARNER = 'sim';

function blank(objectiveId: string): MasteryRow {
  return {
    learner_id: LEARNER,
    objective_id: objectiveId,
    status: 'available',
    p_known: 0.25,
    rung: 0,
    consecutive_correct: 0,
    consecutive_wrong: 0,
    attempts_count: 0,
    correct_count: 0,
    misconceptions: {},
    gate_fails: 0,
    halted: false,
    first_gated_at: null,
    last_seen_at: null,
  };
}

function apply(m: MasteryRow, correct: boolean, typed: boolean, mode: string): MasteryRow {
  const pKnown = mode === 'teach' ? m.p_known : updateBkt(m.p_known, correct, typed);
  let rung = m.rung;
  let cc = correct ? m.consecutive_correct + 1 : 0;
  let cw = correct ? 0 : m.consecutive_wrong + 1;
  if (cc >= 2 && rung < 2) {
    rung += 1;
    cc = 0;
  } else if (cw >= 2 && rung > 0) {
    rung -= 1;
    cw = 0;
  }
  return {
    ...m,
    status: m.status === 'available' ? 'learning' : m.status,
    p_known: pKnown,
    rung,
    consecutive_correct: cc,
    consecutive_wrong: cw,
    attempts_count: m.attempts_count + 1,
    correct_count: m.correct_count + (correct ? 1 : 0),
  };
}

function run(name: string, skill: number, sessions: number) {
  const mastery: Record<string, MasteryRow> = {};
  const reviews: Record<string, ReviewRow> = {};
  interface Gate { objectiveId: string; index: number; correct: number }
  let gate: Gate | null = null;
  let week = 1;
  let totalItems = 0;
  let gatesPassed = 0;
  let gatesFailed = 0;
  let parked = 0;
  let stalls = 0;

  for (let s = 0; s < sessions; s++) {
    if (s > 0 && s % 4 === 0) week = Math.min(12, week + 1);
    const history: string[] = [];
    for (let i = 0; i < 18; i++) {
      const step = nextStep({
        mastery,
        reviews,
        week,
        history,
        gate: gate ? { objectiveId: gate.objectiveId, index: gate.index } : null,
      });
      if (!step) {
        stalls++;
        break;
      }
      const item = generate(step.templateId, step.seed);
      if (!item) throw new Error('generate failed for ' + step.templateId);
      totalItems++;
      history.push(step.objectiveId);

      const m = mastery[step.objectiveId] ?? blank(step.objectiveId);
      if (step.mode === 'gate' && (m.status === 'gated' || m.status === 'retained')) {
        throw new Error('re-gating an objective that is already secure: ' + step.objectiveId);
      }
      // Worked-example and completion rungs are much easier than solo.
      const support = step.mode === 'teach' ? 0.35 : step.mode === 'complete' ? 0.2 : 0;
      const correct = Math.random() < Math.min(0.98, skill + support);
      const updated = apply(m, correct, item.input !== 'choice', step.mode);
      mastery[step.objectiveId] = updated;

      if (step.mode === 'gate') {
        const g: Gate = gate ?? { objectiveId: step.objectiveId, index: 1, correct: 0 };
        const next: Gate = { ...g, correct: g.correct + (correct ? 1 : 0), index: g.index + 1 };
        if (next.index > GATE_LENGTH) {
          const passed =
            next.correct >= GATE_PASS && updated.p_known >= masteryThreshold(next.objectiveId);
          if (passed) {
            gatesPassed++;
            mastery[next.objectiveId] = { ...updated, status: 'gated', gate_fails: 0 };
            reviews[next.objectiveId] = review(emptyReview(), Rating.Good);
          } else {
            gatesFailed++;
            const fails = updated.gate_fails + 1;
            mastery[next.objectiveId] = {
              ...updated,
              gate_fails: fails,
              halted: fails >= 2,
              rung: Math.max(0, updated.rung - 1),
              consecutive_correct: 0,
              consecutive_wrong: 0,
              status: 'learning',
            };
            if (fails >= 2) parked++;
          }
          gate = null;
        } else {
          gate = next;
        }
      } else if (step.mode === 'retention') {
        reviews[step.objectiveId] = review(
          reviews[step.objectiveId] ?? emptyReview(),
          correct ? Rating.Good : Rating.Again
        );
      }
    }
  }

  const onWall = Object.values(mastery).filter((m) => m.status === 'gated').length;
  console.log(
    `${name.padEnd(10)} items ${String(totalItems).padStart(4)}  ` +
      `on the wall ${String(onWall).padStart(2)}  ` +
      `gates ${gatesPassed} passed / ${gatesFailed} failed  ` +
      `parked ${parked}  stalls ${stalls}`
  );
  return { onWall, parked, stalls, totalItems };
}

console.log(`${OBJECTIVES.length} objectives.\n`);
const strong = run('strong', 0.9, 40);
const middling = run('middling', 0.7, 40);
const struggling = run('struggling', 0.4, 40);

console.log('');
let bad = 0;
if (strong.onWall < 8) {
  console.log('FAIL: a strong learner should have cleared more than 8 objectives in 40 sessions.');
  bad++;
}
if (struggling.parked === 0) {
  console.log('WARN: a struggling learner was never parked. The halt path may be unreachable.');
}
if (strong.stalls > 2) {
  console.log('FAIL: the engine ran out of things to do too often.');
  bad++;
}
if (bad === 0) console.log('Engine behaves.');
process.exit(bad ? 1 : 0);
