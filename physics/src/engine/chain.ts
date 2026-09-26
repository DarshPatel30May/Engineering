/**
 * Multi-step chain solver. Given known quantities (by concept) and target concepts, it
 * finds the cheapest derivation through the formula graph (applying formulas with exactly
 * one unknown), then rebuilds only the steps actually needed. Every step is computed by the
 * deterministic formula engine and fully documented.
 */
import { getConcept } from './concepts';
import { FORMULAS } from './formulas';
import type { FormulaDef, Issue, TopicId } from './formulas/types';
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
  inputs: Record<string, number>;
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
function identity(a: string, b: string, q: QuantityId, why: string, contextOnly?: TopicId[], unlessKnown?: string[]): FormulaDef {
  const ca = getConcept(a)!;
  const cb = getConcept(b)!;
  return {
    id: `id_${a}_${b}`,
    name: `${ca.name} = ${cb.name.toLowerCase()}`,
    module: 'm5',
    topic: contextOnly?.[0] ?? 'forces',
    equation: `${ca.latex} = ${cb.latex}`,
    vars: [v('A_', ca.latex, ca.name, q, { concept: a, signed: true }), v('B_', cb.latex, cb.name, q, { concept: b, signed: true })],
    solve: { A_: { expr: '#B_', fn: ({ B_ }) => B_ }, B_: { expr: '#A_', fn: ({ A_ }) => A_ } },
    aliases: [],
    when: why,
    sheet: 'derived',
    hsc: [],
    example: { B_: 1 },
    priority: -5,
    identity: true,
    contextOnly,
    unlessKnown,
  };
}

export const IDENTITIES: FormulaDef[] = [
  identity('t', 'tFlight', 'time', 'The time used for the horizontal motion is the time of flight (the same t applies to both components).', ['projectile']),
  identity('t', 'tDil', 'time', 'The time interval in the observer’s (e.g. Earth’s) frame is the dilated time.', ['relativity']),
  identity('K', 'Kmax', 'energyAtomic', 'The kinetic energy of the fastest photoelectrons is K_max.', ['photoelectric', 'quantum']),
  identity('K', 'Wk', 'energyAtomic', 'Starting from rest, all the work done by the field becomes kinetic energy (W = ΔK).', ['efields', 'particles', 'quantum']),
  identity('E', 'Enuc', 'energyNuclear', 'The energy produced is the energy released by the nuclear reaction.', ['nuclear', 'stars'], ['nReact']),
  identity('m', 'dm', 'mass', 'The mass converted into energy is the mass defect.', ['nuclear', 'stars']),
  identity('v', 'vRec', 'velocity', 'The speed is the galaxy’s recession velocity.', ['stars']),
  {
    id: 'id_sy_hDrop',
    name: 'Vertical displacement of a falling projectile',
    module: 'm5',
    topic: 'projectile',
    equation: 's_y = -h',
    vars: [v('sy', 's_y', 'Vertical displacement (up positive)', 'length', { concept: 'sy', signed: true }), v('h', 'h', 'Height fallen', 'length', { concept: 'hDrop', positive: true })],
    solve: { sy: { expr: '-#h', fn: ({ h }) => -h }, h: { expr: '-#sy', fn: ({ sy }) => -sy } },
    aliases: [],
    when: 'Taking up as positive, landing h below the launch point means s_y = −h.',
    sheet: 'derived',
    hsc: [],
    example: { h: 10 },
    priority: -3,
    identity: true,
    contextOnly: ['projectile'],
  },
];

export interface ChainOptions {
  topics?: TopicId[];
  exclude?: string[];
  /** unit in which "any unit" amounts (decay) were given — used for display */
  anyRef?: string;
}

function inContext(f: FormulaDef, topics: TopicId[]): boolean {
  return f.topic !== undefined && (topics.includes(f.topic) || !!f.alsoIn?.some((t) => topics.includes(t)));
}

function candidateFormulas(opts: ChainOptions): FormulaDef[] {
  const topics = opts.topics ?? [];
  return [...FORMULAS, ...IDENTITIES].filter((f) => {
    if (opts.exclude?.includes(f.id)) return false;
    if (f.manualOnly) return false;
    if (f.sheet === 'extension' && !(f.contextOnly && f.contextOnly.some((t) => topics.includes(t)))) return false;
    if (f.contextOnly && !f.contextOnly.some((t) => topics.includes(t))) return false;
    return true;
  });
}

/**
 * Run the chain solver: a shortest-derivation search (Bellman–Ford style relaxation), so
 * the chain with the fewest, most standard steps is chosen rather than an arbitrary path.
 */
