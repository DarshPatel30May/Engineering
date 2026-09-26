/**
 * Multi-step chain solver. Given known quantities (by concept) and target concepts, it
 * forward-chains through the formula graph — applying any formula with exactly one
 * unknown — until the targets are found, then prunes to the minimal dependency chain.
 * Every step is computed by the deterministic formula engine and fully documented.
 */
import { getConcept } from './concepts';
import { FORMULAS } from './formulas';
import type { FormulaDef, Issue, ModuleId } from './formulas/types';
import { v } from './formulas/types';
import type { QuantityId } from './quantities';
import { buildStep } from './solver';
import type { Step } from './solution';

export interface Known {
  concept: string;
  valueSI: number;
  source: 'given' | 'constant' | 'derived';
}

export interface ChainStep {
  formula: FormulaDef;
  unknownKey: string;
  concept: string;
  inputs: Record<string, number>; // local key -> SI
  inputConcepts: string[];
  result: number;
  assumedConstants: string[];
}

export interface ChainResult {
  steps: ChainStep[];
  known: Map<string, Known>;
  found: string[];
  missing: string[];
  issues: Issue[];
}

/** Bridging identities between concepts that are the same physical value in typical HSC questions. */
function identity(a: string, b: string, q: QuantityId, why: string, unlessKnown?: string[], contextOnly?: ModuleId[]): FormulaDef {
  const ca = getConcept(a)!;
  const cb = getConcept(b)!;
  return {
    id: `id_${a}_${b}`,
    name: `${ca.name} = ${cb.name.toLowerCase()}`,
    modules: ['civil', 'transport', 'aero', 'telecom'],
    topic: 'Identity',
    equation: `${ca.latex} = ${cb.latex}`,
    vars: [v('A_', ca.latex, ca.name, q, { concept: a }), v('B_', cb.latex, cb.name, q, { concept: b })],
    solve: { A_: { expr: '#B_', fn: ({ B_ }) => B_ }, B_: { expr: '#A_', fn: ({ A_ }) => A_ } },
    aliases: [],
    when: why,
    sheet: 'derived',
    source: 'identity',
    hsc: [],
    example: { B_: 1 },
    priority: -5,
    identity: true,
    unlessKnown,
    contextOnly,
  };
}

export const IDENTITIES: FormulaDef[] = [
  identity('sw', 'sigma', 'stress', 'The working stress is the actual stress in the member under its working load.'),
  identity('sw', 'sigmaB', 'stress', 'The working stress is the maximum bending stress in the member.'),
  identity('F', 'Wt', 'force', 'The applied load is the weight of the mass (W = mg).', ['a', 'u', 'v', 's', 'mu', 'incline', 'Ft', 'Fr']),
  identity('work', 'PE', 'energy', 'Work done lifting the load equals the potential energy gained.'),
  identity('work', 'KE', 'energy', 'Work done (e.g. by the brakes) equals the change in kinetic energy.'),
  identity('load', 'Wt', 'force', 'The load raised is the weight of the mass.', ['a', 'u', 'v', 's', 'mu', 'incline', 'Ft', 'Fr']),
  identity('load', 'F', 'force', 'The load is the output force.', ['a', 'u', 'v', 's', 'mu', 'incline', 'Ft', 'Fr']),
  identity('F', 'Th', 'force', 'The force driving the aircraft is the engine thrust.', undefined, ['aero']),
  identity('wingArea', 'A', 'area', 'The area given is the wing (planform) area.', undefined, ['aero']),
  identity('Fw', 'F', 'force', 'The working load is the applied force.'),
  identity('normal', 'Wt', 'force', 'On a horizontal surface the normal reaction equals the weight.', ['incline']),
  identity('Pin', 'P', 'power', 'The electrical power drawn is the input power.'),
  identity('work', 'energy', 'energy', 'Work done equals energy transferred.'),
  identity('Ein', 'energy', 'energy', 'The energy supplied is the input energy.'),
  identity('Eout', 'work', 'energy', 'The useful work done is the energy output.'),
  identity('depth', 'h', 'length', 'The depth of fluid equals the height given.'),
  identity('A0', 'A', 'area', 'The original area is the cross-sectional area.'),
  identity('Ft', 'F', 'force', 'The tractive force is the applied driving force.'),
  identity('Th', 'Ft', 'force', 'Thrust is the driving force on the aircraft.'),
  identity('Fr', 'Drag', 'force', 'The resistance to motion is the drag.'),
  identity('F2', 'Wt', 'force', 'The output piston supports the weight of the load.'),
  identity('F2', 'load', 'force', 'The output piston force is the load raised.'),
  identity('Ein', 'KE', 'energy', 'The energy available (input) is the kinetic energy of the vehicle.'),
];

