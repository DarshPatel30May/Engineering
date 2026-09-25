/**
 * Validation engine: unit/dimension compatibility of inputs, variable constraints
 * (positive areas, valid modulus, efficiency ≤ 100 %, …), and non-finite results.
 */
import type { Issue, VarDef } from './formulas/types';
import { getQuantity } from './quantities';
import { dimEq, dimToString, parseUnit, UnitParseError } from './units';

export interface ConvertedInput {
  valueSI: number;
  issues: Issue[];
}

/** Convert a raw value+unit to SI for a given variable, with dimension checking. */
export function convertInput(vd: VarDef, value: number, unit: string): ConvertedInput {
  const issues: Issue[] = [];
  const kind = getQuantity(vd.quantity);
  if (!isFinite(value)) {
    issues.push({ level: 'error', message: `${vd.name} (${vd.latex}) is not a valid number.` });
    return { valueSI: NaN, issues };
  }
  let factor = 1;
  if (unit === 'dB') factor = 1;
  else {
    try {
      const pu = parseUnit(unit);
      if (!dimEq(pu.dim, kind.dim)) {
        issues.push({
          level: 'error',
          message: `Incompatible unit for ${vd.name}: "${unit || 'no unit'}" has dimensions [${dimToString(pu.dim)}] but ${kind.name.toLowerCase()} needs [${dimToString(kind.dim)}] (e.g. ${kind.units.filter(Boolean).slice(0, 3).join(', ') || 'no unit'}).`,
        });
        return { valueSI: NaN, issues };
      }
      factor = pu.factor;
    } catch (e) {
      issues.push({ level: 'error', message: e instanceof UnitParseError ? e.message : `Unknown unit "${unit}"` });
      return { valueSI: NaN, issues };
    }
  }
  return { valueSI: value * factor, issues };
}

const describe = (vd: VarDef) => `${vd.name} (${vd.latex.replace(/\\/g, '')})`;

/** Check a (SI) value against a variable's constraints. `computed` changes the wording. */
export function checkConstraints(vd: VarDef, x: number, computed = false): Issue[] {
  const issues: Issue[] = [];
  const who = describe(vd);
  if (!isFinite(x)) {
    issues.push({
      level: 'error',
      message: computed
        ? `${who} has no real solution with these inputs (e.g. division by zero, square root of a negative number, or an inverse sine/cosine outside −1…1). Check the data for inconsistency.`
        : `${who} is not a valid number.`,
    });
    return issues;
  }
  const verb = computed ? 'came out as' : 'is';
  if (vd.positive && !(x > 0)) {
    const kind = getQuantity(vd.quantity);
    const extra = kind.id === 'area' ? ' — an area must be positive (impossible area).' : kind.id === 'modulus' ? ' — Young’s modulus must be positive (invalid modulus).' : '.';
    issues.push({ level: 'error', message: `${who} ${verb} ${fmtShort(x)} but must be greater than zero${extra}` });
  } else if (vd.nonNegative && x < 0) {
    issues.push({ level: 'error', message: `${who} ${verb} ${fmtShort(x)} but cannot be negative.` });
  } else if (vd.nonZero && x === 0) {
    issues.push({ level: 'error', message: `${who} cannot be zero (division by zero).` });
  }
  if (vd.min !== undefined && x < vd.min - 1e-12) issues.push({ level: 'error', message: `${who} ${verb} ${fmtShort(x)}, below the physical minimum of ${fmtShort(vd.min)}.` });
  if (vd.max !== undefined && x > vd.max + 1e-12) issues.push({ level: 'error', message: `${who} ${verb} ${fmtShort(x)}, above the physical maximum of ${fmtShort(vd.max)}.` });
  if (vd.integer && Math.abs(x - Math.round(x)) > 1e-9 && !computed) issues.push({ level: 'warning', message: `${who} is normally a whole number.` });
  if (vd.warnAbove !== undefined && x > vd.warnAbove + 1e-12) issues.push({ level: 'warning', message: vd.warnText ?? `${who} is unusually large.` });
  if (vd.warnBelow !== undefined && x < vd.warnBelow - 1e-12 && x !== 0) issues.push({ level: 'warning', message: vd.warnText ?? `${who} is unusually small.` });
  return issues;
}

function fmtShort(x: number): string {
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e5 || a < 1e-3) return x.toExponential(3);
  return String(Number(x.toPrecision(4)));
}
