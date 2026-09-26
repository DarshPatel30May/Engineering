import { describe, expect, it } from 'vitest';
import { FORMULAS, getFormula } from '../src/engine/formulas';
import { IDENTITIES } from '../src/engine/chain';
import { checkDimensions } from '../src/engine/dimcheck';
import { getConcept } from '../src/engine/concepts';
import { getQuantity } from '../src/engine/quantities';
import { solveFormula, renderTemplate } from '../src/engine/solver';

/** Fill the first variable from the example so the example set is fully consistent. */
function consistentSet(id: string): Record<string, number> {
  const f = getFormula(id);
  const vals: Record<string, number> = { ...f.example };
  for (const vd of f.vars) if (vals[vd.key] === undefined && vd.constant !== undefined && vd.key !== f.vars[0].key) vals[vd.key] = vd.constant;
  vals[f.vars[0].key] = f.solve[f.vars[0].key].fn(vals);
  return vals;
}

describe('formula registry integrity', () => {
  it('has unique ids', () => {
    const ids = FORMULAS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  for (const f of [...FORMULAS, ...IDENTITIES]) {
    it(`${f.id}: every variable is solvable, known concept & quantity, example complete`, () => {
      for (const vd of f.vars) {
        expect(f.solve[vd.key], `${f.id} missing solver for ${vd.key}`).toBeDefined();
        expect(getConcept(vd.concept), `${f.id}.${vd.key} concept ${vd.concept}`).toBeDefined();
        expect(() => getQuantity(vd.quantity)).not.toThrow();
        // concept quantity dimension must match variable dimension
        expect(getQuantity(getConcept(vd.concept)!.quantity).dim).toEqual(getQuantity(vd.quantity).dim);
      }
      for (const vd of f.vars.slice(1)) {
        if (vd.constant === undefined) expect(f.example[vd.key], `${f.id} example missing ${vd.key}`).toBeDefined();
      }
      // every placeholder in every template refers to a real variable and never the unknown itself
      for (const [key, s] of Object.entries(f.solve)) {
        const refs = [...s.expr.matchAll(/#([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]);
        for (const r of refs) {
          expect(f.vars.some((vd) => vd.key === r), `${f.id}.${key} references ${r}`).toBe(true);
          expect(r).not.toBe(key);
        }
      }
    });
  }
});

describe('every rearrangement is reversible and dimensionally consistent', () => {
  for (const f of FORMULAS) {
    const vals = consistentSet(f.id);
    for (const vd of f.vars) {
      it(`${f.id}: solve for ${vd.key}`, () => {
        const others = { ...vals };
        const expected = others[vd.key];
        delete others[vd.key];
        const got = f.solve[vd.key].fn(others);
        expect(Number.isFinite(got), `${f.id}.${vd.key} = ${got}`).toBe(true);
        expect(Math.abs(got - expected)).toBeLessThanOrEqual(Math.abs(expected) * 1e-9 + 1e-12);
        const dc = checkDimensions(f, vd.key, vals);
        if (dc.ok !== null) expect(dc.ok, `${f.id}.${vd.key} dims ${dc.measured} vs ${dc.expected}`).toBe(true);
        // templates render in all modes without leftover placeholders
        for (const mode of ['symbol', 'value', 'unit'] as const) {
          const t = renderTemplate(f.solve[vd.key].expr, f, mode, vals);
          expect(t).not.toMatch(/#[A-Za-z]/);
        }
      });
    }
  }
});

const approx = (a: number, b: number, rel = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.abs(b) * rel);

describe('known HSC cases through the full solver (with unit conversion)', () => {
  it('F = 8 kN, A = 200 mm² → σ = 40 MPa', () => {
    const s = solveFormula(getFormula('stress'), 'sigma', { F: { value: 8, unit: 'kN' }, A: { value: 200, unit: 'mm²' } });
    expect(s.ok).toBe(true);
    approx(s.finals[0].valueSI, 40e6);
  });
  it('σ = 40 MPa, A = 200 mm² → F = 8 kN', () => {
    const s = solveFormula(getFormula('stress'), 'F', { sigma: { value: 40, unit: 'MPa' }, A: { value: 200, unit: 'mm²' } });
    approx(s.finals[0].valueSI, 8000);
  });
  it('F = 8 kN, σ = 40 N/mm² → A = 200 mm²', () => {
    const s = solveFormula(getFormula('stress'), 'A', { F: { value: 8, unit: 'kN' }, sigma: { value: 40, unit: 'N/mm²' } });
    approx(s.finals[0].valueSI, 200e-6);
  });
  it('σ = 200 MPa, ε = 0.001 → E = 200 GPa (and reverse forms)', () => {
    const e = solveFormula(getFormula('youngs'), 'E', { sigma: { value: 200, unit: 'MPa' }, eps: { value: 0.001, unit: '' } });
    approx(e.finals[0].valueSI, 200e9);
    const sg = solveFormula(getFormula('youngs'), 'sigma', { E: { value: 200, unit: 'GPa' }, eps: { value: 0.001, unit: '' } });
    approx(sg.finals[0].valueSI, 200e6);
    const ep = solveFormula(getFormula('youngs'), 'eps', { E: { value: 200, unit: 'GPa' }, sigma: { value: 200, unit: 'MPa' } });
    approx(ep.finals[0].valueSI, 0.001);
  });
  it('bending stress with N·mm and mm⁴ inputs', () => {
    // M = 12 kN·m, y = 100 mm, I = 80×10⁶ mm⁴ → σ = 15 MPa
    const s = solveFormula(getFormula('bending'), 'sb', { M: { value: 12, unit: 'kN·m' }, y: { value: 100, unit: 'mm' }, I: { value: 80e6, unit: 'mm⁴' } });
    approx(s.finals[0].valueSI, 15e6);
  });
  it('Ohm and power', () => {
    approx(solveFormula(getFormula('ohm'), 'I', { V: { value: 12, unit: 'V' }, R: { value: 4.7, unit: 'kΩ' } }).finals[0].valueSI, 12 / 4700);
    approx(solveFormula(getFormula('powerI2R'), 'P', { I: { value: 250, unit: 'mA' }, R: { value: 100, unit: 'Ω' } }).finals[0].valueSI, 6.25);
    approx(solveFormula(getFormula('powerV2R'), 'R', { V: { value: 240, unit: 'V' }, P: { value: 2, unit: 'kW' } }).finals[0].valueSI, 28.8);
  });
  it('mechanical advantage / efficiency', () => {
    approx(solveFormula(getFormula('machineEff'), 'eta', { MA: { value: 3.2, unit: '' }, VR: { value: 4, unit: '' } }).finals[0].valueSI, 0.8);
  });
  it('rotational power with rpm', () => {
    // T = 250 N·m at 3000 rpm → P = 78.54 kW
    approx(solveFormula(getFormula('rotPower'), 'P', { T: { value: 250, unit: 'N·m' }, omega: { value: 3000, unit: 'rpm' } }).finals[0].valueSI, 250 * 100 * Math.PI);
  });
  it('wave equation: 100 MHz → λ = 3 m', () => {
    approx(solveFormula(getFormula('wave'), 'lambda', { f: { value: 100, unit: 'MHz' } }).finals[0].valueSI, 3);
  });
  it('critical angle n1 = 1.5, n2 = 1.46', () => {
    approx(solveFormula(getFormula('criticalAngle'), 'thetaC', { n1: { value: 1.5, unit: '' }, n2: { value: 1.46, unit: '' } }).finals[0].valueSI, Math.asin(1.46 / 1.5));
  });
});

describe('error detection', () => {
  it('missing data', () => {
    const s = solveFormula(getFormula('stress'), 'sigma', { F: { value: 8, unit: 'kN' } });
    expect(s.ok).toBe(false);
    expect(s.issues.some((i) => /Missing data/.test(i.message))).toBe(true);
  });
  it('incompatible units (area given in kN)', () => {
    const s = solveFormula(getFormula('stress'), 'sigma', { F: { value: 8, unit: 'kN' }, A: { value: 200, unit: 'kN' } });
    expect(s.ok).toBe(false);
    expect(s.issues.some((i) => /Incompatible unit/.test(i.message))).toBe(true);
  });
  it('impossible (negative) area', () => {
    const s = solveFormula(getFormula('stress'), 'sigma', { F: { value: 8, unit: 'kN' }, A: { value: -200, unit: 'mm²' } });
    expect(s.ok).toBe(false);
    expect(s.issues.some((i) => /area must be positive/.test(i.message))).toBe(true);
  });
  it('divide by zero', () => {
    const s = solveFormula(getFormula('youngs'), 'E', { sigma: { value: 200, unit: 'MPa' }, eps: { value: 0, unit: '' } });
    expect(s.ok).toBe(false);
  });
  it('invalid modulus', () => {
    const s = solveFormula(getFormula('youngs'), 'eps', { sigma: { value: 200, unit: 'MPa' }, E: { value: -5, unit: 'GPa' } });
    expect(s.ok).toBe(false);
    expect(s.issues.some((i) => /modulus/i.test(i.message))).toBe(true);
  });
  it('efficiency above 100%', () => {
    const s = solveFormula(getFormula('machineEff'), 'eta', { MA: { value: 5, unit: '' }, VR: { value: 4, unit: '' } });
    expect(s.ok).toBe(false);
    expect(s.issues.some((i) => /100%/.test(i.message))).toBe(true);
  });
  it('no total internal reflection when n2 > n1', () => {
    const s = solveFormula(getFormula('criticalAngle'), 'thetaC', { n1: { value: 1.4, unit: '' }, n2: { value: 1.5, unit: '' } });
    expect(s.ok).toBe(false);
  });
});

import { MODULE_CATALOG } from '../src/data/modules';
describe('catalogue', () => {
  it('every formula appears in at least one module category and every catalogue id exists', () => {
    const listed = new Set<string>();
    for (const cats of Object.values(MODULE_CATALOG)) for (const c of cats) for (const it of c.items) if (it.kind === 'formula') {
      expect(() => getFormula(it.id)).not.toThrow();
      listed.add(it.id);
    }
    const missing = FORMULAS.filter((f) => !listed.has(f.id)).map((f) => f.id);
    expect(missing).toEqual([]);
  });
});
