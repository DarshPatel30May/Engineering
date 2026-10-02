/** Questions pasted with LaTeX / Markdown maths (e.g. copied from ChatGPT or a worksheet). */
import { describe, expect, it } from 'vitest';
import { interpret } from '../src/engine/interpreter/interpret';
import { solveInterpretation } from '../src/engine/interpreter/solve';
import { normaliseText } from '../src/engine/interpreter/extract';

const val = (q: string, sym?: string) => {
  const s = solveInterpretation(interpret(q));
  const f = sym ? s.finals.find((x) => x.symbolLatex === sym) : s.finals[0];
  if (!f) throw new Error(s.issues.map((i) => i.message).join(' / '));
  return f.valueSI;
};
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.abs(b) * 2e-3);

const WING = String.raw`A light aircraft is in steady, level flight. Its total weight is 18 kN and the two wings are assumed to provide equal lift.
For one wing, the resultant lift force may be considered to act 2.4 m from the wing root.
The main wing spar at the root has:
\[
I=8.0\times10^{-6}\text{ m}^4
\]
and the maximum distance from its neutral axis to its outer surface is
\[
y=75\text{ mm}
\]
Use:
\[
\sigma=\frac{My}{I}
\]`;

describe('LaTeX input', () => {
  it('converts display maths, \\times10^{}, \\text{} units, \\frac and Greek letters', () => {
    const n = normaliseText(String.raw`\[ I=8.0\times10^{-6}\text{ m}^4 \] \( \sigma = \frac{My}{I} \) $F = 8\,\text{kN}$ $\theta = 30^\circ$ 80\%`);
    expect(n).toContain('8.0e-6');
    expect(n).toContain('m^4');
    expect(n).toContain('σ = (My)/(I)');
    expect(n).toContain('8 kN');
    expect(n).toContain('30°');
    expect(n).toContain('80%');
  });
  it('pasted wing question with "Use: σ = My/I" and no explicit question', () => {
    near(val(WING), (9000 * 2.4 * 0.075) / 8e-6);
  });
  it('same question with explicit parts', () => {
    near(val(WING + '\n(a) Calculate the lift on one wing.'), 9000);
    near(val(WING + '\n(b) Calculate the bending moment at the wing root.'), 21600);
  });
  it('inline $…$ maths', () => {
    near(val(String.raw`A bar carries a load of $F = 8\,\text{kN}$ and has a cross-sectional area $A = 200\ \text{mm}^2$. Calculate the stress.`), 40e6);
  });
  it('\\( … \\) maths with \\varepsilon and \\mathrm units', () => {
    near(val(String.raw`Given \(\sigma = 200\,\mathrm{MPa}\) and \(\varepsilon = 0.001\), determine Young's modulus.`), 200e9);
  });
  it('degrees and percent in LaTeX', () => {
    near(val(String.raw`A crate on a ramp just begins to slide when the ramp is at \(22^\circ\). Calculate the coefficient of friction.`), Math.tan((22 * Math.PI) / 180));
    near(val(String.raw`A motor has an input of \(2\,\text{kW}\) and an efficiency of \(85\%\). Calculate the output power.`), 1700);
  });
  it('plain text without LaTeX is unchanged', () => {
    expect(normaliseText('Cost is $5')).toContain('$5');
  });
});
