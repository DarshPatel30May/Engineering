/**
 * Validation engine: unit/dimension compatibility of inputs, variable constraints
 * (positive masses and radii, v < c, efficiency ≤ 100 %, whole-number quantum numbers …)
 * and non-finite results.
 */
import type { Issue, VarDef } from './formulas/types';
import { getQuantity } from './quantities';
import { dimEq, dimToString, parseUnit, UnitParseError } from './units';

export interface ConvertedInput {
  valueSI: number;
  issues: Issue[];
}

/** Convert a raw value + unit to SI for a variable, with dimension checking. */
export function convertInput(vd: VarDef, value: number, unit: string, anyRef?: string): ConvertedInput {
  const issues: Issue[] = [];
  const kind = getQuantity(vd.quantity);
  if (!isFinite(value)) {
    issues.push({ level: 'error', message: `${vd.name} is not a valid number.` });
    return { valueSI: NaN, issues };
  }
  try {
    const pu = parseUnit(unit);
    if (kind.anyUnit) {
      // amounts are kept in the unit they were given in; related amounts are converted to that unit
      if (anyRef === undefined || anyRef === unit) return { valueSI: value, issues };
      const pr = parseUnit(anyRef);
      if (!dimEq(pr.dim, pu.dim)) {
        issues.push({ level: 'error', message: `${vd.name} is in "${unit || 'no unit'}" but a related amount is in "${anyRef || 'no unit'}" — the initial and remaining amounts must be the same kind of quantity (both masses, both activities, both numbers of nuclei …).` });
        return { valueSI: NaN, issues };
      }
      return { valueSI: (value * pu.factor) / pr.factor, issues };
    }
    if (kind.percent && unit === '') return { valueSI: value > 1 ? value / 100 : value, issues: value > 1 ? [{ level: 'info', message: `${vd.name}: ${value} read as ${value} %.` }] : [] };
    if (!dimEq(pu.dim, kind.dim)) {
      issues.push({
        level: 'error',
        message: `Incompatible unit for ${vd.name}: "${unit || 'no unit'}" has dimensions [${dimToString(pu.dim)}] but ${kind.name.toLowerCase()} needs [${dimToString(kind.dim)}] (e.g. ${kind.units.filter(Boolean).slice(0, 3).join(', ') || 'no unit'}).`,
      });
      return { valueSI: NaN, issues };
    }
    return { valueSI: value * pu.factor + (pu.offset ?? 0), issues };
  } catch (e) {
    issues.push({ level: 'error', message: e instanceof UnitParseError ? e.message : `Unknown unit "${unit}"` });
    return { valueSI: NaN, issues };
  }
}

const describe = (vd: VarDef) => `${vd.name} (${vd.latex.replace(/\\[a-z]+\{?|[{}\\]/g, '')})`;

export function fmtShort(x: number): string {
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e5 || a < 1e-3) return x.toExponential(3);
  return String(Number(x.toPrecision(4)));
}

/** Check an SI value against a variable's constraints. `computed` changes the wording. */
export function checkConstraints(vd: VarDef, x: number, computed = false): Issue[] {
  const issues: Issue[] = [];
  const who = describe(vd);
  const kind = getQuantity(vd.quantity);
  if (!isFinite(x)) {
    issues.push({
      level: 'error',
      message: computed
        ? `${who} has no real solution with these inputs (division by zero, square root of a negative number, logarithm of a non-positive number, or an inverse sine/cosine outside −1…1). Check the data.`
        : `${who} is not a valid number.`,
    });
    return issues;
  }
  const verb = computed ? 'came out as' : 'is';
  const shown = kind.angle ? `${fmtShort((x * 180) / Math.PI)}°` : fmtShort(x);
  if (vd.positive && !(x > 0)) {
    const extra = kind.id === 'temperature' ? ' — absolute temperature must be above 0 K.' : kind.id === 'mass' ? ' — mass must be positive.' : kind.id === 'wavelength' ? ' — wavelength must be positive.' : '.';
    issues.push({ level: 'error', message: `${who} ${verb} ${shown} but must be greater than zero${extra}` });
  } else if (vd.nonNegative && x < -1e-15) {
    issues.push({ level: 'error', message: `${who} ${verb} ${shown} but cannot be negative.` });
  } else if (vd.nonZero && x === 0) {
    issues.push({ level: 'error', message: `${who} cannot be zero (division by zero).` });
  }
  if (vd.min !== undefined && x < vd.min - 1e-12 * Math.max(1, Math.abs(vd.min))) {
    const lim = kind.angle ? `${fmtShort((vd.min * 180) / Math.PI)}°` : fmtShort(vd.min);
    issues.push({ level: 'error', message: `${who} ${verb} ${shown}, below the allowed minimum of ${lim}.` });
  }
  if (vd.max !== undefined && x > vd.max + 1e-12 * Math.max(1, Math.abs(vd.max))) {
    const lim = kind.angle ? `${fmtShort((vd.max * 180) / Math.PI)}°` : fmtShort(vd.max);
    issues.push({ level: 'error', message: `${who} ${verb} ${shown}, above the allowed maximum of ${lim}.` });
  }
  if (vd.below !== undefined && x >= vd.below) issues.push({ level: 'error', message: vd.belowText ?? `${who} must be less than ${fmtShort(vd.below)}.` });
  if (vd.integer && Math.abs(x - Math.round(x)) > 1e-6) issues.push({ level: computed ? 'warning' : 'error', message: computed ? `${who} came out as ${fmtShort(x)}, which is not a whole number — check the data.` : `${who} must be a whole number.` });
  if (vd.warnAbove !== undefined && x > vd.warnAbove) issues.push({ level: 'warning', message: vd.warnText ?? `${who} is unusually large.` });
  if (vd.warnBelow !== undefined && x < vd.warnBelow && x !== 0) issues.push({ level: 'warning', message: vd.warnText ?? `${who} is unusually small.` });
  return issues;
}
