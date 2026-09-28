/**
 * Question-bank regression tests. Each fixture line: "expected | final symbol (optional) | question".
 * Expected values are independent hand calculations in SI units.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { interpret } from '../src/engine/interpreter/interpret';
import { solveInterpretation } from '../src/engine/interpreter/solve';

const dir = new URL('.', import.meta.url);
for (const file of readdirSync(dir).filter((f) => /^fixtures-.*\.txt$/.test(f))) {
  describe(file, () => {
    const lines = readFileSync(new URL(file, dir), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    for (const line of lines) {
      const [exp, sym, ...rest] = line.split('|').map((x) => x.trim());
      const q = rest.join('|');
      it(q.slice(0, 90), () => {
        const expected = Function(`return (${exp})`)() as number;
        const s = solveInterpretation(interpret(q));
        const f = sym ? s.finals.find((x) => x.symbolLatex === sym) : s.finals[0];
        expect(f, `no answer; issues: ${s.issues.map((i) => i.message).join(' / ')}`).toBeDefined();
        expect(Math.abs(f!.valueSI - expected)).toBeLessThanOrEqual(Math.abs(expected) * 2e-3 + 1e-12);
      });
    }
  });
}
