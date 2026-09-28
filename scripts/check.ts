/** Regression harness: lines "expected | symbol(optional) | question". Prints PASS/FAIL. */
import { readFileSync } from 'node:fs';
import { interpret } from '../src/engine/interpreter/interpret';
import { solveInterpretation } from '../src/engine/interpreter/solve';
const lines = readFileSync(process.argv[2], 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
let pass = 0;
for (const line of lines) {
  const [exp, sym, ...rest] = line.split('|').map((x) => x.trim());
  const q = rest.join('|');
  const expected = Function(`return (${exp})`)() as number;
  const i = interpret(q);
  const s = solveInterpretation(i);
  const f = sym ? s.finals.find((x) => x.symbolLatex === sym) : s.finals[0];
  const ok = !!f && Math.abs(f.valueSI - expected) <= Math.abs(expected) * 2e-3 + 1e-12;
  if (ok) pass++;
  else {
    console.log(`FAIL | exp ${expected} got ${f?.valueSI} | ${q}`);
    console.log(`     type ${i.problemType} targets ${i.targets} | ${i.quantities.map((x) => `${x.numText}${x.unit}->${x.concept}`).join('  ')}`);
    console.log(`     steps ${s.steps.map((x) => x.title.replace(/Step \d+ — /, '')).join(' | ')}`);
    s.issues.forEach((x) => console.log('     !', x.message.slice(0, 180)));
  }
}
console.log(`${pass}/${lines.length} passed`);
