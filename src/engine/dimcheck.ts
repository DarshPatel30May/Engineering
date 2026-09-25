/**
 * Numerical dimensional analysis.
 *
 * A dimensionally consistent relation y = f(x₁…xₙ) must scale correctly when the base
 * units change. For each SI base dimension we multiply every input by 2^(its exponent
 * in that dimension) and measure how the output scales. The measured exponents must
 * equal the output's expected dimension. This validates every rearrangement without
 * needing a symbolic algebra system.
 */
import type { FormulaDef } from './formulas/types';
import { getQuantity } from './quantities';
import { Dim, dimEq } from './units';

export interface DimCheckResult {
  ok: boolean | null; // null = could not determine (e.g. zero result)
  expected: Dim;
  measured: Dim | null;
}

export function checkDimensions(f: FormulaDef, unknown: string, valuesSI: Record<string, number>): DimCheckResult {
  const target = f.vars.find((v) => v.key === unknown)!;
  const expected = getQuantity(target.quantity).dim;
  const solver = f.solve[unknown];
  const y0 = solver.fn(valuesSI);
  if (!isFinite(y0) || Math.abs(y0) < 1e-300) return { ok: null, expected, measured: null };
  const measured: number[] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const scaled: Record<string, number> = { ...valuesSI };
    for (const vd of f.vars) {
      if (vd.key === unknown) continue;
      const d = getQuantity(vd.quantity).dim;
      if (scaled[vd.key] !== undefined) scaled[vd.key] = scaled[vd.key] * Math.pow(2, d[i]);
    }
    const y1 = solver.fn(scaled);
    if (!isFinite(y1) || y1 === 0) return { ok: null, expected, measured: null };
    measured[i] = Math.log2(Math.abs(y1 / y0));
  }
  const m = measured.map((x) => Math.round(x * 1e6) / 1e6) as unknown as Dim;
  return { ok: dimEq(m, expected), expected, measured: m };
}
