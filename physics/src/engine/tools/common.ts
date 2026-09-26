/** Helpers shared by the multi-step tools. */
import { fmtLatex, qtyLatex } from '../format';
import type { Issue } from '../formulas/types';
import { getQuantity } from '../quantities';
import { emptySolution, FinalAnswer, Solution, Step } from '../solution';
import { fromSIValue, parseUnit, toSIValue } from '../units';

export const DEG = Math.PI / 180;

/** A value with unit as the student typed it. */
export interface Qty {
  value: number;
  unit: string;
  raw?: string;
}

export const q = (value: number, unit = '', raw?: string): Qty => ({ value, unit, raw });

/** Convert an input to SI, throwing a readable error for a bad unit. */
export function si(x: Qty | undefined, kind: string, name: string, issues: Issue[]): number | undefined {
  if (!x || !isFinite(x.value)) return undefined;
  try {
    const pu = parseUnit(x.unit);
    const k = getQuantity(kind);
    if (!k.anyUnit && pu.dim.some((d, i) => Math.abs(d - k.dim[i]) > 1e-9)) {
      issues.push({ level: 'error', message: `${name}: "${x.unit || 'no unit'}" is not a unit of ${k.name.toLowerCase()}.` });
      return undefined;
    }
    return toSIValue(x.value, x.unit);
  } catch (e) {
    issues.push({ level: 'error', message: `${name}: ${(e as Error).message}` });
    return undefined;
  }
}

/** LaTeX for an SI value in its quantity kind's SI unit. */
export function L(x: number, kind: string, sf = 4): string {
  const k = getQuantity(kind);
  if (k.angle) return `${fmtLatex(x / DEG, sf)}^{\\circ}`;
  if (!k.si) return fmtLatex(x, sf);
  return `${fmtLatex(x, sf)}\\ ${k.siLatex}`;
}

/** LaTeX for a value shown in a specific unit. */
export function LU(xSI: number, unit: string, sf = 4): string {
  return qtyLatex(fromSIValue(xSI, unit), unit, sf);
}

export function B(s: string): string {
  return `\\left(${s}\\right)`;
}

/** Build a working step from explicit LaTeX pieces. */
export function mkStep(title: string, formulaLatex: string, opts: Partial<Step> & { lines?: string[] } = {}): Step {
  const { lines, ...rest } = opts;
  return { title, formulaLatex, resultLatex: rest.resultLatex ?? '', workingLatex: lines, ...rest };
}

export function newSolution(title: string, module: Solution['module'], topic: Solution['topic']): Solution {
  const s = emptySolution(title);
  s.module = module;
  s.topic = topic;
  return s;
}

export function given(sol: Solution, symbolLatex: string, name: string, raw: string, valueSI: number, quantity: string, unit = '', constant = false, source?: string) {
  sol.given.push({ symbolLatex, name, raw, valueSI, quantity, unit, constant, source });
}

export function final(sol: Solution, f: FinalAnswer) {
  sol.finals.push(f);
}

export function sigFigsOf(raw?: string): number | undefined {
  if (!raw) return undefined;
  const s = raw.replace(/[,\s]/g, '').replace(/^[-+]/, '').replace(/[eE×x].*$/, '');
  if (!/\d/.test(s)) return undefined;
  if (s.includes('.')) return Math.max(1, s.replace('.', '').replace(/^0+/, '').length);
  const t = s.replace(/^0+/, '');
  return Math.max(1, t.length);
}

export function trackSF(sol: Solution, ...xs: (Qty | undefined)[]) {
  for (const x of xs) {
    if (!x) continue;
    const n = sigFigsOf(x.raw ?? String(x.value));
    if (n) sol.inputSigFigs.push(n);
  }
}

export function rawOf(x: Qty): string {
  const r = x.raw ?? String(x.value);
  if (!x.unit) return r;
  return x.unit === '°' ? `${r}°` : `${r} ${x.unit}`;
}

export function err(sol: Solution, message: string): Solution {
  sol.issues.push({ level: 'error', message });
  sol.ok = false;
  return sol;
}
