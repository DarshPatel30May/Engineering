import { interpret } from '../src/engine/interpreter/interpret';
import { solveInterpretation } from '../src/engine/interpreter/solve';
const qs = process.argv.slice(2);
for (const q of qs) {
  const i = interpret(q);
  const s = solveInterpretation(i);
  console.log('\n==', q);
  console.log('type', i.problemType, 'modules', i.modules, 'targets', i.targets, 'flags', Object.entries(i.flags).filter(([, v]) => v).map(([k]) => k));
  for (const x of i.quantities) console.log('  ', x.numText, x.unit, '->', x.concept, x.confidence, x.candidates.slice(0, 3).map((c) => `${c.concept}:${c.score.toFixed(2)}`).join(' '));
  console.log('steps', s.steps.map((st) => st.title));
  console.log('finals', s.finals.map((f) => `${f.symbolLatex}=${f.valueSI}`));
  console.log('issues', s.issues.map((x) => x.message));
}
