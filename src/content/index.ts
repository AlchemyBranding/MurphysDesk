import type { Template, GeneratedItem } from '@/lib/engine';
import { RNG } from '@/lib/rng';
import { MATHS_TEMPLATES } from './maths';
import { ENGLISH_TEMPLATES } from './english';
import { OBJ_BY_ID } from './objectives';

export * from './objectives';

export const TEMPLATES: Template[] = [...MATHS_TEMPLATES, ...ENGLISH_TEMPLATES];

export const TEMPLATES_BY_ID: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t])
);

export const TEMPLATES_BY_OBJECTIVE: Record<string, Template[]> = TEMPLATES.reduce(
  (acc, t) => {
    (acc[t.objectiveId] = acc[t.objectiveId] ?? []).push(t);
    return acc;
  },
  {} as Record<string, Template[]>
);

/** Build the actual question. Same (templateId, seed) always gives the same question. */
export function generate(templateId: string, seed: number): GeneratedItem | null {
  const tpl = TEMPLATES_BY_ID[templateId];
  if (!tpl) return null;
  try {
    const item = tpl.generate(new RNG(seed));
    return { ...item, templateId, objectiveId: tpl.objectiveId, seed };
  } catch {
    return null;
  }
}

/** Pick a template for an objective, aiming at a difficulty. */
export function pickTemplate(objectiveId: string, targetDifficulty: number, rng: RNG): Template | null {
  const pool = TEMPLATES_BY_OBJECTIVE[objectiveId];
  if (!pool || pool.length === 0) return null;
  const sorted = pool
    .slice()
    .sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty));
  const best = sorted.filter((t) => Math.abs(t.difficulty - sorted[0].difficulty) < 0.5);
  return rng.pick(best);
}

export function objectiveOf(templateId: string) {
  const t = TEMPLATES_BY_ID[templateId];
  return t ? OBJ_BY_ID[t.objectiveId] : undefined;
}
