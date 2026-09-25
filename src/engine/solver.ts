/**
 * Formula engine: solves any variable of any registered formula, producing full HSC
 * working (given, conversions, formula, rearrangement, substitution, unit check).
 */
import { checkDimensions } from './dimcheck';
import { fmtLatex, qtyLatex, unitLatex, countSigFigs } from './format';
import type { FormulaDef, Issue, VarDef } from './formulas/types';
import { getQuantity } from './quantities';
import { emptySolution, GivenItem, hasErrors, Solution, Step } from './solution';
import { checkConstraints, convertInput } from './validation';

export type TemplateMode = 'symbol' | 'value' | 'unit';

const PLACEHOLDER = /#([A-Za-z_][A-Za-z0-9_]*)/g;

/** Latex of a value in SI for substitution lines (angles shown in degrees). */
export function valueLatexSI(vd: VarDef, x: number, sf = 4): string {
  const k = getQuantity(vd.quantity);
  if (k.angle) return `${fmtLatex((x * 180) / Math.PI, sf)}^{\\circ}`;
  if (k.si === '' || k.id === 'decibel') return fmtLatex(x, sf) + (k.id === 'decibel' ? '\\ \\text{dB}' : '');
  return `${fmtLatex(x, sf)}\\ ${k.siLatex}`;
}

export function unitOnlyLatex(vd: VarDef): string {
  const k = getQuantity(vd.quantity);
  if (k.angle || k.si === '' || k.id === 'decibel') return '1';
  return k.siLatex;
}

/**
 * Render an expression template. In value/unit modes, juxtaposed factors get an explicit ×
 * and substituted values are bracketed where a power follows or the value is negative.
 */
