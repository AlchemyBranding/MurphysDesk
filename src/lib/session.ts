import { OBJECTIVES, OBJ_BY_ID, FOUNDATIONAL, TEMPLATES_BY_OBJECTIVE, pickTemplate } from '@/content';
import type { Objective } from './engine';
import { RNG, newSeed } from './rng';
import { MASTERY, MASTERY_FOUNDATIONAL } from './bkt';
import type { MasteryRow } from './supabase';
import type { ReviewRow } from './schedule';

export type StepMode = 'teach' | 'complete' | 'solo' | 'gate' | 'retention';

export interface Step {
  objectiveId: string;
  templateId: string;
  seed: number;
  mode: StepMode;
  /** Which item of the gate set this is, 1 to 6. */
  gateIndex?: number;
}

export const GATE_LENGTH = 6;
export const GATE_PASS = 5;

export function masteryThreshold(objectiveId: string): number {
  return FOUNDATIONAL.has(objectiveId) ? MASTERY_FOUNDATIONAL : MASTERY;
}

function isSecure(m: MasteryRow | undefined): boolean {
  return !!m && (m.status === 'gated' || m.status === 'retained');
}

/** Objectives she is allowed to meet: within the week pace, prerequisites secure, not already gated. */
export function availableObjectives(
  mastery: Record<string, MasteryRow>,
  week: number
): Objective[] {
  return OBJECTIVES.filter((o) => {
    if (o.week > week) return false;
    const m = mastery[o.id];
    if (m?.halted) return false;
    if (isSecure(m)) return false;
    return o.prereqs.every((p) => isSecure(mastery[p]));
  }).sort((a, b) => a.week - b.week || a.id.localeCompare(b.id));
}

/** Prerequisites of a failed objective that are not yet secure. The backward walk. */
export function weakestPrereq(objectiveId: string, mastery: Record<string, MasteryRow>): string | null {
  const o = OBJ_BY_ID[objectiveId];
  if (!o) return null;
  const open = o.prereqs.filter((p) => !isSecure(mastery[p]) && TEMPLATES_BY_OBJECTIVE[p]?.length);
  if (open.length === 0) return null;
  return open
    .slice()
    .sort((a, b) => (mastery[a]?.p_known ?? 0) - (mastery[b]?.p_known ?? 0))[0];
}

export function dueReviews(reviews: Record<string, ReviewRow>, now = new Date()): string[] {
  return Object.entries(reviews)
    .filter(([, r]) => new Date(r.due).getTime() <= now.getTime())
    .sort((a, b) => new Date(a[1].due).getTime() - new Date(b[1].due).getTime())
    .map(([id]) => id);
}

export function modeForRung(rung: number): StepMode {
  if (rung <= 0) return 'teach';
  if (rung === 1) return 'complete';
  return 'solo';
}

/**
 * Ready for the gate: independent, four in a row, and the belief already at the
 * threshold. The gate is meant to confirm something we already think is true,
 * not to be a lottery she keeps losing. Anything already secure is excluded, or
 * she would re-sit the same check forever.
 */
export function gateReady(m: MasteryRow): boolean {
  if (m.halted) return false;
  if (m.status === 'gated' || m.status === 'retained') return false;
  return m.rung >= 2 && m.consecutive_correct >= 4 && m.p_known >= masteryThreshold(m.objective_id);
}

export interface PlanContext {
  mastery: Record<string, MasteryRow>;
  reviews: Record<string, ReviewRow>;
  week: number;
  /** Objectives already served in this session, most recent last. Used to interleave. */
  history: string[];
  /** The gate currently in progress, if any. */
  gate: { objectiveId: string; index: number } | null;
}

/**
 * Choose the next thing to do. Deterministic apart from the seed, so it can be
 * reasoned about and argued with.
 *
 * Order of preference:
 *   1. Finish a gate that is already in progress.
 *   2. Start a gate for anything that is ready.
 *   3. A retention check that is due.
 *   4. Remediation on the misconception that keeps firing.
 *   5. The current objective on the pace.
 */