export function solveChain(knownIn: Known[], targets: string[], opts: ChainOptions = {}): ChainResult {
  const given = new Map<string, Known>();
  for (const k of knownIn) given.set(k.concept, k);
  const issues: Issue[] = [];
  const formulas = candidateFormulas(opts);
  const topics = opts.topics ?? [];

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
  const constantAllowed = (vd: FormulaDef['vars'][number]) => vd.constant !== undefined && !vd.constantUnless?.some((c) => given.has(c));

  const baseCost = (f: FormulaDef) => {
    let b = f.chainCost ?? (f.identity ? 1.3 : 1 - (f.priority ?? 0) * 0.02);
    if (topics.length && !inContext(f, topics)) b += 0.6;
    return b;
  };

  for (let round = 0; round < 40; round++) {
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
            if (f.identity && best.get(vd.concept)?.formula.identity) {
              ok = false;
              break;
            }
            inputs[vd.key] = val;
            cost += costOf(vd.concept);
            inputConcepts.push(vd.concept);
          } else if (constantAllowed(vd)) {
            inputs[vd.key] = vd.constant!;
          } else {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        // never "derive" a universal constant (G, h, c …) unless it is the thing asked for
        if (target.constant !== undefined && !target.constantUnless && !targets.includes(target.concept)) continue;
        if (target.constant !== undefined && target.constantUnless && !target.constantUnless.some((c) => given.has(c)) && !targets.includes(target.concept)) continue;
        if (cost >= costOf(target.concept) - 1e-9) continue;
        let value: number;
        try {
          value = f.solve[target.key].fn(inputs);
        } catch {
          continue;
        }
        if (!isFinite(value)) continue;
        if ((target.positive && value <= 0) || (target.nonNegative && value < 0)) continue;
        if (target.min !== undefined && value < target.min - 1e-9) continue;
        if (target.max !== undefined && value > target.max + 1e-9 * Math.max(1, Math.abs(target.max))) continue;
        if (target.below !== undefined && value >= target.below) continue;
        best.set(target.concept, { cost, formula: f, unknownKey: target.key, inputConcepts, value });
        changed = true;
      }
    }
    if (!changed) break;
  }

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
export function chainToSteps(res: ChainResult, sf = 4, anyRef?: string): { steps: Step[]; issues: Issue[] } {
  const out: Step[] = [];
  const issues: Issue[] = [];
  res.steps.forEach((cs, i) => {
    const b = buildStep(cs.formula, cs.unknownKey, cs.inputs, `Step ${i + 1} — ${cs.formula.name}`, sf, anyRef);
    if (cs.assumedConstants.length) {
      const names = cs.assumedConstants.map((k) => {
        const vd = cs.formula.vars.find((x) => x.key === k)!;
        return `${vd.latex.replace(/\\/g, '')} from the ${vd.constantSource ?? 'data sheet'}`;
      });
      b.step.note = [b.step.note, `used ${names.join(', ')}`].filter(Boolean).join('; ');
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

/** Which targets are reachable in principle, and which concepts would unlock a missing target. */
export function missingInputsFor(target: string, knownConcepts: Set<string>, opts: ChainOptions = {}): { formula: FormulaDef; missing: string[] }[] {
  const out: { formula: FormulaDef; missing: string[] }[] = [];
  for (const f of candidateFormulas(opts)) {
    if (f.identity) continue;
    const tv = f.vars.find((x) => x.concept === target);
    if (!tv || !f.solve[tv.key]) continue;
    const missing = f.vars.filter((x) => x !== tv && x.constant === undefined && !knownConcepts.has(x.concept)).map((x) => x.concept);
    out.push({ formula: f, missing });
  }
  return out.sort((a, b) => a.missing.length - b.missing.length || (b.formula.priority ?? 0) - (a.formula.priority ?? 0)).slice(0, 4);
}

/** Detect given data that contradicts a formula (e.g. n, c and v all given but n ≠ c/v). */
export function consistencyIssues(knownIn: Known[], opts: ChainOptions = {}): Issue[] {
  const given = new Map(knownIn.filter((k) => k.source === 'given').map((k) => [k.concept, k.valueSI]));
  const issues: Issue[] = [];
  for (const f of candidateFormulas(opts)) {
    if (f.identity) continue;
    if (!f.vars.every((vd) => given.has(vd.concept))) continue;
    const first = f.vars[0];
    if (!f.solve[first.key]) continue;
    const inputs: Record<string, number> = {};
    f.vars.forEach((vd) => (inputs[vd.key] = given.get(vd.concept)!));
    const calc = f.solve[first.key].fn(inputs);
    const actual = inputs[first.key];
    if (!isFinite(calc)) continue;
    const rel = Math.abs(calc - actual) / Math.max(Math.abs(actual), Math.abs(calc), 1e-300);
    if (rel > 0.03) {
      issues.push({ level: 'warning', message: `Given data are inconsistent with ${f.name}: ${first.name} would be ${calc.toPrecision(3)} (SI) but ${actual.toPrecision(3)} was given.` });
    }
  }
  return issues;
}