export function renderTemplate(expr: string, f: FormulaDef, mode: TemplateMode, values: Record<string, number> = {}, sf = 4): string {
  let e = expr;
  if (mode !== 'symbol') {
    // explicit multiplication between adjacent factors
    for (let i = 0; i < 3; i++) {
      e = e.replace(/(#[A-Za-z_][A-Za-z0-9_]*|\d|\)|\})\s+(?=#|\\left\(|\(|\\(?:cos|sin|tan)\b)/g, '$1 \\times ');
    }
  }
  return e.replace(PLACEHOLDER, (_m, key: string, offset: number, whole: string) => {
    const vd = f.vars.find((v) => v.key === key);
    if (!vd) return key;
    const nextChar = whole[offset + key.length + 1];
    const followedByPow = nextChar === '^';
    if (mode === 'symbol') return followedByPow ? `{${vd.latex}}` : vd.latex;
    if (mode === 'unit') {
      const u = unitOnlyLatex(vd);
      return followedByPow ? `(${u})` : u;
    }
    const x = values[key];
    const s = valueLatexSI(vd, x, sf);
    const needsBracket = followedByPow || x < 0 || (s.includes('\\times') && /\\times|[+-]/.test(whole));
    return needsBracket ? `\\left(${s}\\right)` : s;
  });
}

/** Build a working step for solving `unknown` from the (SI) values of the other variables. */
export function buildStep(f: FormulaDef, unknown: string, values: Record<string, number>, title: string, sf = 4): { step: Step; result: number; issues: Issue[] } {
  const issues: Issue[] = [];
  const vd = f.vars.find((v) => v.key === unknown)!;
  const solver = f.solve[unknown];
  const result = solver.fn(values);
  issues.push(...checkConstraints(vd, result, true));
  const full = { ...values, [unknown]: result };
  if (isFinite(result) && f.checks) issues.push(...f.checks(full));

  const lhs = vd.latex;
  const isSubject = f.vars[0].key === unknown && !f.identity;
  const rearranged = `${lhs} = ${renderTemplate(solver.expr, f, 'symbol')}`;
  const substitution = `${lhs} = ${renderTemplate(solver.expr, f, 'value', values, sf)}`;
  const kind = getQuantity(vd.quantity);
  const resultLatex = `${lhs} = ${isFinite(result) ? valueLatexSI(vd, result, sf) : '\\text{undefined}'}`;

  let unitCheckLatex: string | undefined;
  let unitCheckOk: boolean | undefined;
  if (isFinite(result)) {
    const dc = checkDimensions(f, unknown, full);
    if (dc.ok !== null) {
      unitCheckOk = dc.ok;
      const unitsExpr = renderTemplate(solver.expr, f, 'unit');
      const target = kind.angle || kind.si === '' ? '\\text{(dimensionless)}' : kind.siLatex;
      unitCheckLatex = `${unitsExpr} \\;\\Rightarrow\\; ${target}\\ ${dc.ok ? '\\checkmark' : '\\times'}`;
      if (!dc.ok) issues.push({ level: 'error', message: `Dimensional check failed for ${f.name} — result does not have units of ${kind.si || 'a pure number'}.` });
    }
  }

  const step: Step = {
    title,
    formulaId: f.id,
    formulaName: f.name,
    formulaLatex: f.equation,
    rearrangedLatex: isSubject ? undefined : rearranged,
    substitutionLatex: substitution,
    resultLatex,
    unitCheckLatex,
    unitCheckOk,
    resultSI: result,
    quantity: vd.quantity,
    symbolLatex: vd.latex,
    name: vd.name,
    note: solver.note,
    explanation: f.when,
  };
  return { step, result, issues };
}

export interface RawInput {
  value: number;
  unit: string;
  raw?: string;
}

/** Given line in LaTeX with conversion to SI where needed. */
export function conversionLatex(vd: VarDef, value: number, unit: string, valueSI: number): string | null {
  const k = getQuantity(vd.quantity);
  if (k.angle) return null;
  if (k.percent && unit === '%') return `${vd.latex} = ${fmtLatex(value, 6)}\\% = ${fmtLatex(valueSI, 6)}`;
  const siUnit = k.si;
  if (!unit || unit === siUnit || unit === 'dB') return null;
  return `${vd.latex} = ${qtyLatex(value, unit, 6)} = ${fmtLatex(valueSI, 4)}\\ ${k.siLatex}`;
}

/** Solve one formula for one unknown with user inputs (any units). */
export function solveFormula(f: FormulaDef, unknown: string, inputs: Record<string, RawInput>, sf = 4): Solution {
  const sol = emptySolution(f.name);
  sol.topic = f.topic;
  sol.module = f.modules[0];
  const target = f.vars.find((v) => v.key === unknown);
  if (!target || !f.solve[unknown]) {
    sol.issues.push({ level: 'error', message: `This formula cannot be solved for ${unknown}.` });
    return sol;
  }
  sol.find.push({ symbolLatex: target.latex, name: target.name });
  const values: Record<string, number> = {};
  for (const vd of f.vars) {
    if (vd.key === unknown) continue;
    let inp = inputs[vd.key];
    let constant = false;
    if ((!inp || inp.raw === '' || !isFinite(inp.value)) && vd.constant !== undefined) {
      inp = { value: vd.constant, unit: getQuantity(vd.quantity).si, raw: String(vd.constant) };
      constant = true;
    }
    if (!inp || !isFinite(inp.value)) {
      sol.issues.push({ level: 'error', message: `Missing data: ${vd.name} (${vd.latex.replace(/\\/g, '')}) is required to find ${target.name}.` });
      continue;
    }
    const conv = convertInput(vd, inp.value, inp.unit);
    sol.issues.push(...conv.issues);
    if (conv.issues.some((i) => i.level === 'error')) continue;
    sol.issues.push(...checkConstraints(vd, conv.valueSI));
    values[vd.key] = conv.valueSI;
    const raw = inp.raw ?? String(inp.value);
    const uDisp = inp.unit === '°' ? '°' : inp.unit ? ` ${inp.unit}` : '';
    const g: GivenItem = { symbolLatex: vd.latex, name: vd.name, raw: `${raw}${uDisp}`, valueSI: conv.valueSI, quantity: vd.quantity, unit: inp.unit, sf: countSigFigs(raw), constant };
    sol.given.push(g);
    if (!constant) sol.inputSigFigs.push(countSigFigs(raw));
    const cl = conversionLatex(vd, inp.value, inp.unit, conv.valueSI);
    if (cl) sol.conversions.push(cl);
  }
  if (hasErrors(sol.issues)) return sol;
  const { step, result, issues } = buildStep(f, unknown, values, f.name, sf);
  sol.issues.push(...issues);
  sol.steps.push(step);
  if (!hasErrors(issues) && isFinite(result)) {
    sol.finals.push({ symbolLatex: target.latex, name: target.name, valueSI: result, quantity: target.quantity });
    sol.ok = true;
  }
  sol.explanation.push(f.when);
  return sol;
}

export { unitLatex };
