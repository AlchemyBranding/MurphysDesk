/** Print sample questions so a human can work them by hand. npm exec tsx scripts/sample.ts [n] */
import { TEMPLATES, generate } from '../src/content';

const n = parseInt(process.argv[2] ?? '2', 10);
for (const tpl of TEMPLATES) {
  for (let i = 0; i < n; i++) {
    const seed = 1000 + i * 37;
    const item = generate(tpl.id, seed)!;
    console.log(`\n--- ${tpl.id}  d${tpl.difficulty} t${tpl.transfer}  seed ${seed}`);
    console.log(item.stem.replace(/\n/g, ' | '));
    if (item.note) console.log(`   note: ${item.note}`);
    if (item.speak) console.log(`   spoken: ${item.speak}`);
    if (item.options) console.log(`   options: ${item.options.map((o) => (o.correct ? `[${o.label}]` : `${o.label}(${o.misconceptionId})`)).join('  ')}`);
    console.log(`   ANSWER: ${item.canonical}`);
    console.log(`   working: ${item.working.map((w) => w.say).join(' / ')}`);
  }
}
