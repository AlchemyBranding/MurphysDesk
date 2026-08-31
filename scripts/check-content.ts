/**
 * Property test over every template.
 *
 * The rule this enforces: nothing ships that has not been generated a thousand
 * times and checked by machine, and then five instances of each worked by hand
 * on paper. This script is the machine half. It cannot do the paper half.
 *
 *   npm run check-content
 */
import { TEMPLATES, generate } from '../src/content';
import { OBJ_BY_ID, OBJECTIVES } from '../src/content/objectives';

const RUNS = 400;

let failures = 0;
const problems: string[] = [];
// One line per distinct problem, with a count and the first seed that showed it.
const seen = new Map<string, { n: number; seed: number }>();

function fail(templateId: string, seed: number, msg: string) {
  failures++;
  const key = `${templateId} :: ${msg}`;
  const hit = seen.get(key);
  if (hit) hit.n++;
  else seen.set(key, { n: 1, seed });
}

// ---------------------------------------------------------------- objectives

const objIds = new Set(OBJECTIVES.map((o) => o.id));
for (const o of OBJECTIVES) {
  for (const p of o.prereqs) {
    if (!objIds.has(p)) problems.push(`  objective ${o.id}: unknown prerequisite ${p}`), failures++;
  }
  if (!o.canDo.toLowerCase().startsWith('i can')) {
    problems.push(`  objective ${o.id}: canDo should be first person, "I can ..."`), failures++;
  }
}
for (const id of objIds) {
  if (!TEMPLATES.some((t) => t.objectiveId === id)) {
    problems.push(`  objective ${id}: no templates`), failures++;
  }
}

// cycle check on the prerequisite graph
{
  const state = new Map<string, number>();
  const walk = (id: string): boolean => {
    const s = state.get(id) ?? 0;
    if (s === 1) return false;
    if (s === 2) return true;
    state.set(id, 1);
    for (const p of OBJ_BY_ID[id]?.prereqs ?? []) if (!walk(p)) return false;
    state.set(id, 2);
    return true;
  };
  for (const id of objIds) {
    if (!walk(id)) {
      problems.push(`  prerequisite graph has a cycle at ${id}`);
      failures++;
      break;
    }
  }
}

// ---------------------------------------------------------------- templates

for (const tpl of TEMPLATES) {
  if (!OBJ_BY_ID[tpl.objectiveId]) {
    fail(tpl.id, 0, `unknown objective ${tpl.objectiveId}`);
    continue;
  }
  const known = OBJ_BY_ID[tpl.objectiveId].misconceptions;

  for (let seed = 1; seed <= RUNS; seed++) {
    const item = generate(tpl.id, seed);
    if (!item) {
      fail(tpl.id, seed, 'generate threw or returned null');
      continue;
    }

    // 1. Nothing broken leaked into the text.
    const text = item.stem + (item.note ?? '') + item.working.map((w) => w.say).join(' ');
    if (/undefined|NaN|Infinity|\[object/.test(text)) {
      fail(tpl.id, seed, 'stem or working contains a broken value');
    }
    if (!item.stem.trim()) fail(tpl.id, seed, 'empty stem');
    if (item.working.length === 0) fail(tpl.id, seed, 'no working shown');
    if (!item.canonical.trim()) fail(tpl.id, seed, 'no canonical answer');

    // 2. THE IMPORTANT ONE. The app's own answer must mark as correct.
    const round = item.mark(item.canonical);
    if (!round.correct) {
      fail(tpl.id, seed, `canonical answer "${item.canonical}" marks as WRONG`);
    }

    // 3. Multiple choice hygiene, which is Barton's rule 4 as a build-time assertion.
    if (item.input === 'choice') {
      const opts = item.options ?? [];
      const correct = opts.filter((o) => o.correct);
      if (correct.length !== 1) fail(tpl.id, seed, `${correct.length} correct options, expected 1`);
      if (opts.length < 2) fail(tpl.id, seed, 'fewer than two options');
      const labels = opts.map((o) => o.label.trim());
      if (new Set(labels).size !== labels.length) fail(tpl.id, seed, 'duplicate option labels');
      if (labels.some((l) => !l)) fail(tpl.id, seed, 'empty option label');
      for (const o of opts) {
        if (!o.correct && !o.misconceptionId) {
          fail(tpl.id, seed, `distractor "${o.label}" carries no misconception`);
        }
        if (!o.correct && o.misconceptionId && !(o.misconceptionId in known)) {
          fail(tpl.id, seed, `misconception "${o.misconceptionId}" is not declared on the objective`);
        }
        // A distractor must actually mark as wrong.
        if (!o.correct && item.mark(o.label).correct) {
          fail(tpl.id, seed, `distractor "${o.label}" marks as CORRECT`);
        }
      }
    }

    // 4. Sanity on the answer itself.
    if (item.input !== 'choice' && item.mark('').correct) {
      fail(tpl.id, seed, 'empty answer marks as correct');
    }
    if (item.input === 'number' || item.input === 'fraction') {
      if (item.mark('banana').correct) fail(tpl.id, seed, 'nonsense marks as correct');
    }
  }
}

// ---------------------------------------------------------------- report

const total = TEMPLATES.length * RUNS;
console.log(`\nChecked ${TEMPLATES.length} templates over ${RUNS} seeds each (${total} questions).`);
console.log(`${OBJECTIVES.length} objectives.\n`);

if (failures === 0) {
  console.log('All clear.\n');
  console.log('Machine checks passing is not the same as the maths being right.');
  console.log('Work five instances of every new template by hand before she sees it.\n');
} else {
  const lines = Array.from(seen.entries())
    .sort((a, b) => b[1].n - a[1].n)
    .map(([k, v]) => `  [${v.n}× from seed ${v.seed}] ${k}`);
  console.log(`${failures} failures across ${seen.size + problems.length} distinct problems:\n`);
  console.log([...problems, ...lines].join('\n'));
  console.log('');
  process.exit(1);
}
