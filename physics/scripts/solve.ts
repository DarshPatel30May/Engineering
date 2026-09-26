/** Command-line Smart Solver: npm run solve -- "question text". V=1 shows the interpretation. */
import { getConcept } from '../src/engine/concepts';
import { displayValue, resolveSigFigs } from '../src/engine/format';
import { interpret } from '../src/engine/interpreter/interpret';
import { solveInterpretation } from '../src/engine/interpreter/solve';

const text = process.argv.slice(2).join(' ');
const it = interpret(text);
if (process.env.V) {
  console.log('topics:', it.topics.join(', '), '| type:', it.problemType, '| targets:', it.targets.join(', '));
  for (const q of it.quantities) console.log(`  ${q.numText} ${q.unit} → ${q.concept} (${q.confidence}) [${q.candidates.slice(0, 3).map((c) => `${c.concept}:${c.score.toFixed(2)}`).join(' ')}]${q.ignored ? ' IGNORED' : ''}`);
  for (const i of it.implied) console.log(`  implied ${i.concept} = ${i.display} (${i.source})`);
  if (it.directions.length) console.log('  directions:', JSON.stringify(it.directions));
}
const sol = solveInterpretation(it);
const sf = resolveSigFigs('auto', sol.inputSigFigs);
const strip = (s: string) => s.replace(/\\text\{([^}]*)\}/g, '$1').replace(/\\(left|right|quad|,|;|!)/g, ' ').replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)').replace(/\\times/g, '×').replace(/\\[a-zA-Z]+/g, (m) => m.slice(1)).replace(/[{}]/g, '');
for (const s of sol.steps) console.log(`  • ${s.title}: ${strip(s.resultLatex)}`);
for (const f of sol.finals) console.log(`ANSWER ${f.name}: ${isFinite(f.valueSI) ? displayValue(f.valueSI, f.quantity, sf, f.unit).text : ''}${f.direction ? ` [${f.direction}]` : ''}`);
for (const i of sol.issues) console.log(`  ${i.level.toUpperCase()}: ${i.message}`);
for (const d of sol.directions) console.log(`  DIR ${d.title}: ${d.lines.join(' ')}`);
if (!sol.finals.length) console.log('NO ANSWER', sol.ok, getConcept('F') ? '' : '');
