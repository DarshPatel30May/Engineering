import { interpret } from '../src/engine/interpreter/interpret';
import { solveInterpretation } from '../src/engine/interpreter/solve';
import { readFileSync } from 'node:fs';
const qs = readFileSync(process.argv[2], 'utf8').split('\n').filter((l) => l.trim());
for (const q of qs) {
  const i = interpret(q);
  const s = solveInterpretation(i);
  const fin = s.finals.map((f) => `${f.symbolLatex}=${Number(f.valueSI.toPrecision(5))}`).join(', ');
  console.log(`${s.ok ? 'OK ' : 'ERR'} | ${fin || '-'} | ${q.slice(0, 90)}`);
  if (!s.ok || process.env.V) {
    console.log('     type', i.problemType, 'targets', i.targets, 'q', i.quantities.map((x) => `${x.numText}${x.unit}->${x.concept}`).join(' '));
    console.log('     steps', s.steps.map((x) => x.title.replace(/Step \d+ — /, '')).join(' | '));
    s.issues.forEach((x) => console.log('     !', x.message.slice(0, 160)));
  }
}
