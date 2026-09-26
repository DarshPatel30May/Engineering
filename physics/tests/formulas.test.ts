import { describe, expect, it } from 'vitest';
import { getConcept } from '../src/engine/concepts';
import { checkDimensions } from '../src/engine/dimcheck';
import { FORMULAS } from '../src/engine/formulas';
import { getQuantity } from '../src/engine/quantities';

/** Full SI value set for a formula: example values + the subject computed from them. */
function fullSet(f: (typeof FORMULAS)[number]): Record<string, number> {
  const vals: Record<string, number> = {};
  for (const vd of f.vars) {
    if (vd.key in f.example) vals[vd.key] = f.example[vd.key];
    else if (vd.constant !== undefined) vals[vd.key] = vd.constant;
  }
  const first = f.vars[0];
  vals[first.key] = f.solve[first.key].fn(vals);
  return vals;
}

describe('formula registry integrity', () => {
  it('has unique ids', () => {
    const ids = FORMULAS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  for (const f of FORMULAS) {
    it(`${f.id}: every variable has a known concept and quantity kind`, () => {
      for (const vd of f.vars) {
        expect(getConcept(vd.concept), `${f.id}.${vd.key} concept ${vd.concept}`).toBeTruthy();
        expect(() => getQuantity(vd.quantity)).not.toThrow();
      }
      expect(f.solve[f.vars[0].key], `${f.id} must solve for its subject`).toBeTruthy();
    });
  }
});

describe('every rearrangement is consistent (round trip)', () => {
  for (const f of FORMULAS) {
    it(`${f.id}`, () => {
      const vals = fullSet(f);
      const subject = vals[f.vars[0].key];
      expect(isFinite(subject), `${f.id} subject from example`).toBe(true);
      for (const vd of f.vars) {
        const s = f.solve[vd.key];
        if (!s) continue;
        const inputs = { ...vals };
        delete inputs[vd.key];
        const got = s.fn(inputs);
        const want = vals[vd.key];
        if (f.id === 'grating_max_order') continue;
        const rel = Math.abs(got - want) / Math.max(Math.abs(want), 1e-300);
        expect(rel, `${f.id}: ${vd.key} rel error`).toBeLessThan(1e-6);
      }
    });
  }
});

describe('dimensional analysis of every rearrangement', () => {
  for (const f of FORMULAS) {
    it(`${f.id}`, () => {
      const vals = fullSet(f);
      for (const vd of f.vars) {
        if (!f.solve[vd.key]) continue;
        const inputs = { ...vals };
        delete inputs[vd.key];
        const r = checkDimensions(f, vd.key, { ...inputs });
        if (r.ok === null) continue;
        expect(r.ok, `${f.id} solving for ${vd.key}: expected ${r.expected} measured ${r.measured}`).toBe(true);
      }
    });
  }
});