export function nextStep(ctx: PlanContext): Step | null {
  const rng = new RNG(newSeed());

  // 1 and 2: gates
  if (ctx.gate) {
    const tpl = pickGateTemplate(ctx.gate.objectiveId, ctx.gate.index, rng);
    if (tpl) {
      return {
        objectiveId: ctx.gate.objectiveId,
        templateId: tpl,
        seed: newSeed(),
        mode: 'gate',
        gateIndex: ctx.gate.index,
      };
    }
  }

  const readyForGate = Object.values(ctx.mastery).find((m) => gateReady(m));
  if (readyForGate) {
    const tpl = pickGateTemplate(readyForGate.objective_id, 1, rng);
    if (tpl) {
      return {
        objectiveId: readyForGate.objective_id,
        templateId: tpl,
        seed: newSeed(),
        mode: 'gate',
        gateIndex: 1,
      };
    }
  }

  // 3: retention, but never three of the same objective in a row
  const due = dueReviews(ctx.reviews).filter((id) => !justDid(ctx.history, id));
  if (due.length && ctx.history.length % 3 !== 2) {
    const id = due[0];
    const tpl = pickTemplate(id, 3, rng);
    if (tpl) return { objectiveId: id, templateId: tpl.id, seed: newSeed(), mode: 'retention' };
  }

  // 4: the misconception that keeps firing
  const nagging = topMisconception(ctx.mastery);
  if (nagging && ctx.history.length > 0 && ctx.history.length % 5 === 4) {
    const tpl = pickTemplate(nagging, 2, rng);
    if (tpl) return { objectiveId: nagging, templateId: tpl.id, seed: newSeed(), mode: 'solo' };
  }

  // 5: the current objective
  const open = availableObjectives(ctx.mastery, ctx.week).filter((o) => !justDid(ctx.history, o.id));
  const target = open[0] ?? availableObjectives(ctx.mastery, ctx.week)[0];
  if (!target) {
    // Everything on the pace is secure or parked. Prefer a review that is due,
    // then the weakest secure objective, and only then give up. Ending a session
    // at item three because the queue emptied is a worse outcome than a review
    // arriving slightly early.
    const anyDue = dueReviews(ctx.reviews)[0];
    if (anyDue) {
      const tpl = pickTemplate(anyDue, 3, rng);
      if (tpl) return { objectiveId: anyDue, templateId: tpl.id, seed: newSeed(), mode: 'retention' };
    }
    const weakest = Object.values(ctx.mastery)
      .filter((m) => !m.halted && TEMPLATES_BY_OBJECTIVE[m.objective_id]?.length)
      .sort((a, b) => a.p_known - b.p_known)[0];
    if (weakest) {
      const tpl = pickTemplate(weakest.objective_id, 3, rng);
      if (tpl)
        return {
          objectiveId: weakest.objective_id,
          templateId: tpl.id,
          seed: newSeed(),
          mode: 'retention',
        };
    }
    return null;
  }

  const m = ctx.mastery[target.id];
  const rung = m?.rung ?? 0;
  const difficulty = rung >= 2 ? 4 : rung === 1 ? 3 : 2;
  const tpl = pickTemplate(target.id, difficulty, rng);
  if (!tpl) return null;
  return { objectiveId: target.id, templateId: tpl.id, seed: newSeed(), mode: modeForRung(rung) };
}

function justDid(history: string[], id: string): boolean {
  const last2 = history.slice(-2);
  return last2.length === 2 && last2.every((h) => h === id);
}

/** Gate items lean harder and prefer transfer, and item 6 is always a typed answer if one exists. */
function pickGateTemplate(objectiveId: string, index: number, rng: RNG): string | null {
  const pool = TEMPLATES_BY_OBJECTIVE[objectiveId];
  if (!pool?.length) return null;
  if (index >= GATE_LENGTH) {
    // The construction item: no options to eliminate between.
    const typed = pool.filter((t) => t.id.indexOf('choose') === -1);
    const constructed = typed.length ? typed : pool;
    return rng.pick(constructed).id;
  }
  const stretch = pool.filter((t) => t.transfer >= 1);
  const use = index >= 4 && stretch.length ? stretch : pool;
  return rng.pick(use).id;
}

export function topMisconception(mastery: Record<string, MasteryRow>): string | null {
  let best: { objectiveId: string; n: number } | null = null;
  for (const m of Object.values(mastery)) {
    for (const n of Object.values(m.misconceptions ?? {})) {
      if (n >= 2 && (!best || n > best.n)) best = { objectiveId: m.objective_id, n };
    }
  }
  return best?.objectiveId ?? null;
}

/** How many of the objectives on this week's pace are secure. Shown to the grown-up, never to her. */
export function paceSummary(mastery: Record<string, MasteryRow>, week: number) {
  const onPace = OBJECTIVES.filter((o) => o.week <= week);
  const secure = onPace.filter((o) => isSecure(mastery[o.id]));
  return { total: onPace.length, secure: secure.length };
}
