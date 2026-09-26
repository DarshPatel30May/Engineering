/**
 * Command-line Smart Solver.
 *   npm run solve -- "A steel rod of diameter 20 mm carries 50 kN. Calculate the stress."
 *   npm run solve -- questions.txt          (one question per line)
 * Set V=1 for interpretation details.
 */
import { existsSync, readFileSync } from 'node:fs';
import { displayValue } from '../src/engine/format';
import { interpret } from '../src/engine/interpreter/interpret';
import { solveInterpretation } from '../src/engine/interpreter/solve';

const args = process.argv.slice(2);
const qs = args.length === 1 && existsSync(args[0]) ? readFileSync(args[0], 'utf8').split('\n').filter((l) => l.trim()) : args;
if (!qs.length) {
  console.log('Usage: npm run solve -- "question text"');
  process.exit(1);
}
for (const q of qs) {
  const i = interpret(q);
  const s = solveInterpretation(i);
  console.log(`\n${s.ok ? '✔' : '✖'} ${q}`);
  if (process.env.V) {
    console.log(`  type: ${i.problemType}  modules: ${i.modules.join(', ')}  find: ${i.targets.join(', ')}`);
    i.quantities.forEach((x) => console.log(`  ${x.numText} ${x.unit} → ${x.concept ?? '?'} (${x.confidence})`));
  }
  s.steps.forEach((st) => console.log(`  · ${st.title}`));
  s.finals.forEach((f) => console.log(`  = ${f.name}: ${displayValue(f.valueSI, f.quantity, 4).text}${f.suffix ? ` (${f.suffix})` : ''}`));
  s.issues.forEach((x) => console.log(`  ${x.level === 'error' ? '!' : '⚠'} ${x.message}`));
}