export interface ChainOptions {
  modules?: ModuleId[];
  /** formula ids to exclude */
  exclude?: string[];
}

function candidateFormulas(opts: ChainOptions): FormulaDef[] {
  const mods = opts.modules ?? [];
  const list = [...FORMULAS, ...IDENTITIES].filter((f) => {
    if (opts.exclude?.includes(f.id)) return false;
    if (f.contextOnly && !f.contextOnly.some((m) => mods.includes(m))) return false;
    return true;
  });
  const modScore = (f: FormulaDef) => (mods.length && f.modules.some((m) => mods.includes(m)) ? 1 : 0);
  return list.sort((a, b) => (b.priority ?? 0) + modScore(b) * 0.5 - ((a.priority ?? 0) + modScore(a) * 0.5));
}

/**
 * Run the chain solver. Uses a shortest-derivation search (Bellman–Ford style relaxation)
 * so the chain with the fewest, most standard steps is chosen rather than an arbitrary path.
 */
export function solveChain(knownIn: Known[], targets: string[], opts: ChainOptions = {}): ChainResult {
  const given = new Map<string, Known>();
  for (const k of knownIn) given.set(k.concept, k);
  const issues: Issue[] = [];
  const formulas = candidateFormulas(opts);
  const mods = opts.modules ?? [];

  interface Deriv {
    cost: number;
    formula: FormulaDef;
    unknownKey: string;
    inputConcepts: string[];
    value: number;
  }
  const best = new Map<string, Deriv>();
  const valueOf = (c: string): number | undefined => given.get(c)?.valueSI ?? best.get(c)?.value;
  const costOf = (c: string): number => (given.has(c) ? 0 : best.get(c)?.cost ?? Infinity);

  const baseCost = (f: FormulaDef) => {
    let b = f.chainCost ?? (f.identity ? 1.3 : 1 - (f.priority ?? 0) * 0.02);
    if (mods.length && !f.modules.some((m) => mods.includes(m))) b += 0.25;
    return b;
  };

  for (let round = 0; round < 30; round++) {
    let changed = false;
    for (const f of formulas) {
      if (f.unlessKnown?.some((c) => given.has(c))) continue;
      for (const target of f.vars) {
        if (!f.solve[target.key]) continue;
        if (given.has(target.concept)) continue;
        let ok = true;
        let cost = baseCost(f);
        const inputs: Record<string, number> = {};
        const inputConcepts: string[] = [];
        for (const vd of f.vars) {
          if (vd.key === target.key) continue;
          const val = valueOf(vd.concept);
          if (val !== undefined && vd.concept !== target.concept) {
            // no identity-of-identity chains (e.g. weight → force → tractive force → thrust)
            if (f.identity && best.get(vd.concept)?.formula.identity) {
              ok = false;
              break;
            }
            inputs[vd.key] = val;
            cost += costOf(vd.concept);
            inputConcepts.push(vd.concept);
          } else if (vd.constant !== undefined) {
            inputs[vd.key] = vd.constant;
          } else {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        // a constant-default variable cannot be "derived" (e.g. do not compute g)
        if (target.constant !== undefined && given.get(target.concept) === undefined && !targets.includes(target.concept)) continue;
        if (cost >= costOf(target.concept) - 1e-9) continue;
        const value = f.solve[target.key].fn(inputs);
        if (!isFinite(value)) continue;
        if ((target.positive && value <= 0) || (target.nonNegative && value < 0)) continue;
        if (target.min !== undefined && value < target.min - 1e-9) continue;
        if (target.max !== undefined && value > target.max + 1e-9) continue;
        best.set(target.concept, { cost, formula: f, unknownKey: target.key, inputConcepts, value });
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Reconstruct derivation trees (post-order) and recompute values along the chosen path.
  const steps: ChainStep[] = [];
  const known = new Map<string, Known>(given);
  const visiting = new Set<string>();
  const build = (c: string): number | undefined => {
    if (known.has(c)) return known.get(c)!.valueSI;
    const d = best.get(c);
    if (!d || visiting.has(c)) return undefined;
    visiting.add(c);
    const inputs: Record<string, number> = {};
    const assumed: string[] = [];
    const inputConcepts: string[] = [];
    for (const vd of d.formula.vars) {
      if (vd.key === d.unknownKey) continue;
      if (d.inputConcepts.includes(vd.concept)) {
        const val = build(vd.concept);
        if (val === undefined) {
          visiting.delete(c);
          return undefined;
        }
        inputs[vd.key] = val;
        inputConcepts.push(vd.concept);
      } else if (vd.constant !== undefined) {
        inputs[vd.key] = vd.constant;
        assumed.push(vd.key);
      }
    }
    const result = d.formula.solve[d.unknownKey].fn(inputs);
    visiting.delete(c);
    if (!isFinite(result)) return undefined;
    steps.push({ formula: d.formula, unknownKey: d.unknownKey, concept: c, inputs, inputConcepts, result, assumedConstants: assumed });
    known.set(c, { concept: c, valueSI: result, source: 'derived' });
    return result;
  };
  for (const t of targets) build(t);
  const found = targets.filter((t) => known.has(t));
  const missing = targets.filter((t) => !known.has(t));
  return { steps, known, found, missing, issues };
}

/** Convert chain steps into rendered working steps. */
export function chainToSteps(res: ChainResult, sf = 4): { steps: Step[]; issues: Issue[] } {
  const out: Step[] = [];
  const issues: Issue[] = [];
  res.steps.forEach((cs, i) => {
    const title = cs.formula.identity ? `Step ${i + 1} — ${cs.formula.name}` : `Step ${i + 1} — ${cs.formula.name}`;
    const b = buildStep(cs.formula, cs.unknownKey, cs.inputs, title, sf);
    if (cs.assumedConstants.length) {
      const names = cs.assumedConstants.map((k) => {
        const vd = cs.formula.vars.find((x) => x.key === k)!;
        return `${vd.latex.replace(/\\/g, '')} = ${vd.constant}`;
      });
      b.step.note = [b.step.note, `assumed ${names.join(', ')}`].filter(Boolean).join('; ');
    }
    if (cs.formula.identity) {
      b.step.explanation = cs.formula.when;
      b.step.unitCheckLatex = undefined;
    }
    out.push(b.step);
    issues.push(...b.issues);
  });
  return { steps: out, issues };
}

/** Detect given data that contradicts a formula (e.g. σ, ε and E all given but E ≠ σ/ε). */
export function consistencyIssues(knownIn: Known[], opts: ChainOptions = {}): Issue[] {
  const given = new Map(knownIn.filter((k) => k.source === 'given').map((k) => [k.concept, k.valueSI]));
  const issues: Issue[] = [];
  for (const f of candidateFormulas(opts)) {
    if (f.identity) continue;
    if (!f.vars.every((vd) => given.has(vd.concept))) continue;
    const first = f.vars[0];
    const inputs: Record<string, number> = {};
    f.vars.forEach((vd) => (inputs[vd.key] = given.get(vd.concept)!));
    const calc = f.solve[first.key].fn(inputs);
    const actual = inputs[first.key];
    if (!isFinite(calc)) continue;
    const rel = Math.abs(calc - actual) / Math.max(Math.abs(actual), Math.abs(calc), 1e-300);
    if (rel > 0.02) {
      issues.push({ level: 'warning', message: `Inconsistent inputs: by ${f.name} (${f.equation.replace(/\\/g, '')}), ${first.name} should be ${calc.toPrecision(4)} (SI) but ${actual.toPrecision(4)} was given.` });
    }
  }
  return issues;
}
